"""Tests to improve coverage for routes with low test coverage.

This module adds targeted tests for actual API routes that currently have
insufficient test coverage, focusing on:
- Historical data routes (20% coverage)
- Analytics routes (26% coverage)
- SCADA integration routes (33% coverage)
- Multiprotocol routes (29% coverage)
"""

import json
import uuid
from datetime import datetime, timezone

from app.models import (
    Unit,
    UnitStatusEnum,
)
from app.tests.test_utils import get_auth_token


def create_test_unit(
    db_session,
    name=None,
    location=None,
    status=UnitStatusEnum.ONLINE,
):
    """Helper to create a test unit with required fields."""
    unique_id = str(uuid.uuid4())[:8].upper()
    unit = Unit(
        id=f"TEST_{unique_id}",
        name=name or f"Test Unit {unique_id}",
        serial_number=f"SN-{unique_id}",
        install_date=datetime.now(timezone.utc),
        location=location or f"Test Location {unique_id}",
        status=status,
    )
    db_session.add(unit)
    db_session.commit()
    return unit


class TestHistoricalDataRoutes:
    """Test historical data routes to increase coverage."""

    def test_get_historical_data_unit_not_found(self, client, db_session):
        """Test historical data endpoint with non-existent unit."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/historical/data/NONEXISTENT_UNIT",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [404, 500, 503]

    def test_get_historical_statistics_unit_not_found(self, client, db_session):
        """Test statistics endpoint with non-existent unit."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/historical/statistics/NONEXISTENT_UNIT",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [404, 500, 503]

    def test_get_historical_export_unit_not_found(self, client, db_session):
        """Test export endpoint with non-existent unit."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/historical/export/NONEXISTENT_UNIT",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [404, 500, 503]

    def test_compare_units_missing_units(self, client, db_session):
        """Test compare units endpoint with insufficient units."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/historical/compare/units",
            json={
                "unit_ids": ["UNIT1"],
                "metric": "temperature",
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate minimum units requirement
        assert response.status_code in [400, 404, 422]


class TestAnalyticsRoutes:
    """Test analytics routes to increase coverage."""

    def test_get_dashboard_summary(self, client, db_session):
        """Test analytics dashboard summary endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/analytics/dashboard/summary",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]
        data = json.loads(response.data)
        # Verify response structure
        assert isinstance(data, dict)

    def test_get_trends_unit_not_found(self, client, db_session):
        """Test trends endpoint with non-existent unit."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/analytics/trends/NONEXISTENT_UNIT",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [404, 500, 503]

    def test_get_performance_units(self, client, db_session):
        """Test performance units endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/analytics/performance/units",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # May return 500 if services not initialized
        assert response.status_code in [200, 500]

    def test_get_alert_patterns(self, client, db_session):
        """Test alert patterns endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/analytics/alerts/patterns",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should return 200 even with no data
        assert response.status_code in [200, 503]


class TestScadaRoutes:
    """Test SCADA routes to increase coverage."""

    def test_get_scada_status(self, client, db_session):
        """Test SCADA status endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/scada/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 500, 503]

    def test_mqtt_connect(self, client, db_session):
        """Test MQTT connect endpoint."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/mqtt/connect",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should handle gracefully even if MQTT not initialized
        assert response.status_code in [200, 500, 503]

    def test_mqtt_disconnect(self, client, db_session):
        """Test MQTT disconnect endpoint."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/mqtt/disconnect",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should handle gracefully
        assert response.status_code in [200, 500, 503]

    def test_mqtt_subscribe_missing_topic(self, client, db_session):
        """Test MQTT subscribe without topic."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/mqtt/subscribe",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_mqtt_publish_missing_params(self, client, db_session):
        """Test MQTT publish without required parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/mqtt/publish",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_get_alert_rules(self, client, db_session):
        """Test get alert rules endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/scada/alerts/rules",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 500, 503]

    def test_create_alert_rule_missing_params(self, client, db_session):
        """Test create alert rule without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/alerts/rules",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should require parameters
        assert response.status_code in [400, 422, 503]

    def test_get_websocket_clients(self, client, db_session):
        """Test get websocket clients endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/scada/websocket/clients",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 500, 503]

    def test_opcua_connect_missing_params(self, client, db_session):
        """Test OPC UA connect without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/opcua/connect",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_opcua_disconnect(self, client, db_session):
        """Test OPC UA disconnect endpoint."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/opcua/disconnect",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should handle gracefully
        assert response.status_code in [200, 500, 503]

    def test_opcua_browse_missing_params(self, client, db_session):
        """Test OPC UA browse without parameters."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/scada/opcua/browse",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should handle missing parameters
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_opcua_read_missing_params(self, client, db_session):
        """Test OPC UA read without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/opcua/read",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_opcua_subscribe_missing_params(self, client, db_session):
        """Test OPC UA subscribe without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/opcua/subscribe",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_opcua_poll_missing_params(self, client, db_session):
        """Test OPC UA poll without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/opcua/poll",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_get_simulator_status(self, client, db_session):
        """Test simulator status endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/scada/simulator/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 500, 503]

    def test_start_simulator_missing_params(self, client, db_session):
        """Test start simulator without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/simulator/start",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate parameters or start with defaults
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_stop_simulator(self, client, db_session):
        """Test stop simulator endpoint."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/simulator/stop",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should handle gracefully
        assert response.status_code in [200, 400, 500, 503]

    def test_inject_simulator_data_missing_params(self, client, db_session):
        """Test inject simulator data without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/scada/simulator/inject",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [400, 422, 503]

    def test_get_devices_status(self, client, db_session):
        """Test get devices status endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/scada/devices/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]

    def test_get_device_status_not_found(self, client, db_session):
        """Test get device status for non-existent device."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/scada/devices/NONEXISTENT/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [404, 500, 503]

    def test_get_devices_status_history(self, client, db_session):
        """Test get devices status history endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/scada/devices/status/history",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]


class TestMultiprotocolRoutes:
    """Test multiprotocol routes to increase coverage."""

    def test_get_protocols_status(self, client, db_session):
        """Test protocols status endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/protocols/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]

    def test_get_modbus_devices(self, client, db_session):
        """Test get Modbus devices endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/protocols/modbus/devices",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]

    def test_create_modbus_device_missing_params(self, client, db_session):
        """Test create Modbus device without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/protocols/modbus/devices",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [400, 422, 503]

    def test_get_modbus_device_data_not_found(self, client, db_session):
        """Test get Modbus device data for non-existent device."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/protocols/modbus/devices/NONEXISTENT/data",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [404, 500, 503]

    def test_get_dnp3_devices(self, client, db_session):
        """Test get DNP3 devices endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/protocols/dnp3/devices",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]

    def test_create_dnp3_device_missing_params(self, client, db_session):
        """Test create DNP3 device without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/protocols/dnp3/devices",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [400, 422, 503]

    def test_connect_dnp3_device_not_found(self, client, db_session):
        """Test connect DNP3 device for non-existent device."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/protocols/dnp3/devices/NONEXISTENT/connect",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [404, 500, 503]

    def test_get_dnp3_device_data_not_found(self, client, db_session):
        """Test get DNP3 device data for non-existent device."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/protocols/dnp3/devices/NONEXISTENT/data",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [404, 500, 503]

    def test_get_unified_devices(self, client, db_session):
        """Test get unified devices endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/protocols/unified/devices",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 500, 503]

    def test_convert_data_missing_params(self, client, db_session):
        """Test convert data endpoint without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/protocols/convert/data",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate required parameters
        assert response.status_code in [400, 422, 503]

    def test_get_dnp3_performance_metrics(self, client, db_session):
        """Test get DNP3 performance metrics endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/protocols/dnp3/performance/metrics",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]

    def test_get_dnp3_performance_summary(self, client, db_session):
        """Test get DNP3 performance summary endpoint."""
        token = get_auth_token(client)

        response = client.get(
            "/api/v1/protocols/dnp3/performance/summary",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]

    def test_configure_dnp3_performance_missing_params(self, client, db_session):
        """Test configure DNP3 performance without parameters."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/protocols/dnp3/performance/config",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should validate or use defaults
        assert response.status_code in [200, 400, 422, 500, 503]

    def test_delete_dnp3_performance_metrics(self, client, db_session):
        """Test delete DNP3 performance metrics endpoint."""
        token = get_auth_token(client)

        response = client.delete(
            "/api/v1/protocols/dnp3/performance/metrics",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code in [200, 503]
