"""Integration tests for Phase 2 SCADA data ingestion pipeline."""
import json
import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from app import create_app, db
from app.models import Unit, Sensor, SensorReading
from app.services.mqtt_service import mqtt_client
from app.services.realtime_processor import realtime_processor


class TestSCADAIntegration:
    """Integration tests for the complete SCADA data pipeline."""
    
    @pytest.fixture
    def app(self):
        """Create test app."""
        app = create_app('testing')
        with app.app_context():
            db.create_all()
            yield app
            db.drop_all()
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_mqtt_to_database_pipeline(self, app):
        """Test complete pipeline from MQTT message to database storage."""
        with app.app_context():
            # Create test unit
            from datetime import date
            from app.models import UnitStatusEnum
            unit = Unit(
                id='UNIT001',
                name='Test Unit 1',
                serial_number='SN001',  # Required field
                install_date=date.today(),  # Required field
                location='Test Location',
                status=UnitStatusEnum.ONLINE  # Use enum value
            )
            db.session.add(unit)
            db.session.commit()
            
            # Initialize MQTT client with data storage service
            from app.services.data_storage_service import data_storage_service
            data_storage_service.init_app(app)
            mqtt_client.init_app(app, data_storage_service)
            
            # Simulate MQTT message processing
            test_topic = 'scada/UNIT001/temperature'
            test_payload = json.dumps({
                'value': 25.5,
                'quality': 'GOOD',
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            
            # Parse and store the message
            parsed_data = mqtt_client._parse_scada_message(test_topic, test_payload)
            assert parsed_data is not None
            assert parsed_data['unit_id'] == 'UNIT001'
            assert parsed_data['sensor_type'] == 'temperature'
            assert parsed_data['value'] == 25.5
            
            # Store the data
            mqtt_client._store_sensor_data(parsed_data)
            
            # Verify sensor was created
            sensor = Sensor.query.filter_by(
                unit_id='UNIT001',
                sensor_type='temperature'
            ).first()
            assert sensor is not None
            assert sensor.name == 'Temperature Sensor'
            
            # Verify sensor reading was stored
            reading = SensorReading.query.filter_by(sensor_id=sensor.id).first()
            assert reading is not None
            assert reading.value == 25.5
            assert reading.quality == 'GOOD'
    
    @patch('app.services.websocket_service.websocket_service.broadcast_sensor_data')
    def test_real_time_processing_pipeline(self, mock_broadcast, app):
        """Test real-time processing and WebSocket broadcasting."""
        with app.app_context():
            # Initialize services
            realtime_processor.init_app(app)
            
            # Test data
            test_data = {
                'value': 95.0,  # High temperature to trigger alert
                'quality': 'GOOD',
                'timestamp': datetime.now(timezone.utc)
            }
            
            # Process sensor data
            realtime_processor.process_sensor_data('UNIT001', 'temperature', test_data)
            
            # Verify broadcast was called
            mock_broadcast.assert_called_once()
            call_args = mock_broadcast.call_args
            assert call_args[0][0] == 'UNIT001'
            assert call_args[0][1] == 'temperature'
    
    def test_alert_system(self, app):
        """Test alert rule evaluation."""
        with app.app_context():
            realtime_processor.init_app(app)
            
            # Test high temperature alert
            high_temp_data = {
                'value': 90.0,  # Above threshold
                'quality': 'GOOD',
                'timestamp': datetime.now(timezone.utc)
            }
            
            alerts = realtime_processor._check_alert_rules('UNIT001', 'temperature', high_temp_data)
            assert len(alerts) == 1
            assert alerts[0]['type'] == 'critical'
            assert 'High temperature alert' in alerts[0]['message']
            
            # Test normal temperature (no alert)
            normal_temp_data = {
                'value': 25.0,  # Normal temperature
                'quality': 'GOOD',
                'timestamp': datetime.now(timezone.utc)
            }
            
            alerts = realtime_processor._check_alert_rules('UNIT001', 'temperature', normal_temp_data)
            assert len(alerts) == 0
    
    def test_protocol_simulator_data_generation(self):
        """Test protocol gateway simulator data generation."""
        from app.services.protocol_gateway_simulator import ProtocolGatewaySimulator
        
        simulator = ProtocolGatewaySimulator()
        
        # Test sensor value generation
        sensor_data = simulator.generate_sensor_value('UNIT001', 'temperature')
        
        assert 'value' in sensor_data
        assert 'quality' in sensor_data
        assert 'timestamp' in sensor_data
        assert 'unit' in sensor_data
        assert sensor_data['unit'] == '°C'
        assert isinstance(sensor_data['value'], (int, float))
        
        # Verify realistic value range
        config = simulator.sensor_configs['temperature']
        min_val, max_val = config['variation_range']
        assert min_val <= sensor_data['value'] <= max_val
    
    def test_opcua_service_status(self, app):
        """Test OPC UA service initialization and status."""
        from app.services.opcua_service import opcua_client
        
        opcua_client.init_app(app)
        status = opcua_client.get_status()
        
        assert 'available' in status
        assert 'connected' in status
        assert 'server_url' in status
        assert 'subscribed_nodes' in status
        assert 'node_mappings' in status
    
    def test_service_integration_in_app(self, app):
        """Test that all services are properly integrated in the Flask app."""
        # Services should be available in development mode
        # Services are only initialized when TESTING is False
        import os
        from unittest.mock import patch
        with patch.dict(os.environ, {'FLASK_ENV': 'development', 'FLASK_DEBUG': '1', 'TESTING': 'false'}, clear=False):
            dev_app = create_app('development')
        
            assert hasattr(dev_app, 'mqtt_client')
            assert hasattr(dev_app, 'websocket_service')
            assert hasattr(dev_app, 'realtime_processor')
            assert hasattr(dev_app, 'opcua_client')
            assert hasattr(dev_app, 'protocol_simulator')
            
            # Test health endpoint includes all services
            with dev_app.test_client() as client:
                response = client.get('/health')
                health_data = response.get_json()
                
                assert 'mqtt' in health_data
                assert 'websocket' in health_data
                assert 'realtime_processor' in health_data
                assert 'opcua' in health_data
                assert 'protocol_simulator' in health_data