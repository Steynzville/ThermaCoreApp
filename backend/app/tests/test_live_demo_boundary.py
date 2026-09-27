from unittest.mock import Mock

from app.protocols.registry import collect_protocol_status
from app.utils.data_mode import demo_enabled


def test_live_rejects_legacy_simulators_even_if_attached(
    app,
    client,
    admin_token,
    viewer_token,
    monkeypatch,
):
    monkeypatch.setitem(app.config, "DEMO_DATA_ENABLED", False)
    monkeypatch.setattr(app, "modbus_service", Mock(), raising=False)
    monkeypatch.setattr(app, "dnp3_service", Mock(), raising=False)
    headers = {"Authorization": f"Bearer {admin_token}"}
    for path in (
        "/api/v1/protocols/modbus/devices",
        "/api/v1/protocols/dnp3/devices",
        "/api/v1/scada/simulator/status",
    ):
        assert client.get(path, headers=headers).status_code == 503
    assert (
        client.get(
            "/api/v1/protocols/status",
            headers={"Authorization": f"Bearer {viewer_token}"},
        ).status_code
        == 403
    )
    with app.app_context():
        rows = collect_protocol_status()
        assert all(
            not row["connected"] and not row["available"]
            for row in rows
            if row["name"] in {"modbus", "dnp3", "simulator"}
        )
    app.modbus_service.get_status.assert_not_called()
    app.dnp3_service.get_status.assert_not_called()


def test_demo_flag_is_explicit_and_seed_does_not_touch_live_database(monkeypatch):
    from app.utils.auto_migration import seed_client_admin_data

    monkeypatch.delenv("DEMO_DATA_ENABLED", raising=False)
    assert not demo_enabled()
    engine = Mock()
    assert seed_client_admin_data(engine)
    engine.begin.assert_not_called()
    monkeypatch.setenv("DEMO_DATA_ENABLED", "false")
    assert not demo_enabled()
    monkeypatch.setenv("DEMO_DATA_ENABLED", "true")
    monkeypatch.delenv("DEMO_CLIENT_ADMIN_PASSWORD", raising=False)
    assert demo_enabled()
    assert not seed_client_admin_data(engine)
    engine.begin.assert_not_called()
