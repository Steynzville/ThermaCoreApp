"""Premium access is revocable on the server, independently of JWT claims."""
from app import db
from app.models import AccountEntitlement, User
from app.utils.schemas import UserSchema


def test_premium_grant_revoke_and_installation_boundary(app, client, admin_token, viewer_token):
    admin = {"Authorization": f"Bearer {admin_token}"}
    viewer = {"Authorization": f"Bearer {viewer_token}"}
    with app.app_context():
        user = User.query.filter_by(username="viewer").one()
        user_id = user.id
        assert UserSchema().dump(user)["premium_scada"] is False
    endpoint = f"/api/v1/users/{user_id}/entitlements/premium-scada"
    analytics = "/api/v1/analytics/dashboard/summary"
    assert client.get(analytics, headers=viewer).status_code == 403
    assert client.put(endpoint, headers=viewer, json={"enabled": True}).status_code == 403
    assert client.put(endpoint, headers=admin, json={"enabled": "true"}).status_code == 400
    assert client.put(endpoint, headers=admin, json={"enabled": True}).status_code == 200
    with app.app_context():
        assert db.session.get(AccountEntitlement, user_id).premium_scada
        assert UserSchema().dump(db.session.get(User, user_id))["premium_scada"]
    assert client.get(analytics, headers=viewer).status_code == 200
    assert client.get("/api/v1/scada/status", headers=viewer).status_code == 403
    assert client.put(endpoint, headers=admin, json={"enabled": False}).status_code == 200
    assert client.get(analytics, headers=viewer).status_code == 403


def test_premium_requires_authentication(client):
    assert client.get("/api/v1/analytics/dashboard/summary").status_code == 401


def test_scada_history_resolution_quality_and_tenant_scope(client, portfolio_data, db_session):
    from datetime import datetime, timedelta, timezone
    from app.models import Sensor, SensorReading
    p = portfolio_data
    user = p["users"]["viewer"]
    db_session.add(AccountEntitlement(user_id=user.id, premium_scada=True))
    start = datetime.now(timezone.utc).replace(second=0, microsecond=0) - timedelta(hours=2)
    sensor = Sensor(unit_id=p["units"][0].id, name="Measured heat", sensor_type="useful_heat_kw", unit_of_measurement="kW")
    db_session.add(sensor)
    db_session.flush()
    for offset, value, quality in [(0, 10, "GOOD"), (20, 20, "GOOD"), (30, 999, "BAD"), (60, 30, "GOOD")]:
        db_session.add(SensorReading(sensor_id=sensor.id, timestamp=start + timedelta(seconds=offset), value=value, quality=quality))
    db_session.commit()
    path = f'/api/v1/units/{p["units"][0].id}/scada-history'
    query = {"from": start.isoformat(), "to": (start + timedelta(hours=1)).isoformat(), "resolution": "minute"}
    response = client.get(path, query_string=query, headers=p["headers"]["viewer"])
    assert response.status_code == 200
    assert [row["usefulHeat"] for row in response.json["data"]] == [15, 30]
    assert all(row["date"].endswith("Z") for row in response.json["data"])
    assert response.json["data"][0]["samples"]["usefulHeat"] == 2
    foreign = f'/api/v1/units/{p["units"][1].id}/scada-history'
    assert client.get(foreign, query_string=query, headers=p["headers"]["viewer"]).status_code == 404
    for overrides in [{"resolution": "second"}, {"to": (start + timedelta(days=3)).isoformat()}, {"from": "2026-01-01"}]:
        assert client.get(path, query_string={**query, **overrides}, headers=p["headers"]["viewer"]).status_code == 400
    db_session.get(AccountEntitlement, user.id).premium_scada = False
    db_session.commit()
    assert client.get(path, query_string=query, headers=p["headers"]["viewer"]).status_code == 403
