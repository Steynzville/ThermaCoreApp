"""Tests for improved certificate timezone handling in OPC UA service."""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timezone, timedelta
import tempfile
from pathlib import Path

from app.services.opcua_service import OPCUAClient


class TestCertificateTimezoneHandling:
    """Test certificate datetime normalization for robust timezone handling."""
    
    def test_normalize_certificate_datetime_with_utc_aware(self):
        """Test normalization with UTC-aware datetime."""
        opcua_client = OPCUAClient()
        
        # Test UTC-aware datetime
        utc_dt = datetime(2024, 12, 25, 10, 30, 0, tzinfo=timezone.utc)
        result = opcua_client._normalize_certificate_datetime(utc_dt)
        
        assert result == utc_dt
        assert result.tzinfo == timezone.utc
    
    def test_normalize_certificate_datetime_with_other_timezone(self):
        """Test normalization with non-UTC timezone."""
        opcua_client = OPCUAClient()
        
        # Test non-UTC timezone (should be converted to UTC)
        est_tz = timezone(timedelta(hours=-5))
        est_dt = datetime(2024, 12, 25, 5, 30, 0, tzinfo=est_tz)
        result = opcua_client._normalize_certificate_datetime(est_dt)
        
        expected_utc = datetime(2024, 12, 25, 10, 30, 0, tzinfo=timezone.utc)
        assert result == expected_utc
        assert result.tzinfo == timezone.utc
    
    def test_normalize_certificate_datetime_with_naive(self):
        """Test normalization with naive datetime (assumes UTC)."""
        opcua_client = OPCUAClient()
        
        # Test naive datetime (should be treated as UTC)
        naive_dt = datetime(2024, 12, 25, 10, 30, 0)
        result = opcua_client._normalize_certificate_datetime(naive_dt)
        
        expected_utc = datetime(2024, 12, 25, 10, 30, 0, tzinfo=timezone.utc)
        assert result == expected_utc
        assert result.tzinfo == timezone.utc
    
    def test_normalize_certificate_datetime_with_iso_string_z(self):
        """Test normalization with ISO string ending in Z."""
        opcua_client = OPCUAClient()
        
        # Test ISO string with Z suffix
        iso_string = "2024-12-25T10:30:00Z"
        result = opcua_client._normalize_certificate_datetime(iso_string)
        
        expected_utc = datetime(2024, 12, 25, 10, 30, 0, tzinfo=timezone.utc)
        assert result == expected_utc
        assert result.tzinfo == timezone.utc
    
    def test_normalize_certificate_datetime_with_iso_string_offset(self):
        """Test normalization with ISO string with timezone offset."""
        opcua_client = OPCUAClient()
        
        # Test ISO string with explicit timezone
        iso_string = "2024-12-25T05:30:00-05:00"
        result = opcua_client._normalize_certificate_datetime(iso_string)
        
        expected_utc = datetime(2024, 12, 25, 10, 30, 0, tzinfo=timezone.utc)
        assert result == expected_utc
        assert result.tzinfo == timezone.utc
    
    def test_normalize_certificate_datetime_with_iso_string_no_tz(self):
        """Test normalization with ISO string without timezone (assumes UTC)."""
        opcua_client = OPCUAClient()
        
        # Test ISO string without timezone info
        iso_string = "2024-12-25T10:30:00"
        result = opcua_client._normalize_certificate_datetime(iso_string)
        
        expected_utc = datetime(2024, 12, 25, 10, 30, 0, tzinfo=timezone.utc)
        assert result == expected_utc
        assert result.tzinfo == timezone.utc
    
    def test_normalize_certificate_datetime_with_none(self):
        """Test normalization with None input (should raise ValueError)."""
        opcua_client = OPCUAClient()
        
        with pytest.raises(ValueError, match="Certificate datetime cannot be None"):
            opcua_client._normalize_certificate_datetime(None)
    
    def test_normalize_certificate_datetime_with_invalid_string(self):
        """Test normalization with invalid string format."""
        opcua_client = OPCUAClient()
        
        with pytest.raises(ValueError, match="Invalid certificate datetime format"):
            opcua_client._normalize_certificate_datetime("invalid-date-format")
    
    def test_normalize_certificate_datetime_with_invalid_type(self):
        """Test normalization with unsupported type."""
        opcua_client = OPCUAClient()
        
        with pytest.raises(ValueError, match="Unsupported certificate datetime type"):
            opcua_client._normalize_certificate_datetime(12345)


class TestSecurityPolicyFallbackConfiguration:
    """Test explicit security policy fallback configuration."""
    
    def test_fallback_disabled_by_default(self):
        """Test that fallback is disabled by default in development."""
        with patch('opcua.Client') as mock_client_class:
            with patch.dict('os.environ', {'FLASK_ENV': 'development', 'TESTING': 'false'}, clear=False):
                mock_app = Mock()
                mock_app.config = {
                    'FLASK_ENV': 'development',
                    'DEBUG': True,
                    'TESTING': False,
                    'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
                    'OPCUA_SECURITY_POLICY': 'Basic256Sha256',
                    'OPCUA_SECURITY_MODE': 'SignAndEncrypt',
                    'OPCUA_ALLOW_INSECURE_FALLBACK': False  # Explicit False
                }
                
                opcua_client = OPCUAClient()
                
                with pytest.raises(ValueError, match="requires client certificates.*Set OPCUA_ALLOW_INSECURE_FALLBACK=true"):
                    opcua_client.init_app(mock_app)
    
    def test_fallback_enabled_with_explicit_flag(self):
        """Test that fallback works when explicitly enabled."""
        with patch('opcua.Client') as mock_client_class:
            with patch.dict('os.environ', {'FLASK_ENV': 'development', 'TESTING': 'false'}, clear=False):
                mock_app = Mock()
                mock_app.config = {
                    'FLASK_ENV': 'development',
                    'DEBUG': True,
                    'TESTING': False,
                    'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
                    'OPCUA_SECURITY_POLICY': 'Basic256Sha256',
                    'OPCUA_SECURITY_MODE': 'SignAndEncrypt',
                    'OPCUA_ALLOW_INSECURE_FALLBACK': True  # Explicit True
                }
                
                opcua_client = OPCUAClient()
                opcua_client.init_app(mock_app)
                
                # Should fallback to None security
                assert opcua_client.security_policy == 'None'
                assert opcua_client.security_mode == 'None'
    
    def test_no_fallback_in_production(self):
        """Test that fallback is never allowed in production regardless of flag."""
        with patch('opcua.Client') as mock_client_class:
            with patch.dict('os.environ', {'FLASK_ENV': 'production', 'TESTING': 'false'}, clear=False):
                mock_app = Mock()
                mock_app.config = {
                    'FLASK_ENV': 'production',
                    'DEBUG': False,
                    'TESTING': False,
                    'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
                    'OPCUA_USERNAME': 'testuser',  # Add authentication
                    'OPCUA_PASSWORD': 'testpass',  # Add authentication
                    'OPCUA_SECURITY_POLICY': 'Basic256Sha256',
                    'OPCUA_SECURITY_MODE': 'SignAndEncrypt',
                    'OPCUA_ALLOW_INSECURE_FALLBACK': True  # Should be ignored in production
                }
                
                opcua_client = OPCUAClient()
                
                with pytest.raises(ValueError, match="requires client certificates in production"):
                    opcua_client.init_app(mock_app)