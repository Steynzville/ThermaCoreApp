"""Unit tests for authentication functionality."""
import json
import pytest
from datetime import datetime

from app.models import User


class TestAuthentication:
    """Test authentication endpoints."""
    
    def test_login_success(self, client):
        """Test successful login."""
        response = client.post('/api/v1/auth/login', 
            json={'username': 'admin', 'password': 'admin123'},
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'user' in data
        assert data['user']['username'] == 'admin'
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post('/api/v1/auth/login',
            json={'username': 'admin', 'password': 'wrongpassword'},
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_login_missing_fields(self, client):
        """Test login with missing fields."""
        response = client.post('/api/v1/auth/login',
            json={'username': 'admin'},
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert data['error'] == 'Validation error'
    
    def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user."""
        # Deactivate admin user
        admin_user = User.query.filter_by(username='admin').first()
        admin_user.is_active = False
        db_session.commit()
        
        response = client.post('/api/v1/auth/login',
            json={'username': 'admin', 'password': 'admin123'},
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 401
        
        # Reactivate for other tests
        admin_user.is_active = True
        db_session.commit()
    
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
    
    def test_protected_endpoint_without_token(self, client):
        """Test accessing protected endpoint without token."""
        response = client.get('/api/v1/auth/me')
        assert response.status_code == 401
    
    def test_protected_endpoint_with_token(self, client):
        """Test accessing protected endpoint with valid token."""
        token = self.get_auth_token(client)
        
        response = client.get('/api/v1/auth/me',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['username'] == 'admin'
    
    def test_refresh_token(self, client):
        """Test token refresh."""
        # Get tokens
        login_response = client.post('/api/v1/auth/login',
            json={'username': 'admin', 'password': 'admin123'},
            headers={'Content-Type': 'application/json'}
        )
        
        login_data = json.loads(login_response.data)
        refresh_token = login_data['refresh_token']
        
        # Use refresh token
        response = client.post('/api/v1/auth/refresh',
            headers={'Authorization': f'Bearer {refresh_token}'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
    
    def test_change_password(self, client):
        """Test password change."""
        token = self.get_auth_token(client)
        
        response = client.post('/api/v1/auth/change-password',
            json={
                'current_password': 'admin123',
                'new_password': 'newpassword123'
            },
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 200
        
        # Verify can login with new password
        new_login = client.post('/api/v1/auth/login',
            json={'username': 'admin', 'password': 'newpassword123'},
            headers={'Content-Type': 'application/json'}
        )
        
        assert new_login.status_code == 200
        
        # Change back to original password
        new_token = json.loads(new_login.data)['access_token']
        client.post('/api/v1/auth/change-password',
            json={
                'current_password': 'newpassword123',
                'new_password': 'admin123'
            },
            headers={
                'Authorization': f'Bearer {new_token}',
                'Content-Type': 'application/json'
            }
        )
    
    def test_change_password_wrong_current(self, client):
        """Test password change with wrong current password."""
        token = self.get_auth_token(client)
        
        response = client.post('/api/v1/auth/change-password',
            json={
                'current_password': 'wrongpassword',
                'new_password': 'newpassword123'
            },
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 401
    
    def test_logout(self, client):
        """Test logout endpoint."""
        token = self.get_auth_token(client)
        
        response = client.post('/api/v1/auth/logout',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        assert response.status_code == 200


class TestUserRegistration:
    """Test user registration functionality."""
    
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
    
    def test_register_user_as_admin(self, client, db_session):
        """Test user registration by admin."""
        token = self.get_auth_token(client)
        
        # Get admin role ID
        from app.models import Role
        admin_role = Role.query.filter_by(name='admin').first()
        
        response = client.post('/api/v1/auth/register',
            json={
                'username': 'newuser',
                'email': 'newuser@test.com',
                'password': 'newpassword123',
                'first_name': 'New',
                'last_name': 'User',
                'role_id': admin_role.id
            },
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['username'] == 'newuser'
        assert data['email'] == 'newuser@test.com'
    
    def test_register_user_without_permission(self, client):
        """Test user registration without proper permissions."""
        # Try to register as viewer (no write_users permission)
        token = self.get_auth_token(client, 'viewer', 'viewer123')
        
        from app.models import Role
        viewer_role = Role.query.filter_by(name='viewer').first()
        
        response = client.post('/api/v1/auth/register',
            json={
                'username': 'unauthorizeduser',
                'email': 'unauthorized@test.com',
                'password': 'password123',
                'role_id': viewer_role.id
            },
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 403
    
    def test_register_duplicate_username(self, client):
        """Test registration with duplicate username."""
        token = self.get_auth_token(client)
        
        from app.models import Role
        admin_role = Role.query.filter_by(name='admin').first()
        
        response = client.post('/api/v1/auth/register',
            json={
                'username': 'admin',  # Already exists
                'email': 'different@test.com',
                'password': 'password123',
                'role_id': admin_role.id
            },
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'already exists' in data['error']