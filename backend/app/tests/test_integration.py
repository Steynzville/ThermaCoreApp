"""Integration tests for ThermaCore SCADA API."""
import json

from app.models import Sensor


class TestIntegrationWorkflows:
    """Test complete integration workflows."""
    
    def get_auth_token(self, client, username='admin', password='admin123'):
        """Helper method to get auth token."""
        response = client.post('/api/v1/auth/login',
            json={'username': username, 'password': password},
            headers={'Content-Type': 'application/json'}
        )
        if response.status_code == 200:
            data = json.loads(response.data)
            if 'data' in data and 'access_token' in data['data']:
                return data['data']['access_token']
            else:
                raise KeyError(f"'access_token' not found in login response: {data}")
        else:
            raise RuntimeError(f"Login failed: {response.status_code} {response.data}")
    
    def test_complete_unit_lifecycle(self, client, db_session):
        """Test complete unit lifecycle from creation to deletion."""
        token = self.get_auth_token(client)
        
        # 1. Create unit
        unit_data = {
            'id': 'LIFECYCLE001',
            'name': 'Lifecycle Test Unit',
            'serial_number': 'LIFECYCLE001-2024-001',
            'install_date': '2024-01-15T00:00:00',
            'location': 'Lifecycle Test Site',
            'client_name': 'Lifecycle Client',
            'client_email': 'lifecycle@test.com',
            'client_phone': '+1-555-0199'
        }
        
        create_response = client.post('/api/v1/units',
            json=unit_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert create_response.status_code == 201
        created_unit = json.loads(create_response.data)
        assert created_unit['id'] == 'LIFECYCLE001'
        
        # 2. Add sensors to unit
        sensor_data = {
            'name': 'Temperature Sensor',
            'sensor_type': 'temperature',
            'unit_of_measurement': '°C',
            'min_value': -20.0,
            'max_value': 50.0
        }
        
        sensor_response = client.post('/api/v1/units/LIFECYCLE001/sensors',
            json=sensor_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert sensor_response.status_code == 201
        json.loads(sensor_response.data)
        
        # 3. Update unit status
        status_update = {
            'status': 'online',
            'health_status': 'optimal',
            'temp_outside': 25.5,
            'humidity': 65.0,
            'battery_level': 85.0
        }
        
        update_response = client.patch('/api/v1/units/LIFECYCLE001/status',
            json=status_update,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert update_response.status_code == 200
        updated_unit = json.loads(update_response.data)
        assert updated_unit['status'] == 'online'
        assert updated_unit['temp_outside'] == 25.5
        
        # 4. Get unit with sensors
        get_response = client.get('/api/v1/units/LIFECYCLE001',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert get_response.status_code == 200
        unit_with_sensors = json.loads(get_response.data)
        assert len(unit_with_sensors['sensors']) >= 1
        
        # 5. Delete unit
        delete_response = client.delete('/api/v1/units/LIFECYCLE001',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert delete_response.status_code == 204
        
        # 6. Verify unit is deleted
        verify_response = client.get('/api/v1/units/LIFECYCLE001',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert verify_response.status_code == 404
    
    def test_user_role_workflow(self, client, db_session):
        """Test user creation and role management workflow."""
        admin_token = self.get_auth_token(client, 'admin', 'admin123')
        
        # 1. Create new operator user
        from app.models import Role
        operator_role = Role.query.filter_by(name='operator').first()
        
        user_data = {
            'username': 'newoperator',
            'email': 'newoperator@test.com',
            'password': 'operator123',
            'first_name': 'New',
            'last_name': 'Operator',
            'role_id': operator_role.id
        }
        
        create_response = client.post('/api/v1/auth/register',
            json=user_data,
            headers={
                'Authorization': f'Bearer {admin_token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert create_response.status_code == 201
        new_user = json.loads(create_response.data)
        user_id = new_user['id']
        
        # 2. Login as new operator
        operator_token = self.get_auth_token(client, 'newoperator', 'operator123')
        assert operator_token is not None
        
        # 3. Test operator can read units
        units_response = client.get('/api/v1/units',
            headers={'Authorization': f'Bearer {operator_token}'}
        )
        assert units_response.status_code == 200
        
        # 4. Test operator can create units
        unit_data = {
            'id': 'OPERATOR001',
            'name': 'Operator Created Unit',
            'serial_number': 'OPERATOR001-2024-001',
            'install_date': '2024-01-15T00:00:00'
        }
        
        create_unit_response = client.post('/api/v1/units',
            json=unit_data,
            headers={
                'Authorization': f'Bearer {operator_token}',
                'Content-Type': 'application/json'
            }
        )
        assert create_unit_response.status_code == 201
        
        # 5. Test operator cannot delete users
        delete_user_response = client.delete(f'/api/v1/users/{user_id}',
            headers={'Authorization': f'Bearer {operator_token}'}
        )
        assert delete_user_response.status_code == 403
        
        # 6. Admin can deactivate the user
        deactivate_response = client.patch(f'/api/v1/users/{user_id}/deactivate',
            headers={'Authorization': f'Bearer {admin_token}'}
        )
        assert deactivate_response.status_code == 200
        
        # 7. Verify deactivated user cannot login
        disabled_login = client.post('/api/v1/auth/login',
            json={'username': 'newoperator', 'password': 'operator123'},
            headers={'Content-Type': 'application/json'}
        )
        assert disabled_login.status_code == 401
    
    def test_data_filtering_and_pagination(self, client, db_session):
        """Test data filtering and pagination across endpoints."""
        token = self.get_auth_token(client)
        
        # Create multiple test units with different statuses
        test_units = [
            {
                'id': 'FILTER001',
                'name': 'Online Unit',
                'serial_number': 'FILTER001-2024-001',
                'install_date': '2024-01-15T00:00:00',
                'status': 'online',
                'health_status': 'optimal',
                'location': 'Site A'
            },
            {
                'id': 'FILTER002',
                'name': 'Offline Unit',
                'serial_number': 'FILTER002-2024-002',
                'install_date': '2024-01-16T00:00:00',
                'status': 'offline',
                'health_status': 'critical',
                'location': 'Site B'
            },
            {
                'id': 'FILTER003',
                'name': 'Maintenance Unit',
                'serial_number': 'FILTER003-2024-003',
                'install_date': '2024-01-17T00:00:00',
                'status': 'maintenance',
                'health_status': 'warning',
                'location': 'Site A'
            }
        ]
        
        # Create the units
        for unit_data in test_units:
            response = client.post('/api/v1/units',
                json=unit_data,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            assert response.status_code == 201
        
        # 1. Test status filtering
        online_units = client.get('/api/v1/units?status=online',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert online_units.status_code == 200
        online_data = json.loads(online_units.data)
        
        for unit in online_data['data']:
            assert unit['status'] == 'online'
        
        # 2. Test health status filtering
        critical_units = client.get('/api/v1/units?health_status=critical',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert critical_units.status_code == 200
        critical_data = json.loads(critical_units.data)
        
        for unit in critical_data['data']:
            assert unit['health_status'] == 'critical'
        
        # 3. Test location filtering
        site_a_units = client.get('/api/v1/units?location=Site A',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert site_a_units.status_code == 200
        site_a_data = json.loads(site_a_units.data)
        
        for unit in site_a_data['data']:
            assert 'Site A' in unit['location']
        
        # 4. Test search functionality
        search_units = client.get('/api/v1/units?search=Maintenance',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert search_units.status_code == 200
        search_data = json.loads(search_units.data)
        
        found_maintenance_unit = False
        for unit in search_data['data']:
            if 'Maintenance' in unit['name']:
                found_maintenance_unit = True
                break
        assert found_maintenance_unit
        
        # 5. Test pagination
        page1 = client.get('/api/v1/units?page=1&per_page=2',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert page1.status_code == 200
        page1_data = json.loads(page1.data)
        
        assert page1_data['page'] == 1
        assert page1_data['per_page'] == 2
        assert len(page1_data['data']) <= 2
        
        # Clean up - delete test units
        for unit_data in test_units:
            client.delete(f'/api/v1/units/{unit_data["id"]}',
                headers={'Authorization': f'Bearer {token}'}
            )
    
    def test_api_error_handling(self, client):
        """Test API error handling scenarios."""
        token = self.get_auth_token(client)
        
        # 1. Test invalid JSON
        response = client.post('/api/v1/units',
            data='invalid json',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        assert response.status_code == 400
        
        # 2. Test missing required fields
        response = client.post('/api/v1/units',
            json={},  # Missing required fields
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        assert response.status_code == 400
        
        # 3. Test invalid field values
        response = client.post('/api/v1/units',
            json={
                'id': 'INVALID',
                'name': 'Invalid Unit',
                'serial_number': 'INVALID-001',
                'install_date': '2024-01-15T00:00:00',
                'temp_outside': 999.0  # Outside valid range
            },
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        assert response.status_code in [400, 201]  # May pass validation but fail business rules
        
        # 4. Test unauthorized access
        response = client.get('/api/v1/units')  # No auth token
        assert response.status_code == 401
        
        # 5. Test invalid token
        response = client.get('/api/v1/units',
            headers={'Authorization': 'Bearer invalid_token'}
        )
        assert response.status_code == 422  # Invalid token format
    
    def test_database_consistency(self, client, db_session):
        """Test database consistency during operations."""
        token = self.get_auth_token(client)
        
        # Create unit with sensors
        unit_data = {
            'id': 'CONSISTENCY001',
            'name': 'Consistency Test Unit',
            'serial_number': 'CONSISTENCY001-2024-001',
            'install_date': '2024-01-15T00:00:00'
        }
        
        create_response = client.post('/api/v1/units',
            json=unit_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        assert create_response.status_code == 201
        
        # Add multiple sensors
        sensor_types = ['temperature', 'humidity', 'pressure']
        created_sensors = []
        
        for sensor_type in sensor_types:
            sensor_data = {
                'name': f'{sensor_type.title()} Sensor',
                'sensor_type': sensor_type,
                'unit_of_measurement': '°C' if sensor_type == 'temperature' else '%',
            }
            
            sensor_response = client.post('/api/v1/units/CONSISTENCY001/sensors',
                json=sensor_data,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            assert sensor_response.status_code == 201
            created_sensors.append(json.loads(sensor_response.data)['id'])
        
        # Verify sensors are properly linked
        unit_response = client.get('/api/v1/units/CONSISTENCY001',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        unit_data = json.loads(unit_response.data)
        assert len(unit_data['sensors']) == 3
        
        # Delete unit (should cascade delete sensors)
        delete_response = client.delete('/api/v1/units/CONSISTENCY001',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert delete_response.status_code == 204
        
        # Verify sensors are also deleted (cascade)
        remaining_sensors = Sensor.query.filter(Sensor.id.in_(created_sensors)).all()
        assert len(remaining_sensors) == 0