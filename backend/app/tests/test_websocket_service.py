"""Socket.IO integration tests use real JWTs and database ownership."""

import pytest
from flask_jwt_extended import create_refresh_token
from app.services.websocket_service import WebSocketService


@pytest.fixture
def sockets(app):
    service = WebSocketService(app)
    yield service
    for sid in list(service._connected_clients):
        service.socketio.server.disconnect(sid)


def test_rejects_anonymous_invalid_and_refresh_tokens(app, sockets, portfolio_data):
    assert not sockets.socketio.test_client(app).is_connected()
    assert not sockets.socketio.test_client(
        app, auth={"token": "invalid"}
    ).is_connected()
    refresh = create_refresh_token(identity=str(portfolio_data["users"]["viewer"].id))
    assert not sockets.socketio.test_client(app, auth={"token": refresh}).is_connected()


def test_only_delivers_selected_tenants_units(app, sockets, portfolio_data):
    p = portfolio_data
    viewer = sockets.socketio.test_client(app, auth={"token": p["tokens"]["viewer"]})
    admin = sockets.socketio.test_client(
        app, auth={"token": p["tokens"]["admin"], "tenant_id": p["tenants"][1].id}
    )
    assert viewer.is_connected() and admin.is_connected()
    viewer.get_received()
    admin.get_received()
    sockets.broadcast_sensor_data(p["units"][0].id, "power", {"value": 12})
    assert [e["name"] for e in viewer.get_received()] == ["sensor_data"]
    assert admin.get_received() == []
    sockets.broadcast_unit_status(p["units"][1].id, {"status": "offline"})
    assert viewer.get_received() == []
    assert [e["name"] for e in admin.get_received()] == ["unit_status"]


def test_rejects_cross_tenant_connect_and_subscribe(app, sockets, portfolio_data):
    p = portfolio_data
    foreign = sockets.socketio.test_client(
        app, auth={"token": p["tokens"]["viewer"], "tenant_id": p["tenants"][1].id}
    )
    assert not foreign.is_connected()
    viewer = sockets.socketio.test_client(app, auth={"token": p["tokens"]["viewer"]})
    viewer.get_received()
    viewer.emit("subscribe_unit", {"unit_id": p["units"][1].id})
    assert viewer.get_received()[0]["name"] == "error"
    sockets.broadcast_system_alert(
        {"unit_id": p["units"][1].id, "message": "Private alert"}
    )
    assert viewer.get_received() == []


def test_rechecks_active_status_before_delivery(
    app, sockets, portfolio_data, db_session
):
    p = portfolio_data
    viewer = sockets.socketio.test_client(app, auth={"token": p["tokens"]["viewer"]})
    viewer.get_received()
    p["users"]["viewer"].is_active = False
    db_session.commit()
    sockets.broadcast_sensor_data(p["units"][0].id, "power", {"value": 12})
    assert not viewer.is_connected()


def test_unsubscribe_and_status_are_scoped(app, sockets, portfolio_data):
    p = portfolio_data
    viewer = sockets.socketio.test_client(app, auth={"token": p["tokens"]["viewer"]})
    viewer.get_received()
    viewer.emit("get_status")
    assert viewer.get_received()[0]["args"][0]["subscribed_units"] == [p["units"][0].id]
    viewer.emit("unsubscribe_unit", {"unit_id": p["units"][0].id})
    viewer.get_received()
    sockets.broadcast_sensor_data(p["units"][0].id, "power", {"value": 12})
    assert viewer.get_received() == []
