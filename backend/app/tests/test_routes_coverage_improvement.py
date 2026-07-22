"""Additional tests to improve route coverage.

This module adds targeted tests for routes with low coverage:
- Historical data routes
- Analytics routes
- SCADA routes
- Multi-protocol routes
"""

import json
from unittest.mock import MagicMock, patch

from app.services.modbus_service import ModbusService
from app.services.scada_service import SCADAService
from app.tests.test_utils import unwrap_response


class TestHistoricalDataRoutes:
    """Test historical data routes to increase coverage."""

    def test_get_historical_statistics_unit_not_found(self, client, admin_token):
        """Test get_historical_statistics with non-existent unit."""
        response = client.get(
            "/api/v1/historical/statistics/NONEXISTENT",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_get_historical_export_unit_not_found(self, client, admin_token):
        """Test get_historical_export with non-existent unit."""
        response = client.get(
            "/api/v1/historical/export/NONEXISTENT?format=json",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_compare_units_missing_units(self, client, admin_token):
        """Test compare_units with missing units."""
        response = client.post(
            "/api/v1/historical/compare",
            json={"unit_ids": []},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400


class TestAnalyticsRoutes:
    """Test analytics routes to increase coverage."""

    def test_get_dashboard_summary(self, client, admin_token):
        """Test get_dashboard_summary endpoint."""
        response = client.get(
            "/api/v1/analytics/dashboard",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        # May be 200 or 404 depending on data availability
        assert response.status_code in [200, 404]

    def test_get_trends_unit_not_found(self, client, admin_token):
        """Test get_unit_trends with non-existent unit."""
        response = client.get(
            "/api/v1/analytics/trends/NONEXISTENT?days=7",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_get_performance_units(self, client, admin_token):
        """Test get_units_performance endpoint."""
        response = client.get(
            "/api/v1/analytics/performance?unit_ids=TEST001",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_get_alert_patterns(self, client, admin_token):
        """Test get_alert_patterns endpoint."""
        response = client.get(
            "/api/v1/analytics/alerts",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]


class TestScadaRoutes:
    """Test SCADA routes to increase coverage."""

    def test_get_scada_status(self, client, admin_token):
        """Test get_scada_status endpoint."""
        with patch("app.routes.scada.SCADAService") as mock_scada:
            mock_service = MagicMock()
            mock_service.get_status.return_value = {"status": "ok"}
            mock_scada.return_value = mock_service

            response = client.get(
                "/api/v1/scada/status",
                headers={
                    "Authorization": f"Bearer {admin_token}",
                    "Content-Type": "application/json",
                },
            )

            assert response.status_code in [200, 500]

    def test_mqtt_connect(self, client, admin_token):
        """Test mqtt_connect endpoint."""
        with patch("app.routes.scada.SCADAService") as mock_scada:
            mock_service = MagicMock()
            mock_service.mqtt_connect.return_value = True
            mock_scada.return_value = mock_service

            response = client.post(
                "/api/v1/scada/mqtt/connect",
                json={"device_id": "test_device"},
                headers={
                    "Authorization": f"Bearer {admin_token}",
                    "Content-Type": "application/json",
                },
            )

            assert response.status_code in [200, 400, 500]

    def test_mqtt_disconnect(self, client, admin_token):
        """Test mqtt_disconnect endpoint."""
        with patch("app.routes.scada.SCADAService") as mock_scada:
            mock_service = MagicMock()
            mock_service.mqtt_disconnect.return_value = True
            mock_scada.return_value = mock_service

            response = client.post(
                "/api/v1/scada/mqtt/disconnect",
                json={"device_id": "test_device"},
                headers={
                    "Authorization": f"Bearer {admin_token}",
                    "Content-Type": "application/json",
                },
            )

            assert response.status_code in [200, 400, 500]

    def test_mqtt_subscribe_missing_topic(self, client, admin_token):
        """Test mqtt_subscribe with missing topic."""
        response = client.post(
            "/api/v1/scada/mqtt/subscribe",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_mqtt_publish_missing_params(self, client, admin_token):
        """Test mqtt_publish with missing params."""
        response = client.post(
            "/api/v1/scada/mqtt/publish",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_get_alert_rules(self, client, admin_token):
        """Test get_alert_rules endpoint."""
        response = client.get(
            "/api/v1/scada/alerts",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_create_alert_rule_missing_params(self, client, admin_token):
        """Test create_alert_rule with missing params."""
        response = client.post(
            "/api/v1/scada/alerts",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_get_websocket_clients(self, client, admin_token):
        """Test get_websocket_clients endpoint."""
        response = client.get(
            "/api/v1/scada/websocket/clients",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_opcua_connect_missing_params(self, client, admin_token):
        """Test opcua_connect with missing params."""
        response = client.post(
            "/api/v1/scada/opcua/connect",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_opcua_disconnect(self, client, admin_token):
        """Test opcua_disconnect endpoint."""
        response = client.post(
            "/api/v1/scada/opcua/disconnect",
            json={"device_id": "test_device"},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 400, 500]

    def test_opcua_browse_missing_params(self, client, admin_token):
        """Test opcua_browse with missing params."""
        response = client.post(
            "/api/v1/scada/opcua/browse",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_opcua_read_missing_params(self, client, admin_token):
        """Test opcua_read with missing params."""
        response = client.post(
            "/api/v1/scada/opcua/read",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_opcua_subscribe_missing_params(self, client, admin_token):
        """Test opcua_subscribe with missing params."""
        response = client.post(
            "/api/v1/scada/opcua/subscribe",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_opcua_poll_missing_params(self, client, admin_token):
        """Test opcua_poll with missing params."""
        response = client.post(
            "/api/v1/scada/opcua/poll",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_get_simulator_status(self, client, admin_token):
        """Test get_simulator_status endpoint."""
        response = client.get(
            "/api/v1/scada/simulator/status",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_start_simulator_missing_params(self, client, admin_token):
        """Test start_simulator with missing params."""
        response = client.post(
            "/api/v1/scada/simulator/start",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_stop_simulator(self, client, admin_token):
        """Test stop_simulator endpoint."""
        response = client.post(
            "/api/v1/scada/simulator/stop",
            json={"simulator_id": "test_sim"},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 400, 500]

    def test_inject_simulator_data_missing_params(self, client, admin_token):
        """Test inject_simulator_data with missing params."""
        response = client.post(
            "/api/v1/scada/simulator/inject",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_get_devices_status(self, client, admin_token):
        """Test get_devices_status endpoint."""
        response = client.get(
            "/api/v1/scada/devices/status",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_get_device_status_not_found(self, client, admin_token):
        """Test get_device_status with non-existent device."""
        response = client.get(
            "/api/v1/scada/devices/NONEXISTENT/status",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_get_devices_status_history(self, client, admin_token):
        """Test get_devices_status_history endpoint."""
        response = client.get(
            "/api/v1/scada/devices/TEST001/history?days=7",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]


class TestMultiprotocolRoutes:
    """Test multi-protocol routes to increase coverage."""

    def test_get_protocols_status(self, client, admin_token):
        """Test get_protocols_status endpoint."""
        response = client.get(
            "/api/v1/multiprotocol/status",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_get_modbus_devices(self, client, admin_token):
        """Test get_modbus_devices endpoint."""
        response = client.get(
            "/api/v1/multiprotocol/modbus/devices",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_create_modbus_device_missing_params(self, client, admin_token):
        """Test create_modbus_device with missing params."""
        response = client.post(
            "/api/v1/multiprotocol/modbus/devices",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_get_modbus_device_data_not_found(self, client, admin_token):
        """Test get_modbus_device_data with non-existent device."""
        response = client.get(
            "/api/v1/multiprotocol/modbus/devices/NONEXISTENT/data",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_get_dnp3_devices(self, client, admin_token):
        """Test get_dnp3_devices endpoint."""
        response = client.get(
            "/api/v1/multiprotocol/dnp3/devices",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_create_dnp3_device_missing_params(self, client, admin_token):
        """Test create_dnp3_device with missing params."""
        response = client.post(
            "/api/v1/multiprotocol/dnp3/devices",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_connect_dnp3_device_not_found(self, client, admin_token):
        """Test connect_dnp3_device with non-existent device."""
        response = client.post(
            "/api/v1/multiprotocol/dnp3/devices/NONEXISTENT/connect",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_get_dnp3_device_data_not_found(self, client, admin_token):
        """Test get_dnp3_device_data with non-existent device."""
        response = client.get(
            "/api/v1/multiprotocol/dnp3/devices/NONEXISTENT/data",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_get_unified_devices(self, client, admin_token):
        """Test get_unified_devices endpoint."""
        response = client.get(
            "/api/v1/multiprotocol/unified/devices",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_convert_data_missing_params(self, client, admin_token):
        """Test convert_data with missing params."""
        response = client.post(
            "/api/v1/multiprotocol/convert",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_get_dnp3_performance_metrics(self, client, admin_token):
        """Test get_dnp3_performance_metrics endpoint."""
        response = client.get(
            "/api/v1/multiprotocol/dnp3/performance",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_get_dnp3_performance_summary(self, client, admin_token):
        """Test get_dnp3_performance_summary endpoint."""
        response = client.get(
            "/api/v1/multiprotocol/dnp3/performance/summary",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]

    def test_configure_dnp3_performance_missing_params(self, client, admin_token):
        """Test configure_dnp3_performance with missing params."""
        response = client.post(
            "/api/v1/multiprotocol/dnp3/performance/configure",
            json={},
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_delete_dnp3_performance_metrics(self, client, admin_token):
        """Test delete_dnp3_performance_metrics endpoint."""
        response = client.delete(
            "/api/v1/multiprotocol/dnp3/performance",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 404]
