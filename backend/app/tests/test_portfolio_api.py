"""Regression tests for ownership, recorded calculations and gateway acknowledgements."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from app import db
from app.models import Sensor, SensorReading, Unit, UnitCommand
from app.services.data_storage_service import DataStorageService
from app.services.portfolio_history import integrate_history


def test_history_integrates_rates_across_midnight_and_preserves_missing_channels():
    start = datetime(2026, 9, 20, 23, 55, tzinfo=timezone.utc)
    sensor = SimpleNamespace(
        id=1,
        unit_id="A",
        sensor_type="power",
        unit_of_measurement="kW",
    )
    readings = [
        SimpleNamespace(sensor_id=1, timestamp=start, value=6, quality="GOOD"),
        SimpleNamespace(
            sensor_id=1,
            timestamp=start + timedelta(minutes=10),
            value=18,
            quality="GOOD",
        ),
    ]
    rows = integrate_history([sensor], readings, start, start + timedelta(minutes=10))
    assert len(rows) == 2
    assert rows[0]["grossKWh"] == pytest.approx(0.75)
    assert rows[1]["grossKWh"] == pytest.approx(1.25)
    assert rows[0]["selfConsumedKWh"] is None
    assert not rows[0]["financialCoverageComplete"]


@pytest.mark.parametrize(
    "quality,gap,value",
    [("BAD", 60, 10), ("GOOD", 3600, 10), ("GOOD", 60, float("nan")), ("GOOD", 60, -1)],
)
def test_history_rejects_bad_quality_long_gaps_and_invalid_rates(quality, gap, value):
    start = datetime(2026, 9, 20, tzinfo=timezone.utc)
    sensor = SimpleNamespace(
        id=1,
        unit_id="A",
        sensor_type="power",
        unit_of_measurement="kW",
    )
    rows = [
        SimpleNamespace(sensor_id=1, timestamp=start, value=10, quality="GOOD"),
        SimpleNamespace(
            sensor_id=1,
            timestamp=start + timedelta(seconds=gap),
            value=value,
            quality=quality,
        ),
    ]
    assert integrate_history([sensor], rows, start, start + timedelta(days=1)) == []


def test_history_converts_water_flow_units():
    start = datetime(2026, 9, 20, tzinfo=timezone.utc)
    sensor = SimpleNamespace(
        id=1,
        unit_id="A",
        sensor_type="water_flow",
        unit_of_measurement="L/min",
    )
    readings = [
        SimpleNamespace(
            sensor_id=1,
            timestamp=start + timedelta(minutes=i),
            value=2,
            quality="GOOD",
        )
        for i in (0, 10)
    ]
    rows = integrate_history([sensor], readings, start, start + timedelta(hours=1))
    assert rows[0]["waterLitres"] == pytest.approx(20)


def test_financial_coverage_compares_intervals_not_just_total_hours():
    start = datetime(2026, 9, 20, tzinfo=timezone.utc)
    sensors, readings = [], []
    for index, channel in enumerate(
        ("power", "parasitic_load", "user_load", "export_power"),
        1,
    ):
        sensors.append(
            SimpleNamespace(
                id=index,
                unit_id="A",
                sensor_type=channel,
                unit_of_measurement="kW",
            ),
        )
        offset = 30 if channel == "user_load" else 0
        readings.extend(
            SimpleNamespace(
                sensor_id=index,
                timestamp=start + timedelta(minutes=offset + minute),
                value=1,
                quality="GOOD",
            )
            for minute in (0, 10)
        )
    rows = integrate_history(sensors, readings, start, start + timedelta(hours=1))
    assert len(set(rows[0]["coverage"].values())) == 1
    assert not rows[0]["financialCoverageComplete"]
    for reading in readings:
        if reading.sensor_id == 3:
            reading.timestamp -= timedelta(minutes=30)
    assert integrate_history(sensors, readings, start, start + timedelta(hours=1))[0][
        "financialCoverageComplete"
    ]


@pytest.mark.parametrize("role", ["viewer", "operator", "client_admin"])
def test_api_filters_by_actual_ownership(client, portfolio_data, role):
    p = portfolio_data
    r = client.get("/api/v1/units", headers=p["headers"][role])
    assert r.status_code == 200
    ids = {u["id"] for u in r.json["data"]}
    assert p["units"][0].id in ids
    assert p["units"][1].id not in ids
    r = client.get(
        f"/api/v1/units?tenant_id={p['tenants'][1].id}",
        headers=p["headers"][role],
    )
    assert r.json["data"] == []
    r = client.get(
        f"/api/v1/remote-control/units/{p['units'][1].id}/status",
        headers=p["headers"][role],
    )
    assert r.status_code == 404


def test_admin_tenant_selection_and_invalid_filter_do_not_broaden(
    client,
    portfolio_data,
):
    p = portfolio_data
    r = client.get(
        f"/api/v1/units?tenant_id={p['tenants'][1].id}",
        headers=p["headers"]["admin"],
    )
    assert [u["id"] for u in r.json["data"]] == [p["units"][1].id]
    assert r.json["data"][0]["tenant_id"] == p["tenants"][1].id
    assert r.json["data"][0]["client_id"] == p["clients"][1].id
    assert (
        client.get(
            "/api/v1/units?tenant_id=invalid",
            headers=p["headers"]["admin"],
        ).json["data"]
        == []
    )


def test_history_endpoint_excludes_other_tenants(client, portfolio_data, db_session):
    p = portfolio_data
    stamp = datetime.now(timezone.utc) - timedelta(hours=1)
    for u in p["units"]:
        s = Sensor(
            unit_id=u.id,
            name="Power",
            sensor_type="power",
            unit_of_measurement="kW",
        )
        db_session.add(s)
        db_session.flush()
        db_session.add_all(
            [
                SensorReading(
                    sensor_id=s.id,
                    timestamp=stamp,
                    value=12,
                    quality="GOOD",
                ),
                SensorReading(
                    sensor_id=s.id,
                    timestamp=stamp + timedelta(minutes=10),
                    value=12,
                    quality="GOOD",
                ),
            ],
        )
    db_session.commit()
    r = client.get("/api/v1/portfolio/history", headers=p["headers"]["viewer"])
    assert r.status_code == 200
    assert {row["unitId"] for row in r.json["data"]} == {p["units"][0].id}
    assert sum(row["grossKWh"] for row in r.json["data"]) == pytest.approx(2)
    assert (
        client.get(
            "/api/v1/portfolio/history?from=not-a-date",
            headers=p["headers"]["admin"],
        ).status_code
        == 400
    )


def test_no_gateway_never_claims_success_or_changes_telemetry(client, portfolio_data):
    p = portfolio_data
    unit = p["units"][0]
    r = client.post(
        f"/api/v1/remote-control/units/{unit.id}/controls",
        headers=p["headers"]["operator"],
        json={"machinePower": False},
    )
    assert r.status_code == 503
    assert db.session.get(Unit, unit.id).status.value == "online"
    assert UnitCommand.query.filter_by(unit_id=unit.id).count() == 0


def test_acknowledgement_persists_control_history_without_fabricating_telemetry(
    app,
    client,
    portfolio_data,
    monkeypatch,
):
    p = portfolio_data
    unit = p["units"][0]
    monkeypatch.setitem(
        app.config,
        "UNIT_CONTROL_GATEWAYS",
        {
            unit.id: {
                "url": "https://device.example.test/control",
                "limits": {"powerSetpoint": 20},
            },
        },
    )

    def ack(*args, **kwargs):
        return Mock(
            json=lambda: {**kwargs["json"], "acknowledged": True},
            raise_for_status=lambda: None,
        )

    with patch("app.services.unit_controls.requests.post", side_effect=ack) as dispatch:
        r = client.post(
            f"/api/v1/remote-control/units/{unit.id}/controls",
            headers=p["headers"]["operator"],
            json={"machinePower": False},
        )
    assert r.status_code == 200, r.json
    assert r.json["unit"]["machinePower"] is False
    assert r.json["unit"]["waterProductionOn"] is False
    assert db.session.get(Unit, unit.id).status.value == "online"
    assert dispatch.call_args.kwargs["timeout"] == 10
    events = client.get(
        "/api/v1/portfolio/events",
        headers=p["headers"]["viewer"],
    ).json["data"]
    assert len(events) == 1 and events[0]["unitId"] == unit.id
    unit_response = client.get(
        f"/api/v1/units/{unit.id}",
        headers=p["headers"]["viewer"],
    )
    assert unit_response.json["controls"]["machinePower"] is False


def test_viewer_foreign_unit_and_invalid_controls_never_dispatch(
    client,
    portfolio_data,
):
    p = portfolio_data
    with patch("app.services.unit_controls.requests.post") as dispatch:
        assert (
            client.post(
                f"/api/v1/remote-control/units/{p['units'][0].id}/controls",
                headers=p["headers"]["viewer"],
                json={"machinePower": False},
            ).status_code
            == 403
        )
        assert (
            client.post(
                f"/api/v1/remote-control/units/{p['units'][1].id}/controls",
                headers=p["headers"]["operator"],
                json={"machinePower": False},
            ).status_code
            == 404
        )
        for body in (
            {"machinePower": "true"},
            {"powerSetpoint": -1},
            {"unknown": True},
        ):
            assert (
                client.post(
                    f"/api/v1/remote-control/units/{p['units'][0].id}/controls",
                    headers=p["headers"]["operator"],
                    json=body,
                ).status_code
                == 400
            )
        dispatch.assert_not_called()


def test_storage_updates_live_snapshot_from_measured_power(app, portfolio_data):
    u = portfolio_data["units"][0]
    store = DataStorageService(app)
    assert store.store_sensor_data(
        {
            "unit_id": u.id,
            "sensor_type": "current_power",
            "value": 14,
            "timestamp": datetime.now(timezone.utc),
            "quality": "GOOD",
        },
    )
    assert db.session.get(Unit, u.id).current_power == 14


def test_older_iso_reading_is_stored_without_replacing_newest_snapshot(
    app,
    portfolio_data,
):
    u = portfolio_data["units"][0]
    store = DataStorageService(app)
    now = datetime.now(timezone.utc)
    assert store.store_sensor_data(
        {
            "unit_id": u.id,
            "sensor_type": "current_power",
            "value": 14,
            "timestamp": now,
        },
    )
    db.session.expire_all()
    assert store.store_sensor_data(
        {
            "unit_id": u.id,
            "sensor_type": "current_power",
            "value": 5,
            "timestamp": (now - timedelta(minutes=5)).isoformat(),
        },
    )
    assert db.session.get(Unit, u.id).current_power == 14
    sensor = Sensor.query.filter_by(unit_id=u.id, sensor_type="current_power").one()
    assert SensorReading.query.filter_by(sensor_id=sensor.id).count() == 2
