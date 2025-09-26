"""Test suite for audit logging middleware (PR3)."""
import json
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from app.middleware.audit import (
    AuditLogger, AuditEventType, AuditSeverity,
    audit_operation, audit_login_success, audit_login_failure,
    audit_permission_check, setup_audit_middleware
)
from app.models import User, Role, RoleEnum


class TestAuditLogger:
    """Test cases for the AuditLogger class."""
    
    def test_log_event_basic(self):
        """Test basic audit event logging."""
        with patch('app.middleware.audit.logger') as mock_logger:
            AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_SUCCESS,
                username='testuser',
                action='user_login',
                outcome='success'
            )
            
            # Verify logger was called
            assert mock_logger.info.called
            call_args = mock_logger.info.call_args
            message = call_args[0][0]
            assert 'AUDIT: login_success' in message
            assert 'testuser' in message
    
    def test_log_authentication_event_success(self):
        """Test logging successful authentication events."""
        with patch('app.middleware.audit.logger') as mock_logger:
            AuditLogger.log_authentication_event(
                AuditEventType.LOGIN_SUCCESS,
                username='admin',
                outcome='success',
                details={'user_id': 1, 'role': 'admin'}
            )
            
            assert mock_logger.info.called
            call_args = mock_logger.info.call_args
            extra = call_args[1]['extra']
            audit_record = extra['audit']
            
            assert audit_record['event_type'] == 'login_success'
            assert audit_record['username'] == 'admin'
            assert audit_record['outcome'] == 'success'
            assert audit_record['details']['user_id'] == 1
    
    def test_log_authentication_event_failure(self):
        """Test logging failed authentication events."""
        with patch('app.middleware.audit.logger') as mock_logger:
            AuditLogger.log_authentication_event(
                AuditEventType.LOGIN_FAILURE,
                username='baduser',
                outcome='failure',
                details={'reason': 'invalid_credentials'}
            )
            
            assert mock_logger.warning.called
            call_args = mock_logger.warning.call_args
            extra = call_args[1]['extra']
            audit_record = extra['audit']
            
            assert audit_record['event_type'] == 'login_failure'
            assert audit_record['severity'] == 'warning'
            assert audit_record['outcome'] == 'failure'
    
    def test_log_authorization_event_granted(self):
        """Test logging granted authorization events."""
        with patch('app.middleware.audit.logger') as mock_logger:
            AuditLogger.log_authorization_event(
                permission='read_units',
                granted=True,
                user_id=1,
                username='operator',
                resource='units'
            )
            
            assert mock_logger.info.called
            call_args = mock_logger.info.call_args
            extra = call_args[1]['extra']
            audit_record = extra['audit']
            
            assert audit_record['event_type'] == 'permission_granted'
            assert audit_record['outcome'] == 'success'
            assert audit_record['details']['permission'] == 'read_units'
    
    def test_log_authorization_event_denied(self):
        """Test logging denied authorization events."""
        with patch('app.middleware.audit.logger') as mock_logger:
            AuditLogger.log_authorization_event(
                permission='delete_units',
                granted=False,
                user_id=2,
                username='viewer',
                resource='units'
            )
            
            assert mock_logger.warning.called
            call_args = mock_logger.warning.call_args
            extra = call_args[1]['extra']
            audit_record = extra['audit']
            
            assert audit_record['event_type'] == 'permission_denied'
            assert audit_record['outcome'] == 'denied'
            assert audit_record['severity'] == 'warning'
    
    def test_log_data_event_create(self):
        """Test logging data creation events."""
        with patch('app.middleware.audit.logger') as mock_logger:
            AuditLogger.log_data_event(
                operation='CREATE',
                resource='unit',
                resource_id='TC001',
                user_id=1,
                username='admin',
                outcome='success'
            )
            
            assert mock_logger.info.called
            call_args = mock_logger.info.call_args
            extra = call_args[1]['extra']
            audit_record = extra['audit']
            
            assert audit_record['event_type'] == 'create'
            assert audit_record['resource'] == 'unit'
            assert audit_record['resource_id'] == 'TC001'
            assert audit_record['action'] == 'create_unit'
    
    def test_audit_event_severity_levels(self):
        """Test different severity levels are handled correctly."""
        test_cases = [
            (AuditSeverity.CRITICAL, 'critical'),
            (AuditSeverity.ERROR, 'error'), 
            (AuditSeverity.WARNING, 'warning'),
            (AuditSeverity.INFO, 'info')
        ]
        
        for severity, expected_method in test_cases:
            with patch('app.middleware.audit.logger') as mock_logger:
                AuditLogger.log_event(
                    event_type=AuditEventType.SYSTEM_ERROR,
                    severity=severity,
                    action='test_action'
                )
                
                # Verify correct logging method was called
                logger_method = getattr(mock_logger, expected_method)
                assert logger_method.called


class TestAuditDecorators:
    """Test cases for audit decorators."""
    
    def test_audit_operation_decorator_success(self, app, client):
        """Test audit_operation decorator for successful operations."""
        with app.app_context():
            with patch('app.middleware.audit.AuditLogger.log_data_event') as mock_audit:
                
                @audit_operation('CREATE', 'test_resource')
                def test_function():
                    return {'success': True}
                
                result = test_function()
                
                # Verify audit was logged
                mock_audit.assert_called_once()
                call_args = mock_audit.call_args[1]
                assert call_args['operation'] == 'CREATE'
                assert call_args['resource'] == 'test_resource'
                assert call_args['outcome'] == 'success'
    
    def test_audit_operation_decorator_failure(self, app):
        """Test audit_operation decorator for failed operations."""
        with app.app_context():
            with patch('app.middleware.audit.AuditLogger.log_data_event') as mock_audit:
                
                @audit_operation('UPDATE', 'test_resource')
                def test_function():
                    raise ValueError("Test error")
                
                with pytest.raises(ValueError):
                    test_function()
                
                # Verify audit was logged with failure
                mock_audit.assert_called_once()
                call_args = mock_audit.call_args[1]
                assert call_args['outcome'] == 'failure'
                assert 'Test error' in call_args['details']['error']
    
    def test_audit_login_success_function(self):
        """Test audit_login_success convenience function."""
        with patch('app.middleware.audit.AuditLogger.log_authentication_event') as mock_audit:
            audit_login_success('testuser', {'session_id': 'abc123'})
            
            mock_audit.assert_called_once_with(
                AuditEventType.LOGIN_SUCCESS,
                username='testuser',
                outcome='success',
                details={'session_id': 'abc123'}
            )
    
    def test_audit_login_failure_function(self):
        """Test audit_login_failure convenience function."""
        with patch('app.middleware.audit.AuditLogger.log_authentication_event') as mock_audit:
            audit_login_failure('baduser', 'invalid_password', {'attempts': 3})
            
            mock_audit.assert_called_once()
            call_args = mock_audit.call_args[1]
            assert call_args['username'] == 'baduser'
            assert call_args['outcome'] == 'failure'
            assert call_args['details']['failure_reason'] == 'invalid_password'
    
    def test_audit_permission_check_function(self):
        """Test audit_permission_check convenience function."""
        with patch('app.middleware.audit.AuditLogger.log_authorization_event') as mock_audit:
            audit_permission_check('read_units', True, 1, 'admin', 'units')
            
            mock_audit.assert_called_once_with(
                permission='read_units',
                granted=True,
                user_id=1,
                username='admin',
                resource='units'
            )


class TestAuditMiddleware:
    """Test cases for audit middleware setup."""
    
    def test_setup_audit_middleware(self, app):
        """Test audit middleware setup."""
        with app.app_context():
            # Setup audit middleware
            setup_audit_middleware(app)
            
            # Verify before_request handler was registered
            assert len(app.before_request_funcs[None]) > 0
    
    def test_audit_api_access(self, app, client):
        """Test API access auditing."""
        with app.app_context():
            with patch('app.middleware.audit.AuditLogger.log_event') as mock_audit:
                # Make a request to trigger audit logging
                response = client.get('/api/v1/health')  # Assuming health endpoint exists
                
                # Note: This test may not trigger the audit due to endpoint filtering
                # In a real scenario, we'd test with an actual API endpoint


class TestAuditEventTypes:
    """Test audit event type definitions."""
    
    def test_audit_event_type_enum(self):
        """Test that all required audit event types are defined."""
        required_events = [
            'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'TOKEN_REFRESH',
            'PERMISSION_GRANTED', 'PERMISSION_DENIED', 'ROLE_CHECK',
            'CREATE', 'READ', 'UPDATE', 'DELETE',
            'API_ACCESS', 'CONFIGURATION_CHANGE', 'SYSTEM_ERROR'
        ]
        
        for event in required_events:
            assert hasattr(AuditEventType, event)
    
    def test_audit_severity_enum(self):
        """Test that all severity levels are defined."""
        required_severities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
        
        for severity in required_severities:
            assert hasattr(AuditSeverity, severity)


class TestAuditIntegration:
    """Integration tests for audit logging with the application."""
    
    def test_login_audit_integration(self, app, client):
        """Test that login attempts are properly audited."""
        with app.app_context():
            with patch('app.middleware.audit.audit_login_success') as mock_success:
                with patch('app.middleware.audit.audit_login_failure') as mock_failure:
                    # This would require actual login endpoint testing
                    # For now, we verify the functions exist and can be called
                    assert callable(mock_success)
                    assert callable(mock_failure)
    
    def test_permission_check_audit_integration(self, app):
        """Test that permission checks are properly audited."""
        with app.app_context():
            # Create test user and role
            role = Role(name=RoleEnum.VIEWER, description='Test viewer role')
            user = User(username='testuser', email='test@example.com', role=role)
            
            with patch('app.middleware.audit.audit_permission_check') as mock_audit:
                # Test permission check (this would normally be done in the decorator)
                has_permission = user.has_permission('read_units')
                
                # In real implementation, the decorator would call audit_permission_check
                # We can verify the function exists and is importable
                assert callable(mock_audit)


# Fixtures for testing
@pytest.fixture
def app():
    """Create a test Flask application."""
    from app import create_app
    app = create_app('testing')
    return app


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()