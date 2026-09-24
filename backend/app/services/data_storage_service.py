"""Dedicated service for shared sensor data storage and processing logic."""

import math
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.models import Sensor, SensorReading, Unit, db
from app.utils.secure_logger import SecureLogger

logger = SecureLogger.get_secure_logger(__name__)


class DataStorageService:
    """Service for handling sensor data storage and processing logic."""

    def __init__(self, app=None):
        """Initialize data storage service.

        Args:
            app: Flask application instance

        """
        self._app = app

        if app:
            self.init_app(app)

    def init_app(self, app):
        """Initialize with Flask app."""
        self._app = app

    def store_sensor_data(self, data: dict[str, Any]) -> bool:
        """Store parsed sensor data in the database.

        Args:
            data: Parsed sensor data containing unit_id, sensor_type, value, timestamp, quality

        Returns:
            True if storage was successful, False otherwise

        """
        try:
            # Validate required fields
            required_fields = ["unit_id", "sensor_type", "value", "timestamp"]
            missing_fields = [
                field
                for field in required_fields
                if field not in data or data[field] is None
            ]

            if missing_fields:
                logger.error(
                    f"Missing required sensor data fields: {missing_fields}. Data: {data}",
                )
                return False

            # Validate data types and convert to float
            if not isinstance(data["value"], (int, float)):
                try:
                    data["value"] = float(data["value"])
                except (ValueError, TypeError):
                    logger.error(
                        f"Invalid sensor value - cannot convert to number: {data['value']}",
                    )
                    return False

            # Validate numeric value is finite (reject NaN/Inf)
            if not math.isfinite(data["value"]):
                logger.error(
                    f"Invalid sensor value - non-finite number not allowed: {data['value']}",
                )
                return False

            # Validate and sanitize unit_id and sensor_type strings
            if not isinstance(data["unit_id"], str):
                logger.error(
                    f"Invalid unit_id - must be string: {type(data['unit_id'])} {data['unit_id']}",
                )
                return False

            if not isinstance(data["sensor_type"], str):
                logger.error(
                    f"Invalid sensor_type - must be string: {type(data['sensor_type'])} {data['sensor_type']}",
                )
                return False

            # Sanitize strings: strip whitespace and update dict
            sanitized_unit_id = data["unit_id"].strip()
            sanitized_sensor_type = data["sensor_type"].strip()

            if not sanitized_unit_id:
                logger.error(
                    f"Invalid unit_id - must be non-empty string after stripping: '{data['unit_id']}'",
                )
                return False

            if not sanitized_sensor_type:
                logger.error(
                    f"Invalid sensor_type - must be non-empty string after stripping: '{data['sensor_type']}'",
                )
                return False

            # Update dict with sanitized values
            data["unit_id"] = sanitized_unit_id
            data["sensor_type"] = sanitized_sensor_type

            # Validate timestamp type/format
            if not isinstance(data["timestamp"], (datetime, str)):
                logger.error(
                    f"Invalid timestamp - must be datetime or ISO string: {type(data['timestamp'])} {data['timestamp']}",
                )
                return False

            timestamp = data["timestamp"]
            if isinstance(timestamp, str):
                try:
                    timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                except ValueError:
                    logger.error("Invalid sensor timestamp format")
                    return False
            data["timestamp"] = (
                timestamp.replace(tzinfo=timezone.utc)
                if timestamp.tzinfo is None
                else timestamp.astimezone(timezone.utc)
            )

            # Set default quality if not provided
            if "quality" not in data or not data["quality"]:
                data["quality"] = "GOOD"
                logger.debug(
                    f"Setting default quality 'GOOD' for sensor data: {data['unit_id']}/{data['sensor_type']}",
                )

            # Find or create sensor
            sensor = self.find_or_create_sensor(
                unit_id=data["unit_id"],  # Already sanitized above
                sensor_type=data["sensor_type"],  # Already sanitized above
            )

            if not sensor:
                logger.error(
                    f"Could not create sensor for unit {data['unit_id']}, type {data['sensor_type']}",
                )
                return False

            # Create sensor reading
            reading = SensorReading(
                sensor_id=sensor.id,
                timestamp=data["timestamp"],
                value=data["value"],
                quality=data["quality"],
            )

            db.session.add(reading)
            self._update_current_reading(sensor, reading)
            db.session.commit()

            logger.debug(
                f"Stored sensor reading: {data['unit_id']}/{data['sensor_type']} = {data['value']}",
            )
            return True

        except IntegrityError:
            db.session.rollback()
            logger.exception("Database integrity error storing sensor data")
            return False
        except Exception:
            db.session.rollback()
            logger.exception("Error storing sensor data")
            return False

    def _update_current_reading(self, sensor, reading):
        """Update the API snapshot from good, newest measurements in known units."""
        if reading.quality != "GOOD":
            return
        latest = (
            SensorReading.query.filter_by(sensor_id=sensor.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )

        def as_utc(value):
            return (
                value.replace(tzinfo=timezone.utc)
                if value.tzinfo is None
                else value.astimezone(timezone.utc)
            )

        if latest and as_utc(latest.timestamp) > as_utc(reading.timestamp):
            return
        mapping = {
            "useful_heat_kw": ("useful_heat_kw", {"kw": 1, "w": 0.001}),
            "useful_chill_kw": ("useful_chill_kw", {"kw": 1, "w": 0.001}),
            "water_flow": ("water_rate_lph", {"l/h": 1, "l/min": 60}),
            "differential_pressure_bar": (
                "differential_pressure_bar",
                {"bar": 1, "kpa": 0.01},
            ),
            "temp_out_hot": ("temp_out_hot", {"°c": 1}),
            "battery_voltage": ("battery_voltage", {"v": 1}),
            "flow_rate_inlet": ("flow_rate_inlet", {"l/min": 1}),
            "flow_rate_out_chill": ("flow_rate_out_chill", {"l/min": 1}),
            "flow_rate_out_hot": ("flow_rate_out_hot", {"l/min": 1}),
            "power": ("current_power", {"kw": 1, "w": 0.001}),
            "current_power": ("current_power", {"kw": 1, "w": 0.001}),
            "parasitic_load": ("parasitic_load", {"kw": 1, "w": 0.001}),
            "user_load": ("user_load", {"kw": 1, "w": 0.001}),
            "temperature": ("temp_in", {"°c": 1}),
            "temp_in": ("temp_in", {"°c": 1}),
            "temp_out": ("temp_out", {"°c": 1}),
            "temp_outside": ("temp_outside", {"°c": 1}),
            "humidity": ("humidity", {"%": 1}),
            "pressure": ("pressure", {"hpa": 1, "bar": 1000, "kpa": 10, "pa": 0.01}),
            "water_level": ("water_level", {"l": 1}),
            "battery_level": ("battery_level", {"%": 1}),
        }
        column, scales = mapping.get(sensor.sensor_type, (None, {}))
        scale = scales.get((sensor.unit_of_measurement or "").lower())
        if column and scale is not None:
            unit = db.session.get(Unit, sensor.unit_id)
            setattr(unit, column, reading.value * scale)
            unit.updated_at = reading.timestamp

    def find_or_create_sensor(self, unit_id: str, sensor_type: str) -> Sensor | None:
        """Find existing sensor or create new one with race condition handling.

        Args:
            unit_id: Unit identifier
            sensor_type: Type of sensor

        Returns:
            Sensor instance or None if unit not found

        """
        # Check if unit exists first
        unit = Unit.query.filter_by(id=unit_id).first()
        if not unit:
            logger.warning(f"Unit {unit_id} not found, skipping sensor data")
            return None

        # Try to find existing sensor first
        sensor = Sensor.query.filter_by(
            unit_id=unit_id,
            sensor_type=sensor_type,
        ).first()

        if sensor:
            logger.debug(f"Found existing sensor: {unit_id}/{sensor_type}")
            return sensor

        # Sensor doesn't exist, try to create it with race condition handling
        try:
            # Create new sensor
            sensor_name = f"{sensor_type.title()} Sensor"
            unit_mapping = {
                "temperature": "°C",
                "pressure": "bar",
                "flow_rate": "L/min",
                "power": "kW",
                "current_power": "kW",
                "useful_heat_kw": "kW",
                "useful_chill_kw": "kW",
                "water_flow": "L/h",
                "differential_pressure_bar": "bar",
                "temp_out_hot": "°C",
                "battery_voltage": "V",
                "flow_rate_inlet": "L/min",
                "flow_rate_out_chill": "L/min",
                "flow_rate_out_hot": "L/min",
                "parasitic_load": "kW",
                "user_load": "kW",
                "export_power": "kW",
                "water_flow": "L/h",
                "temp_in": "°C",
                "temp_out": "°C",
                "temp_outside": "°C",
                "humidity": "%",
                "water_level": "L",
                "battery_level": "%",
                "status": "status",
            }

            sensor = Sensor(
                unit_id=unit_id,
                name=sensor_name,
                sensor_type=sensor_type,
                unit_of_measurement=unit_mapping.get(sensor_type, ""),
                is_active=True,
            )

            db.session.add(sensor)
            db.session.commit()

            logger.info(f"Created new sensor: {unit_id}/{sensor_type}")
            return sensor

        except IntegrityError as e:
            # Handle race condition - another process may have created the sensor
            db.session.rollback()
            logger.info(
                f"IntegrityError creating sensor {unit_id}/{sensor_type}, likely race condition - trying fallback query",
            )

            # Try to find the sensor again (fallback query)
            sensor = Sensor.query.filter_by(
                unit_id=unit_id,
                sensor_type=sensor_type,
            ).first()

            if sensor:
                logger.info(
                    f"Race condition resolved - found sensor created by another process: {unit_id}/{sensor_type}",
                )
                return sensor
            logger.error(
                f"Failed to find sensor after IntegrityError - database constraint issue: {e}",
            )
            return None

        except Exception as e:
            db.session.rollback()
            logger.exception(
                f"Unexpected error finding/creating sensor {unit_id}/{sensor_type}: {e}",
            )
            return None

    def get_status(self) -> dict[str, Any]:
        """Get data storage service status.

        Returns:
            Status dictionary

        """
        return {"service": "active", "app_context": self._app is not None}


# Global data storage service instance
data_storage_service = DataStorageService()
