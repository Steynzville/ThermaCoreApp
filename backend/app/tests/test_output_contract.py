from datetime import datetime, timedelta, timezone
from app import db
from app.models import Unit, Sensor, SensorReading
from app.services.unit_outputs import output_states


def test_outputs_use_each_channels_latest_quality_and_timestamp(app):
    with app.app_context():
        unit = Unit(
            id="OUTPUT-TEST",
            name="Output test",
            serial_number="OUTPUT-TEST",
            status="online",
            supports_heat=True,
        )
        db.session.add(unit)
        db.session.flush()
        now = datetime.now(timezone.utc)
        for name, value, age, quality, units in [
            ("current_power", 3000, 0, "GOOD", "W"),
            ("useful_heat_kw", 8, 3600, "GOOD", "kW"),
            ("useful_chill_kw", 4, 0, "BAD", "kW"),
            ("water_flow", 0, 0, "GOOD", "L/h"),
        ]:
            sensor = Sensor(
                unit_id=unit.id,
                name=name,
                sensor_type=name,
                unit_of_measurement=units,
                is_active=True,
            )
            db.session.add(sensor)
            db.session.flush()
            db.session.add(
                SensorReading(
                    sensor_id=sensor.id,
                    value=value,
                    quality=quality,
                    timestamp=now - timedelta(seconds=age),
                )
            )
        db.session.commit()
        result = output_states(unit, now)
        assert result["power"]["value"] == 3
        assert result["power"]["active"]
        assert result["heat"]["capable"] and result["heat"]["stale"]
        assert not any(result[key]["active"] for key in ("heat", "chill", "water"))
        unit.status = "offline"
        assert not output_states(unit, now)["power"]["active"]
