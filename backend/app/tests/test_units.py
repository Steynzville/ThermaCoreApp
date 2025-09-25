"""Unit tests for units API functionality."""
import json
import pytest
from datetime import datetime

from app.models import Unit, Sensor


class TestUnitsAPI:
    """Test units API endpoints."""
    
    def get_auth_token(self, client, username='admin', password='admin123'):
        """Helper method to get auth token."""
        response = client.post('/api/v1/auth/login',
            json={'username': username, 'password': password},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = json.loads(response.data)
            return data['access_token']
        return None
    
    def test_get_units_success(self, client):
        """Test getting units list."""
        token = self.get_auth_token(client)
        
        response = client.get('/api/v1/units',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'data' in data
        assert 'page' in data
        assert 'total' in data
        assert len(data['data']) >= 1  # Should have test unit
    
    def test_get_units_with_filters(self, client):
        """Test getting units with filters."""
        token = self.get_auth_token(client)
        
        # Test status filter
        response = client.get('/api/v1/units?status=online',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        for unit in data['data']:
            assert unit['status'] == 'online'
    
    def test_get_units_pagination(self, client):
        """Test units pagination."""
        token = self.get_auth_token(client)
        
        response = client.get('/api/v1/units?page=1&per_page=10',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['page'] == 1
        assert data['per_page'] == 10
    
    def test_get_unit_by_id(self, client):
        """Test getting specific unit by ID."""
        token = self.get_auth_token(client)
        
        response = client.get('/api/v1/units/TEST001',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['id'] == 'TEST001'
        assert data['name'] == 'Test Unit 001'
    
    def test_get_unit_not_found(self, client):
        """Test getting non-existent unit."""
        token = self.get_auth_token(client)
        
        response = client.get('/api/v1/units/NONEXISTENT',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 404
    
    def test_create_unit_success(self, client):
        """Test creating new unit."""
        token = self.get_auth_token(client)
        
        unit_data = {
            'id': 'TEST002',
            'name': 'Test Unit 002',
            'serial_number': 'TEST002-2024-002',
            'install_date': '2024-02-15T00:00:00',
            'location': 'Test Site 2',
            'client_name': 'Test Client 2',
            'client_email': 'client2@test.com'
        }
        
        response = client.post('/api/v1/units',
            json=unit_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        assert data['id'] == 'TEST002'
        assert data['name'] == 'Test Unit 002'
    
    def test_create_unit_duplicate_id(self, client):
        """Test creating unit with duplicate ID."""
        token = self.get_auth_token(client)
        
        unit_data = {
            'id': 'TEST001',  # Already exists
            'name': 'Duplicate Unit',
            'serial_number': 'DUPLICATE-2024-001',
            'install_date': '2024-02-15T00:00:00'
        }
        
        response = client.post('/api/v1/units',
            json=unit_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'already exists' in data['error']
    
    def test_create_unit_validation_error(self, client):
        """Test creating unit with validation errors."""
        token = self.get_auth_token(client)
        
        unit_data = {
            'id': '',  # Empty ID should fail
            'name': 'Test Unit',
            'serial_number': 'TEST-2024-003',
            'install_date': '2024-02-15T00:00:00'
        }
        
        response = client.post('/api/v1/units',
            json=unit_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Validation error' in data['error']
    
    def test_update_unit_success(self, client):
        """Test updating existing unit."""
        token = self.get_auth_token(client)
        
        update_data = {
            'name': 'Updated Test Unit 001',
            'location': 'Updated Test Site',
            'status': 'maintenance',
            'health_status': 'warning'
        }
        
        response = client.put('/api/v1/units/TEST001',
            json=update_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['name'] == 'Updated Test Unit 001'
        assert data['location'] == 'Updated Test Site'
        assert data['status'] == 'maintenance'
        assert data['health_status'] == 'warning'
    
    def test_update_unit_not_found(self, client):
        """Test updating non-existent unit."""
        token = self.get_auth_token(client)
        
        update_data = {'name': 'Updated Unit'}
        
        response = client.put('/api/v1/units/NONEXISTENT',
            json=update_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 404
    
    def test_delete_unit_success(self, client, db_session):
        """Test deleting unit."""
        token = self.get_auth_token(client)
        
        # Create a unit to delete
        test_unit = Unit(
            id='DELETE_ME',
            name='Unit to Delete',
            serial_number='DELETE-2024-001',
            install_date=datetime.utcnow()
        )
        db_session.add(test_unit)
        db_session.commit()
        
        response = client.delete('/api/v1/units/DELETE_ME',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 204
        
        # Verify unit is deleted
        verify_response = client.get('/api/v1/units/DELETE_ME',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert verify_response.status_code == 404
    
    def test_delete_unit_not_found(self, client):
        """Test deleting non-existent unit."""
        token = self.get_auth_token(client)
        
        response = client.delete('/api/v1/units/NONEXISTENT',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 404
    
    def test_get_unit_stats(self, client):
        """Test getting unit statistics."""
        token = self.get_auth_token(client)
        
        response = client.get('/api/v1/units/stats',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        required_fields = [
            'total_units', 'online_units', 'offline_units',
            'maintenance_units', 'error_units', 'critical_health',
            'warning_health', 'optimal_health', 'units_with_alerts',
            'units_with_alarms'
        ]
        
        for field in required_fields:
            assert field in data
            assert isinstance(data[field], int)
    
    def test_update_unit_status(self, client):
        """Test updating unit status."""
        token = self.get_auth_token(client)
        
        status_data = {
            'status': 'error',
            'health_status': 'critical',
            'has_alert': True,
            'has_alarm': True
        }
        
        response = client.patch('/api/v1/units/TEST001/status',
            json=status_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['status'] == 'error'
        assert data['health_status'] == 'critical'
        assert data['has_alert'] is True
        assert data['has_alarm'] is True


class TestUnitSensors:
    """Test unit sensors functionality."""
    
    def get_auth_token(self, client, username='admin', password='admin123'):
        """Helper method to get auth token."""
        response = client.post('/api/v1/auth/login',
            json={'username': username, 'password': password},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = json.loads(response.data)
            return data['access_token']
        return None
    
    def test_get_unit_sensors(self, client):
        """Test getting sensors for a unit."""
        token = self.get_auth_token(client)
        
        response = client.get('/api/v1/units/TEST001/sensors',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert isinstance(data, list)
        assert len(data) >= 1  # Should have test sensor
    
    def test_create_unit_sensor(self, client):
        """Test creating sensor for a unit."""
        token = self.get_auth_token(client)
        
        sensor_data = {
            'name': 'Test Pressure Sensor',
            'sensor_type': 'pressure',
            'unit_of_measurement': 'Pa',
            'min_value': 900.0,
            'max_value': 1100.0
        }
        
        response = client.post('/api/v1/units/TEST001/sensors',
            json=sensor_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        assert data['name'] == 'Test Pressure Sensor'
        assert data['sensor_type'] == 'pressure'
        assert data['unit_id'] == 'TEST001'
    
    def test_get_unit_readings(self, client):
        """Test getting sensor readings for a unit."""
        token = self.get_auth_token(client)
        
        response = client.get('/api/v1/units/TEST001/readings',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert isinstance(data, list)


class TestUnitsPermissions:
    """Test units API permissions."""
    
    def get_auth_token(self, client, username='admin', password='admin123'):
        """Helper method to get auth token."""
        response = client.post('/api/v1/auth/login',
            json={'username': username, 'password': password},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = json.loads(response.data)
            return data['access_token']
        return None
    
    def test_viewer_can_read_units(self, client):
        """Test viewer can read units."""
        token = self.get_auth_token(client, 'viewer', 'viewer123')
        
        response = client.get('/api/v1/units',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
    
    def test_viewer_cannot_create_units(self, client):
        """Test viewer cannot create units."""
        token = self.get_auth_token(client, 'viewer', 'viewer123')
        
        unit_data = {
            'id': 'FORBIDDEN',
            'name': 'Forbidden Unit',
            'serial_number': 'FORBIDDEN-2024-001',
            'install_date': '2024-02-15T00:00:00'
        }
        
        response = client.post('/api/v1/units',
            json=unit_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 403
    
    def test_viewer_cannot_delete_units(self, client):
        """Test viewer cannot delete units."""
        token = self.get_auth_token(client, 'viewer', 'viewer123')
        
        response = client.delete('/api/v1/units/TEST001',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 403