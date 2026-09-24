from datetime import datetime, timedelta, timezone
from app.models import Sensor, SensorReading, MaintenanceSchedule


def test_long_history_and_maintenance_are_unit_scoped(
    client, portfolio_data, db_session
):
    p = portfolio_data
    own, foreign = p["units"][:2]
    stamp = datetime.now(timezone.utc) - timedelta(days=700)
    sensor = Sensor(
        unit_id=own.id,
        name="Heat",
        sensor_type="useful_heat_kw",
        unit_of_measurement="kW",
    )
    db_session.add(sensor)
    db_session.flush()
    db_session.add(
        SensorReading(sensor_id=sensor.id, timestamp=stamp, value=8, quality="GOOD")
    )
    db_session.commit()
    query = f"?from={(stamp - timedelta(days=1)).date()}&to={datetime.now(timezone.utc).date()}"
    result = client.get(
        f"/api/v1/units/{own.id}/history{query}", headers=p["headers"]["viewer"]
    )
    assert result.status_code == 200
    assert result.json["data"][0]["usefulHeat"] == 8
    assert (
        client.get(
            f"/api/v1/units/{foreign.id}/history{query}", headers=p["headers"]["viewer"]
        ).status_code
        == 404
    )
    payload = {
        "scheduledAt": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "description": "Inspect pump",
    }
    endpoint = f"/api/v1/units/{own.id}/maintenance"
    assert (
        client.post(endpoint, headers=p["headers"]["viewer"], json=payload).status_code
        == 403
    )
    result = client.post(endpoint, headers=p["headers"]["operator"], json=payload)
    assert result.status_code == 201
    assert (
        db_session.get(MaintenanceSchedule, result.json["id"]).description
        == "Inspect pump"
    )
    assert (
        client.get(endpoint, headers=p["headers"]["viewer"]).json["data"][0]["id"]
        == result.json["id"]
    )
    assert (
        client.post(
            f"/api/v1/units/{foreign.id}/maintenance",
            headers=p["headers"]["operator"],
            json=payload,
        ).status_code
        == 404
    )
    assert (
        client.post(
            endpoint,
            headers=p["headers"]["operator"],
            json={**payload, "scheduledAt": "2000-01-01T00:00:00Z"},
        ).status_code
        == 400
    )
