"""Integrate measured rates into UTC daily totals, without filling telemetry gaps."""

import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from app.models import Sensor, SensorReading

# These channel names/units are the ingestion contract. Unknown channels are not
# treated as energy, and a second meter on the same channel is not double counted.
CHANNELS = {
    "useful_heat_kw": ("heatKWh", {"kw": 1, "w": 0.001}),
    "useful_chill_kw": ("chillKWh", {"kw": 1, "w": 0.001}),
    "current_power": ("grossKWh", {"kw": 1, "w": 0.001}),
    "power": ("grossKWh", {"kw": 1, "w": 0.001}),
    "parasitic_load": ("parasiticKWh", {"kw": 1, "w": 0.001}),
    "user_load": ("selfConsumedKWh", {"kw": 1, "w": 0.001}),
    "export_power": ("exportedKWh", {"kw": 1, "w": 0.001}),
    "water_flow": ("waterLitres", {"l/h": 1, "l/min": 60, "m3/h": 1000}),
}


def utc(value):
    return (
        value.replace(tzinfo=timezone.utc)
        if value.tzinfo is None
        else value.astimezone(timezone.utc)
    )


def integrate_history(sensors, readings, start, end, max_gap_seconds=900):
    """Trapezoidal integration; split intervals at midnight and ignore bad/gap pairs.

    A missing channel stays null. Financial calculations require metered self-use
    and export; current power is never extrapolated into past periods.
    """
    groups = defaultdict(list)
    for reading in readings:
        groups[reading.sensor_id].append(reading)
    rows, selected_channels = {}, set()
    intervals = defaultdict(lambda: defaultdict(list))
    for sensor in sorted(sensors, key=lambda s: s.id):
        contract = CHANNELS.get(sensor.sensor_type.lower())
        if not contract:
            continue
        channel, scales = contract
        scale = scales.get((sensor.unit_of_measurement or "").lower().replace(" ", ""))
        identity = (sensor.unit_id, channel)
        if scale is None or identity in selected_channels:
            continue
        selected_channels.add(identity)
        series = sorted(groups[sensor.id], key=lambda r: utc(r.timestamp))
        for first, last in zip(series, series[1:]):
            t0, t1 = utc(first.timestamp), utc(last.timestamp)
            seconds = (t1 - t0).total_seconds()
            if seconds <= 0 or seconds > max_gap_seconds:
                continue
            if any(
                str(r.quality).upper() != "GOOD"
                or not math.isfinite(r.value)
                or r.value < 0
                for r in (first, last)
            ):
                continue
            left, right = max(start, t0), min(end, t1)
            while left < right:
                midnight = datetime.combine(
                    left.date() + timedelta(days=1),
                    datetime.min.time(),
                    tzinfo=timezone.utc,
                )
                stop = min(right, midnight)
                a = (
                    first.value
                    + (last.value - first.value) * (left - t0).total_seconds() / seconds
                )
                b = (
                    first.value
                    + (last.value - first.value) * (stop - t0).total_seconds() / seconds
                )
                hours = (stop - left).total_seconds() / 3600
                key = (sensor.unit_id, left.date().isoformat())
                row = rows.setdefault(
                    key,
                    {
                        "unitId": sensor.unit_id,
                        "date": key[1],
                        "source": "live",
                        "grossKWh": None,
                        "parasiticKWh": None,
                        "selfConsumedKWh": None,
                        "exportedKWh": None,
                        "waterLitres": None,
                        "heatKWh": None,
                        "chillKWh": None,
                        "observedHours": 0,
                        "operatingHours": 0,
                        "repairHours": None,
                        "failures": None,
                        "coverage": {},
                    },
                )
                row[channel] = (row[channel] or 0) + (a + b) / 2 * scale * hours
                row["coverage"][channel] = row["coverage"].get(channel, 0) + hours
                segments = intervals[key][channel]
                if segments and segments[-1][1] == left:
                    segments[-1] = (segments[-1][0], stop)
                else:
                    segments.append((left, stop))
                if channel == "grossKWh":
                    row["observedHours"] += hours
                    # Production availability, not an inferred machine health state.
                    row["operatingHours"] += hours if a > 0 or b > 0 else 0
                left = stop
    # Different channel gaps make comparisons invalid. Keep readings visible,
    # but mark financial coverage incomplete so the UI will not invent savings.
    for key, row in rows.items():
        coverage = intervals[key]
        row["financialCoverageComplete"] = row["observedHours"] > 0 and all(
            coverage.get(channel) == coverage.get("grossKWh")
            for channel in ("selfConsumedKWh", "exportedKWh", "parasiticKWh")
        )
    return sorted(rows.values(), key=lambda r: (r["date"], r["unitId"]))


def get_history(unit_ids, start, end, max_gap_seconds=900):
    if not unit_ids:
        return []
    sensors = Sensor.query.filter(
        Sensor.unit_id.in_(unit_ids),
        Sensor.is_active.is_(True),
    ).all()
    sensor_ids = [s.id for s in sensors if s.sensor_type.lower() in CHANNELS]
    if not sensor_ids:
        return []
    readings = (
        SensorReading.query.filter(
            SensorReading.sensor_id.in_(sensor_ids),
            SensorReading.timestamp >= start - timedelta(seconds=max_gap_seconds),
            SensorReading.timestamp <= end,
        )
        .order_by(SensorReading.sensor_id, SensorReading.timestamp)
        .all()
    )
    return integrate_history(sensors, readings, start, end, max_gap_seconds)
