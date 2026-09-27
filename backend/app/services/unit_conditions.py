"""Thresholds come from configured sensors, never inferred NH3 from pressure."""

from app import db
from app.models import UnitCondition


def record_condition(sensor, reading):
    if not sensor.is_active:
        return
    threshold, direction = None, None
    if sensor.max_value is not None and reading.value > sensor.max_value:
        threshold, direction = sensor.max_value, "above maximum"
    elif sensor.min_value is not None and reading.value < sensor.min_value:
        threshold, direction = sensor.min_value, "below minimum"
    active = (
        UnitCondition.query.filter_by(sensor_id=sensor.id, resolved_at=None)
        .with_for_update()
        .first()
    )
    if threshold is None:
        if active:
            active.resolved_at = reading.timestamp
            active.updated_at = reading.timestamp
        return
    ammonia = (
        sensor.sensor_type in {"ammonia_ppm", "nh3_ppm"}
        and direction == "above maximum"
    )
    if active is None:
        active = UnitCondition(
            unit_id=sensor.unit_id,
            sensor_id=sensor.id,
            opened_at=reading.timestamp,
        )
        db.session.add(active)
    active.category = "alarm" if ammonia else "alert"
    active.title = (
        "NH3 Leak Detected" if ammonia else f"{sensor.name} threshold exceeded"
    )
    active.message = f"{sensor.name} measured {reading.value:g} {sensor.unit_of_measurement or ''}, {direction} {threshold:g} {sensor.unit_of_measurement or ''}."
    if ammonia:
        active.message += " Ammonia detector threshold exceeded. Follow the site's emergency response procedure; hardware shutdown status must be verified."
    active.value, active.threshold = reading.value, threshold
    active.updated_at = reading.timestamp


def active_conditions(unit):
    rows = (
        UnitCondition.query.filter_by(unit_id=unit.id, resolved_at=None)
        .order_by(UnitCondition.opened_at.desc())
        .all()
    )
    events = [row.as_event(unit.name) for row in rows]
    for category, active in (("alarm", unit.has_alarm), ("alert", unit.has_alert)):
        if active and not any(event["category"] == category for event in events):
            events.append(
                {
                    "id": f"gateway-{category}-{unit.id}",
                    "unitId": unit.id,
                    "category": category,
                    "severity": "critical" if category == "alarm" else "warning",
                    "title": f"Gateway {category}",
                    "message": f"The gateway reports an active {category}; it has not supplied a cause or detector measurement.",
                    "status": "open",
                },
            )
    return events
