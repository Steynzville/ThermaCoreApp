"""Bounded daily machine history available to ordinary unit readers, not premium-only."""

from sqlalchemy import func
from app import db
from app.models import Sensor, SensorReading

METRICS = {
    "temp_outside": ("ambientTemp", {"°c": 1}),
    "humidity": ("ambientHumidity", {"%": 1}),
    "temp_in": ("tempIn", {"°c": 1}),
    "temp_out": ("tempOutChill", {"°c": 1}),
    "temp_out_hot": ("tempOutHot", {"°c": 1}),
    "current_power": ("power", {"kw": 1, "w": 0.001}),
    "power": ("power", {"kw": 1, "w": 0.001}),
    "water_level": ("awgWaterLevel", {"l": 1}),
    "differential_pressure_bar": ("differentialPressure", {"bar": 1, "kpa": 0.01}),
    "battery_voltage": ("batteryVoltage", {"v": 1}),
    "flow_rate_out_chill": ("flowRateOutChill", {"l/min": 1}),
    "flow_rate_out_hot": ("flowRateOutHot", {"l/min": 1}),
    "useful_heat_kw": ("usefulHeat", {"kw": 1, "w": 0.001}),
    "useful_chill_kw": ("usefulChill", {"kw": 1, "w": 0.001}),
    "water_flow": ("waterRate", {"l/h": 1, "l/min": 60, "m3/h": 1000}),
}


def daily_history(unit_id, start, end, resolution="day"):
    if resolution not in {"day", "hour", "minute"}:
        raise ValueError("Unsupported history resolution")
    rows, seen = {}, set()
    sensors = Sensor.query.filter_by(unit_id=unit_id).order_by(Sensor.id).all()
    # One canonical sensor per metric prevents double-counting duplicate meter aliases.
    for sensor in sensors:
        metric = METRICS.get(sensor.sensor_type)
        if not metric:
            continue
        key, scales = metric
        scale = scales.get((sensor.unit_of_measurement or "").lower().replace(" ", ""))
        if key in seen or scale is None:
            continue
        seen.add(key)
        if resolution == "day":
            day = func.date(SensorReading.timestamp)
        elif db.engine.dialect.name == "sqlite":
            pattern = "%Y-%m-%dT%H:00:00" if resolution == "hour" else "%Y-%m-%dT%H:%M:00"
            day = func.strftime(pattern, SensorReading.timestamp)
        else:
            day = func.date_trunc(resolution, SensorReading.timestamp)
        data = (
            db.session.query(
                day, func.avg(SensorReading.value), func.count(SensorReading.id)
            )
            .filter(
                SensorReading.sensor_id == sensor.id,
                SensorReading.timestamp >= start,
                SensorReading.timestamp < end,
                SensorReading.quality == "GOOD",
            )
            .group_by(day)
            .order_by(day)
            .all()
        )
        for date, value, count in data:
            if resolution != "day":
                date = (date.isoformat() if hasattr(date, "isoformat") else str(date)).replace(" ", "T").removesuffix("+00:00") + "Z"
            row = rows.setdefault(
                str(date),
                {"date": str(date), "unitId": unit_id, "source": "live", "samples": {}},
            )
            row[key] = value * scale
            row["samples"][key] = count
    return sorted(rows.values(), key=lambda row: row["date"])
