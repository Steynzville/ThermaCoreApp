from datetime import datetime, timedelta, timezone

from app.models import Sensor, UnitCondition
from app.services.data_storage_service import DataStorageService


def test_conditions_describe_persist_acknowledge_and_resolve_without_fake_shutdown(
    client, portfolio_data, db_session,
):
    p = portfolio_data
    unit = p["units"][0]
    sensor = Sensor(
        unit_id=unit.id,
        name="NH3 detector",
        sensor_type="ammonia_ppm",
        unit_of_measurement="ppm",
        max_value=25,
        is_active=True,
    )
    db_session.add(sensor)
    db_session.commit()
    storage = DataStorageService()
    start = datetime.now(timezone.utc) - timedelta(minutes=10)

    def ingest(value, offset=0, quality="GOOD"):
        assert storage.store_sensor_data(
            {
                "unit_id": unit.id,
                "sensor_type": "ammonia_ppm",
                "value": value,
                "timestamp": start + timedelta(seconds=offset),
                "quality": quality,
            },
        )

    ingest(40)
    record = UnitCondition.query.filter_by(unit_id=unit.id).one()
    assert record.category == "alarm"
    assert "40 ppm" in record.message and "25 ppm" in record.message
    assert record.resolved_at is None
    response = client.get(f"/api/v1/units/{unit.id}", headers=p["headers"]["viewer"])
    assert response.status_code == 200
    payload = response.json.get("data", response.json)
    assert payload["has_alarm"] and payload["alerts"][0]["title"] == "NH3 Leak Detected"
    endpoint = f"/api/v1/units/{unit.id}/conditions/{record.id}/acknowledge"
    assert (
        client.post(
            endpoint, headers=p["headers"]["viewer"], json={"notes": "Read"},
        ).status_code
        == 403
    )
    response = client.post(
        endpoint,
        headers=p["headers"]["operator"],
        json={"notes": "Operator investigating"},
    )
    assert response.status_code == 200
    assert response.json["status"] == "acknowledged"
    assert response.json["resolved_at"] is None
    ingest(0, -60)  # Late readings cannot clear a current alarm.
    ingest(0, 30, "BAD")
    assert record.resolved_at is None
    ingest(0, 60)
    db_session.refresh(record)
    assert record.resolved_at is not None
    history = client.get("/api/v1/portfolio/conditions", headers=p["headers"]["viewer"])
    assert history.json["data"][0]["status"] == "resolved"
    assert history.json["data"][0]["notes"] == "Operator investigating"
    ingest(50, 120)
    assert UnitCondition.query.filter_by(unit_id=unit.id).count() == 2
    foreign = p["units"][1]
    assert (
        client.post(
            f"/api/v1/units/{foreign.id}/conditions/{record.id}/acknowledge",
            headers=p["headers"]["operator"],
            json={},
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/v1/portfolio/conditions?unit_ids={foreign.id}",
            headers=p["headers"]["viewer"],
        ).json["data"]
        == []
    )


def test_pressure_threshold_is_an_alert_not_an_ammonia_alarm(
    portfolio_data, db_session,
):
    unit = portfolio_data["units"][0]
    db_session.add(
        Sensor(
            unit_id=unit.id,
            name="Differential pressure",
            sensor_type="differential_pressure_bar",
            unit_of_measurement="bar",
            max_value=2,
            is_active=True,
        ),
    )
    db_session.commit()
    assert DataStorageService().store_sensor_data(
        {
            "unit_id": unit.id,
            "sensor_type": "differential_pressure_bar",
            "value": 3,
            "timestamp": datetime.now(timezone.utc),
        },
    )
    record = UnitCondition.query.filter_by(unit_id=unit.id).one()
    assert record.category == "alert"
    assert "3 bar" in record.message and "2 bar" in record.message
    assert "NH3" not in record.title
