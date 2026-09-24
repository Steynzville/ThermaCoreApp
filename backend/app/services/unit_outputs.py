"""Useful output contract; each channel carries its own measurement quality/age."""

import math
from datetime import datetime, timezone
from app.models import Sensor, SensorReading

CONTRACT = {
    "power": (("current_power", "power"), None, "kW", {"kw": 1, "w": 0.001}),
    "heat": (("useful_heat_kw",), "supports_heat", "kWth", {"kw": 1, "w": 0.001}),
    "chill": (("useful_chill_kw",), "supports_chill", "kWth", {"kw": 1, "w": 0.001}),
    "water": (
        ("water_flow",),
        "supports_water",
        "L/h",
        {"l/h": 1, "l/min": 60, "m3/h": 1000},
    ),
}


def output_states(unit, now=None):
    now = now or datetime.now(timezone.utc)
    online = getattr(unit.status, "value", unit.status) == "online"
    result = {}
    for key, (channels, capability, units, scales) in CONTRACT.items():
        row = (
            SensorReading.query.join(Sensor)
            .filter(
                Sensor.unit_id == unit.id,
                Sensor.is_active.is_(True),
                Sensor.sensor_type.in_(channels),
            )
            .order_by(SensorReading.timestamp.desc(), SensorReading.id.desc())
            .first()
        )
        capable = (
            capability is None
            or bool(getattr(unit, capability, False))
            or row is not None
        )
        value, measured, quality, stale = None, None, "UNKNOWN", True
        if row:
            scale = scales.get(
                (row.sensor.unit_of_measurement or "").lower().replace(" ", "")
            )
            time = (
                row.timestamp.replace(tzinfo=timezone.utc)
                if row.timestamp.tzinfo is None
                else row.timestamp
            )
            measured, quality = time.isoformat(), row.quality
            stale = not 0 <= (now - time).total_seconds() <= 900
            if scale is not None and math.isfinite(row.value):
                value = row.value * scale
            else:
                quality = "BAD"
        result[key] = {
            "capable": capable,
            "value": value,
            "unit": units,
            "measuredAt": measured,
            "quality": quality,
            "stale": stale,
            "active": online
            and capable
            and value is not None
            and value > 0
            and quality == "GOOD"
            and not stale,
        }
    return result
