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
