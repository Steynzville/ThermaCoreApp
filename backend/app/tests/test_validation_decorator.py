"""Tests for the validation decorator."""
import json
import pytest
from flask import Blueprint, jsonify

from app.utils.validation import validate_json_request


# Create a test blueprint for testing the decorator
test_bp = Blueprint('test_validation', __name__)


@test_bp.route('/test/validate', methods=['POST'])
@validate_json_request
def test_endpoint():
    """Test endpoint that uses the validation decorator."""
    from flask import request
    return jsonify({'success': True, 'data': request.json}), 200


class TestValidationDecorator:
    """Test the validate_json_request decorator."""
    
    @pytest.fixture(autouse=True)
    def setup(self, app):
        """Register test blueprint."""
        app.register_blueprint(test_bp)
        yield
    
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
        """Test that create_unit rejects empty JSON."""
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
        assert 'Request must contain valid JSON data' in data['error']
    
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
        """Test that update_unit rejects empty JSON."""
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
        assert 'Request must contain valid JSON data' in data['error']
    
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
        """Test that create_unit_sensor rejects empty JSON."""
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
        assert 'Request must contain valid JSON data' in data['error']
    
    def test_update_unit_status_empty_json(self, client):
        """Test that update_unit_status rejects empty JSON."""
        token = self.get_auth_token(client)
        
        response = client.patch('/api/v1/units/TEST001/status',
            data='',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Request must contain valid JSON data' in data['error']
