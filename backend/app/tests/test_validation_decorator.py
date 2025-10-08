"""Tests for the validation decorator."""
import json
import pytest
from flask import Blueprint, jsonify

from app.utils.validation import validate_json_request


class TestValidationDecorator:
    """Test the validate_json_request decorator."""
    
    @pytest.fixture
    def validation_app(self):
        """Create a fresh app with test blueprint for each test."""
        from app import create_app
        app = create_app('testing')
        
        # Register test blueprint with fresh app
        # Use a unique blueprint name per test run to avoid conflicts
        import time
        unique_bp = Blueprint(f'test_validation_{int(time.time() * 1000000)}', __name__)
        
        @unique_bp.route('/test/validate', methods=['POST'])
        @validate_json_request
        def test_endpoint():
            """Test endpoint that uses the validation decorator."""
            from flask import request
            return jsonify({'success': True, 'data': request.json}), 200
        
        @unique_bp.route('/test/validate-patch', methods=['PATCH'])
        @validate_json_request
        def test_patch_endpoint():
            """Test PATCH endpoint that uses the validation decorator."""
            from flask import request
            return jsonify({'success': True, 'data': request.json}), 200
        
        app.register_blueprint(unique_bp)
        return app
    
    @pytest.fixture
    def client(self, validation_app):
        """Create test client from validation app."""
        return validation_app.test_client()
    
    def test_valid_json_request(self, client):
        """Test that valid JSON passes through the decorator."""
        response = client.post('/test/validate',
            json={'key': 'value'},
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['key'] == 'value'
    
    def test_empty_json_request(self, client):
        """Test that empty JSON is rejected."""
        response = client.post('/test/validate',
            data='',
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Request must contain valid JSON data' in data['error']
    
    def test_malformed_json_request(self, client):
        """Test that malformed JSON is rejected."""
        response = client.post('/test/validate',
            data='{"invalid": json syntax}',
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Invalid JSON format' in data['error']
        assert 'details' in data
    
    def test_null_json_request(self, client):
        """Test that null JSON body is rejected."""
        response = client.post('/test/validate',
            data='null',
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Request must contain valid JSON data' in data['error']
    
    def test_patch_empty_json_allowed(self, client):
        """Test that PATCH requests allow empty dict JSON for partial updates."""
        response = client.patch('/test/validate-patch',
            json={},  # Empty dict is valid JSON
            headers={'Content-Type': 'application/json'}
        )
        
        # PATCH should allow empty dict - it passes through the decorator
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data'] == {}
    
    def test_patch_partial_json_allowed(self, client):
        """Test that PATCH requests allow partial JSON."""
        response = client.patch('/test/validate-patch',
            json={'partial': 'data'},
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['partial'] == 'data'


class TestUnitsValidation:
    """Test that units endpoints properly use the validation decorator."""
    
    def get_auth_token(self, client, username='admin', password='admin123'):
        """Helper method to get auth token."""
        response = client.post('/api/v1/auth/login',
            json={'username': username, 'password': password},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = json.loads(response.data)
            # Handle wrapped response
            if 'data' in data and 'access_token' in data['data']:
                return data['data']['access_token']
            elif 'access_token' in data:
                return data['access_token']
        return None
    
    def test_create_unit_empty_json(self, client):
        """Test that create_unit rejects empty/malformed JSON."""
        token = self.get_auth_token(client)
        
        response = client.post('/api/v1/units',
            data='',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        # Empty string is malformed JSON
        assert 'Invalid JSON format' in data['error']
    
    def test_create_unit_malformed_json(self, client):
        """Test that create_unit rejects malformed JSON."""
        token = self.get_auth_token(client)
        
        response = client.post('/api/v1/units',
            data='{"id": "TEST999", "name": invalid}',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Invalid JSON format' in data['error']
    
    def test_update_unit_empty_json(self, client):
        """Test that update_unit rejects empty/malformed JSON."""
        token = self.get_auth_token(client)
        
        response = client.put('/api/v1/units/TEST001',
            data='',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        # Empty string is malformed JSON
        assert 'Invalid JSON format' in data['error']
    
    def test_update_unit_malformed_json(self, client):
        """Test that update_unit rejects malformed JSON."""
        token = self.get_auth_token(client)
        
        response = client.put('/api/v1/units/TEST001',
            data='{"name": broken json}',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Invalid JSON format' in data['error']
    
    def test_create_sensor_empty_json(self, client):
        """Test that create_unit_sensor rejects empty/malformed JSON."""
        token = self.get_auth_token(client)
        
        response = client.post('/api/v1/units/TEST001/sensors',
            data='',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        # Empty string is malformed JSON
        assert 'Invalid JSON format' in data['error']
    
    def test_update_unit_status_empty_json(self, client):
        """Test that update_unit_status rejects malformed JSON (empty string)."""
        token = self.get_auth_token(client)
        
        response = client.patch('/api/v1/units/TEST001/status',
            data='',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        # Empty string is malformed JSON and should be rejected
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
