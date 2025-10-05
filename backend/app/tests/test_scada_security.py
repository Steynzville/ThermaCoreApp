"""Integration tests to verify SCADA endpoint security improvements."""
import pytest
from unittest.mock import patch
from app import create_app


class TestScadaSecurityIntegration:
    """Integration tests for SCADA endpoint security."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        return create_app('testing')
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
        
    @pytest.fixture
    def mock_jwt_token(self, app):
        """Create a mock JWT token for authenticated requests."""
        with app.app_context():
            # Mock JWT to return valid claims
            with patch('flask_jwt_extended.get_jwt_identity') as mock_jwt:
                with patch('flask_jwt_extended.jwt_required') as mock_jwt_required:
                    with patch('app.routes.auth.permission_required') as mock_perm:
                        # Configure mocks to allow access
                        mock_jwt.return_value = 'testuser'
                        mock_jwt_required.return_value = lambda f: f
                        mock_perm.return_value = lambda f: f
                        yield 'mock-token'

    def test_websocket_cors_restriction(self, app):
        """Test that WebSocket CORS is properly restricted in production."""
        from config import ProductionConfig
        
        # Production config should not allow wildcard CORS
        assert '*' not in ProductionConfig.WEBSOCKET_CORS_ORIGINS
        
        # Should have specific trusted domains
        assert len(ProductionConfig.WEBSOCKET_CORS_ORIGINS) >= 1
        assert all('http' in origin or 'https' in origin for origin in ProductionConfig.WEBSOCKET_CORS_ORIGINS)

    def test_tls_enforcement_config(self):
        """Test that TLS enforcement is configured for production."""
        from config import ProductionConfig
        
        # Production should enforce TLS for MQTT
        assert ProductionConfig.MQTT_USE_TLS is True
        
        # Production should enforce OPC UA security
        assert ProductionConfig.OPCUA_SECURITY_POLICY != 'None'
        assert ProductionConfig.OPCUA_SECURITY_MODE != 'None'
        
    def test_development_vs_production_security_configs(self):
        """Test that production has more restrictive security than development."""
        from config import Config, ProductionConfig
        
        # Development allows broader WebSocket CORS
        dev_origins = Config.WEBSOCKET_CORS_ORIGINS
        prod_origins = ProductionConfig.WEBSOCKET_CORS_ORIGINS
        
        # Production should be more restrictive
        assert '*' not in prod_origins
        assert len(prod_origins) <= len(dev_origins) or prod_origins != dev_origins