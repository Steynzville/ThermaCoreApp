"""Additional coverage tests for multiprotocol routes."""

from unittest.mock import MagicMock, patch


def test_protocol_status_empty_and_exception(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    with patch("app.routes.multiprotocol.collect_protocol_status", return_value=[]):
        empty = client.get("/api/v1/protocols/status", headers=headers)
    assert empty.status_code == 200
    assert empty.get_json()["summary"]["health_score"] == 0.0

    with patch(
        "app.routes.multiprotocol.collect_protocol_status",
        side_effect=Exception("boom"),
    ):
        error = client.get("/api/v1/protocols/status", headers=headers)
    assert error.status_code == 500


def test_device_endpoint_exception_paths(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    modbus = MagicMock()
    modbus.get_device_status.side_effect = Exception("boom")
    with patch("flask.current_app.modbus_service", modbus, create=True):
        response = client.get("/api/v1/protocols/modbus/devices", headers=headers)
    assert response.status_code == 500

    dnp3 = MagicMock()
    dnp3.add_device.side_effect = Exception("boom")
    with patch("flask.current_app.dnp3_service", dnp3, create=True):
        response = client.post(
            "/api/v1/protocols/dnp3/devices",
            json={
                "device_id": "d1",
                "master_address": 1,
                "outstation_address": 1,
                "host": "127.0.0.1",
            },
            headers=headers,
        )
    assert response.status_code == 500


def test_dnp3_performance_config_and_metrics_branches(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # unavailable service
    assert (
        client.get(
            "/api/v1/protocols/dnp3/performance/metrics",
            headers=headers,
        ).status_code
        == 503
    )

    dnp3 = MagicMock()
    with patch("flask.current_app.dnp3_service", dnp3, create=True):
        bad_config = client.post(
            "/api/v1/protocols/dnp3/performance/config",
            json={"enable_caching": "yes"},
            headers=headers,
        )
        assert bad_config.status_code == 400

        dnp3.get_device_performance_stats.return_value = {"error": "not found"}
        not_found = client.get(
            "/api/v1/protocols/dnp3/devices/ghost/performance",
            headers=headers,
        )
        assert not_found.status_code == 404

        dnp3.clear_performance_metrics.side_effect = Exception("boom")
        clear_error = client.delete(
            "/api/v1/protocols/dnp3/performance/metrics",
            headers=headers,
        )
        assert clear_error.status_code == 500
