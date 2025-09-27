"""Integration tests for protocol simulation and adapter interaction as part of PR4."""
import pytest
import time
import json
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any

from app import create_app, db
from app.models import Unit, Sensor, SensorReading, UnitStatusEnum
from app.services.protocol_gateway_simulator import ProtocolGatewaySimulator
from app.services.modbus_service import ModbusService
from app.services.dnp3_service import DNP3Service
from app.services.opcua_service import OPCUAClient
from app.services.mqtt_service import MQTTClient
from app.protocols.registry import collect_protocol_status


class TestProtocolSimulationIntegration:
    """Integration tests for protocol simulation with real adapters."""
    
    @pytest.fixture
    def app(self):
        """Create test app with protocol services."""
        app = create_app('testing')
        with app.app_context():
            db.create_all()
            
            # Initialize protocol services on the app
            app.modbus_service = ModbusService()
            app.dnp3_service = DNP3Service()
            app.opcua_client = OPCUAClient()
            app.mqtt_client = MQTTClient()
            app.protocol_simulator = ProtocolGatewaySimulator()
            
            # Initialize services with the app
            app.modbus_service.init_app(app)
            app.dnp3_service.init_app(app)
            app.opcua_client.init_app(app)
            app.mqtt_client.init_app(app)
            
            yield app
            db.drop_all()
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_all_protocol_adapters_status_collection(self, app):
        """Test that all protocol adapters can be collected by the registry."""
        with app.app_context():
            # Collect status from all protocols
            statuses = collect_protocol_status()
            
            # Should have all 5 protocols
            assert len(statuses) == 5
            
            # Convert to dict for easier testing
            statuses_dict = {status['name']: status for status in statuses}
            
            # Verify all expected protocols are present
            expected_protocols = ['mqtt', 'opcua', 'modbus', 'dnp3', 'simulator']
            for protocol in expected_protocols:
                assert protocol in statuses_dict
                
            # Verify structure of each status
            for protocol_name, status in statuses_dict.items():
                assert 'available' in status
                assert 'connected' in status
                assert 'status' in status
                assert isinstance(status['available'], bool)
                assert isinstance(status['connected'], bool)
                assert status['status'] in ['not_initialized', 'initializing', 'ready', 'error', 'degraded', 'unknown', 'reconnecting']
    
    def test_modbus_service_integration(self, app):
        """Test Modbus service integration with protocol registry."""
        with app.app_context():
            modbus_service = app.modbus_service
            
            # Test status method exists and works
            status = modbus_service.get_status()
            
            assert 'available' in status
            assert 'connected' in status
            assert 'status' in status
            assert 'metrics' in status
            assert 'devices' in status
            
            # Initially no devices configured
            assert status['available'] is True  # Mock service is always available
            assert status['connected'] is False  # No devices connected
            assert status['status'] == 'not_initialized'
            assert status['demo'] is True
            
            # Add a mock device
            modbus_service.add_device('TEST_DEVICE', 1, 'localhost', 502)
            
            # Check status reflects the device
            status = modbus_service.get_status()
            assert status['status'] in ['error', 'initializing']  # Device added but not connected
            assert status['metrics']['total_devices'] == 1
            assert status['metrics']['connected_devices'] == 0
    
    def test_dnp3_service_integration(self, app):
        """Test DNP3 service integration with protocol registry."""
        with app.app_context():
            dnp3_service = app.dnp3_service
            
            # Test status method exists and works
            status = dnp3_service.get_status()
            
            assert 'available' in status
            assert 'connected' in status
            assert 'status' in status
            assert 'metrics' in status
            assert 'devices' in status
            
            # Initially master not initialized
            assert status['available'] is False  # Master not initialized
            assert status['connected'] is False
            assert status['status'] == 'not_initialized'
            assert status['demo'] is True
            
            # Initialize master
            dnp3_service.init_master(1)
            
            # Check status reflects initialization
            status = dnp3_service.get_status()
            assert status['available'] is True  # Master now initialized
            assert status['status'] == 'initializing'  # No devices yet
    
    def test_protocol_simulator_integration_with_adapters(self, app):
        """Test protocol simulator can work alongside real adapters."""
        with app.app_context():
            simulator = app.protocol_simulator
            
            # Test simulator status
            sim_status = simulator.get_status()
            assert 'connected' in sim_status
            assert 'running' in sim_status
            assert 'simulation_units' in sim_status
            
            # Test protocol registry can collect all statuses including simulator
            statuses = collect_protocol_status()
            statuses_dict = {status['name']: status for status in statuses}
            
            # Verify simulator is included
            assert 'simulator' in statuses_dict
            
            # When simulator is not connected, status should reflect that
            simulator_status = statuses_dict['simulator']
            # The simulator's status depends on its current state
            assert 'available' in simulator_status
            assert 'connected' in simulator_status
    
    @patch('app.services.protocol_gateway_simulator.mqtt')
    def test_simulator_mqtt_integration(self, mock_mqtt, app):
        """Test that simulator can integrate with MQTT for data publishing."""
        with app.app_context():
            simulator = app.protocol_simulator
            
            # Mock MQTT client
            mock_client = Mock()
            mock_client.publish.return_value.rc = 0  # Success
            mock_mqtt.Client.return_value = mock_client
            
            # Test data generation
            sensor_data = simulator.generate_sensor_value('UNIT001', 'temperature')
            
            assert 'value' in sensor_data
            assert 'quality' in sensor_data
            assert 'timestamp' in sensor_data
            assert 'unit' in sensor_data
            
            # Verify realistic ranges
            assert -10.0 <= sensor_data['value'] <= 40.0  # Temperature range
            assert sensor_data['unit'] == '°C'
            assert sensor_data['quality'] in ['GOOD', 'BAD', 'UNCERTAIN']
    
    def test_protocol_error_handling_in_registry(self, app):
        """Test protocol registry handles adapter errors gracefully."""
        with app.app_context():
            # Create a mock adapter that raises exception
            broken_adapter = Mock()
            broken_adapter.get_status.side_effect = Exception("Connection timeout")
            app.test_broken_adapter = broken_adapter
            
            # Temporarily add to registry for testing
            from app.protocols.registry import REGISTRY
            original_registry = REGISTRY[:]
            REGISTRY.append(("test_broken", "test_broken_adapter"))
            
            try:
                statuses = collect_protocol_status()
                statuses_dict = {status['name']: status for status in statuses}
                
                # Should have the broken adapter with error status
                if 'test_broken' in statuses_dict:
                    broken_status = statuses_dict['test_broken']
                    assert broken_status['available'] is False
                    assert broken_status['connected'] is False
                    assert broken_status['status'] == 'error'
                    assert 'error' in broken_status
                    
            finally:
                # Restore original registry
                REGISTRY[:] = original_registry
    
    def test_protocol_heartbeat_simulation(self, app):
        """Test protocol adapters can simulate heartbeat functionality."""
        with app.app_context():
            simulator = app.protocol_simulator
            
            # Generate test data multiple times to simulate heartbeat
            data_points = []
            for i in range(3):
                data = simulator.generate_sensor_value('UNIT001', 'temperature')
                data_points.append(data)
                time.sleep(0.1)  # Small delay
            
            # Verify each data point has a timestamp
            for data in data_points:
                assert 'timestamp' in data
                assert isinstance(data['timestamp'], datetime)
            
            # Timestamps should be different (progression)
            timestamps = [data['timestamp'] for data in data_points]
            assert timestamps[0] <= timestamps[1] <= timestamps[2]
    
    def test_end_to_end_protocol_pipeline(self, app):
        """Test complete pipeline from protocol adapters through registry to status reporting."""
        with app.app_context():
            # Set up test units in database
            from datetime import date
            unit = Unit(
                id='UNIT001',
                name='Test Unit 1', 
                serial_number='SN001',
                install_date=date.today(),
                location='Test Location',
                status=UnitStatusEnum.ONLINE
            )
            db.session.add(unit)
            db.session.commit()
            
            # Initialize all protocol services
            modbus_service = app.modbus_service
            dnp3_service = app.dnp3_service
            simulator = app.protocol_simulator
            
            # Add some test configurations
            modbus_service.add_device('UNIT001', 1, 'localhost', 502)
            dnp3_service.init_master(1)
            dnp3_service.add_device('UNIT001', 1, 2, 'localhost', 20000)
            
            # Collect all protocol statuses
            statuses = collect_protocol_status()
            
            # Verify we got comprehensive status information
            assert len(statuses) >= 5
            
            # Check that each status has proper normalization
            for status in statuses:
                assert 'name' in status
                assert 'available' in status
                assert 'connected' in status
                assert 'status' in status
                
                # Check PR1a enhanced fields are present
                assert 'is_heartbeat_stale' in status
                assert 'is_recovering' in status
                assert 'health_score' in status
                assert isinstance(status['health_score'], (int, float))
                assert 0 <= status['health_score'] <= 100
    
    def test_protocol_adapter_metrics_collection(self, app):
        """Test that protocol adapters provide useful metrics."""
        with app.app_context():
            statuses = collect_protocol_status()
            statuses_dict = {status['name']: status for status in statuses}
            
            # Check Modbus metrics
            modbus_status = statuses_dict['modbus']
            if 'metrics' in modbus_status:
                metrics = modbus_status['metrics']
                assert 'total_devices' in metrics
                assert 'connected_devices' in metrics
                assert isinstance(metrics['total_devices'], int)
                assert isinstance(metrics['connected_devices'], int)
            
            # Check DNP3 metrics
            dnp3_status = statuses_dict['dnp3']
            if 'metrics' in dnp3_status:
                metrics = dnp3_status['metrics']
                assert 'master_initialized' in metrics
                assert 'total_devices' in metrics
                assert isinstance(metrics['master_initialized'], bool)
                assert isinstance(metrics['total_devices'], int)
            
            # Check OPC UA metrics
            opcua_status = statuses_dict['opcua']
            if 'metrics' not in opcua_status:
                # OPC UA might not have metrics in its current status format
                # but should have basic info
                assert 'available' in opcua_status