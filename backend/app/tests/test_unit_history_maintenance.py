from datetime import datetime, timedelta, timezone

from app.models import MaintenanceSchedule, Sensor, SensorReading


def test_long_history_and_maintenance_are_unit_scoped(
    client, portfolio_data, db_session,
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
        SensorReading(sensor_id=sensor.id, timestamp=stamp, value=8, quality="GOOD"),
    )
    db_session.commit()
    query = f"?from={(stamp - timedelta(days=1)).date()}&to={datetime.now(timezone.utc).date()}"
    result = client.get(
        f"/api/v1/units/{own.id}/history{query}", headers=p["headers"]["viewer"],
    )
    assert result.status_code == 200
    assert result.json["data"][0]["usefulHeat"] == 8
    assert (
        client.get(
            f"/api/v1/units/{foreign.id}/history{query}", headers=p["headers"]["viewer"],
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


def test_report_schedule_ownership_and_claims(client, portfolio_data, db_session):
    from app.models import ReportSchedule

    p = portfolio_data
    config = {
        "selectedUnits": [p["units"][0].id],
        "outputFormat": "pdf",
        "scope": "multiple",
    }
    body = {
        "config": config,
        "scheduledAt": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
    }
    endpoint = "/api/v1/portfolio/report-schedules"
    created = client.post(endpoint, headers=p["headers"]["viewer"], json=body)
    assert created.status_code == 201
    path = f"{endpoint}/{created.json['id']}"
    assert (
        client.patch(
            path, headers=p["headers"]["operator"], json={"status": "paused"},
        ).status_code
        == 404
    )
    assert (
        client.patch(
            path, headers=p["headers"]["viewer"], json={"status": "paused"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            path, headers=p["headers"]["viewer"], json={"status": "scheduled"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            path, headers=p["headers"]["viewer"], json={"status": "processing"},
        ).status_code
        == 409
    )
    row = db_session.get(ReportSchedule, created.json["id"])
    row.scheduled_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()
    assert (
        client.patch(
            path, headers=p["headers"]["viewer"], json={"status": "processing"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            path, headers=p["headers"]["viewer"], json={"status": "processing"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            endpoint,
            headers=p["headers"]["viewer"],
            json={**body, "config": {**config, "selectedUnits": [p["units"][1].id]}},
        ).status_code
        == 400
    )


def test_sales_records_have_separate_authorization_and_tenant_scope(
    client, portfolio_data,
):
    p = portfolio_data
    endpoint = "/api/v1/portfolio/sales"
    for index, unit in enumerate(p["units"][:2]):
        result = client.post(
            endpoint,
            headers=p["headers"]["admin"],
            json={
                "unitId": unit.id,
                "date": "2026-01-01",
                "revenue": 100 * (index + 1),
                "productLine": "Power-Box",
                "reference": f"TEST-SALE-{index}",
            },
        )
        assert result.status_code == 201
    assert client.get(endpoint, headers=p["headers"]["viewer"]).status_code == 403
    assert client.get(endpoint, headers=p["headers"]["operator"]).status_code == 403
    result = client.get(
        f"{endpoint}?unit_ids={p['units'][0].id}", headers=p["headers"]["admin"],
    )
    assert {row["unitId"] for row in result.json["data"]} == {p["units"][0].id}
