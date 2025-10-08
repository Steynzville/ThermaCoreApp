"""Tests for reviewer recommendations from Batches 1-3: environment detection, OPC UA trust, and exception handling."""

import os
import pytest
import tempfile
from unittest.mock import Mock, patch
from pathlib import Path

from app.utils.environment import (
    is_production_environment, 
    is_development_environment, 
    _check_environment_mismatch
)
from app.services.opcua_service import OPCUAClient
from app import _initialize_critical_service


class TestEnvironmentMismatchDetection:
    """Test environment mismatch detection to prevent staging being classified as development."""

    def test_mismatch_detection_production_flask_env_with_debug(self):
        """Test detection of FLASK_ENV=production with DEBUG=True."""
        assert _check_environment_mismatch('production', '', True) is True

    def test_mismatch_detection_staging_app_env_with_debug(self):
        """Test detection of APP_ENV=staging with DEBUG=True."""
        assert _check_environment_mismatch('', 'staging', True) is True

    def test_mismatch_detection_prod_app_env_with_debug(self):
        """Test detection of APP_ENV=prod with DEBUG=True."""
        assert _check_environment_mismatch('', 'prod', True) is True

    def test_no_mismatch_development_with_debug(self):
        """Test no mismatch for development environment with DEBUG=True."""
        assert _check_environment_mismatch('development', '', True) is False

    def test_no_mismatch_production_without_debug(self):
        """Test no mismatch for production environment without DEBUG."""
        assert _check_environment_mismatch('production', '', False) is False

    def test_production_environment_raises_on_debug_mismatch(self):
        """Test production environment detection raises ValueError on dangerous mismatch."""
        mock_app = Mock()
        mock_app.config = {'DEBUG': True, 'TESTING': False}

        with patch.dict(os.environ, {'FLASK_ENV': 'production', 'TESTING': 'false'}):
            with pytest.raises(ValueError, match="Dangerous environment mismatch detected"):
                is_production_environment(mock_app)

    def test_development_environment_raises_on_staging_debug_mismatch(self):
        """Test development environment detection raises ValueError on staging+DEBUG mismatch."""
        mock_app = Mock()
        mock_app.config = {'DEBUG': True, 'TESTING': False}

        with patch.dict(os.environ, {'APP_ENV': 'staging', 'TESTING': 'false'}):
            with pytest.raises(ValueError, match="Dangerous environment mismatch detected"):
                is_development_environment(mock_app)


class TestOPCUACertificateLoading:
    """Test actual OPC UA certificate loading instead of just file existence checking."""

    def create_test_certificate(self) -> Path:
        """Create a test certificate for testing."""
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime

        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )

        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, u"US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"Test"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, u"Test"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Test OPC UA"),
            x509.NameAttribute(NameOID.COMMON_NAME, u"test.opcua.server"),
        ])

        certificate = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName(u"test.opcua.server"),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())

        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.pem')
        cert_pem = certificate.public_bytes(serialization.Encoding.PEM)
        temp_file.write(cert_pem)
        temp_file.close()

        return Path(temp_file.name)

    def create_expired_certificate(self) -> Path:
        """Create an expired test certificate."""
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime

        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, u"expired.opcua.server"),
        ])

        # Create expired certificate (valid from 2 days ago to 1 day ago)
        certificate = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow() - datetime.timedelta(days=2)
        ).not_valid_after(
            datetime.datetime.utcnow() - datetime.timedelta(days=1)
        ).sign(private_key, hashes.SHA256())

        temp_file = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.pem')
        cert_pem = certificate.public_bytes(serialization.Encoding.PEM)
        temp_file.write(cert_pem)
        temp_file.close()

        return Path(temp_file.name)

    def test_certificate_loading_success(self):
        """Test successful certificate loading and validation."""
        cert_path = self.create_test_certificate()

        try:
            with patch.dict(os.environ, {'FLASK_ENV': 'development', 'TESTING': 'false'}, clear=False):
                mock_app = Mock()
                mock_app.config = {
                    'FLASK_ENV': 'development',
                    'DEBUG': True,
                    'TESTING': False,
                    'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
                    'OPCUA_USERNAME': 'testuser',
                    'OPCUA_PASSWORD': 'testpass',
                    'OPCUA_SECURITY_POLICY': 'None',
                    'OPCUA_SECURITY_MODE': 'None',
                    'OPCUA_TRUST_CERT_FILE': str(cert_path)
                }

                with patch('opcua.Client') as mock_client_class:
                    mock_client = Mock()
                    mock_client_class.return_value = mock_client

                    opcua_client = OPCUAClient()
                    opcua_client.init_app(mock_app)

                    # Verify certificate was processed (no exception raised)
                    assert opcua_client.trust_cert_file == str(cert_path)

        finally:
            cert_path.unlink()  # Clean up

    def test_certificate_loading_file_not_found(self):
        """Test certificate loading fails when file doesn't exist."""
        with patch.dict(os.environ, {'FLASK_ENV': 'development', 'TESTING': 'false'}, clear=False):
            mock_app = Mock()
            mock_app.config = {
                'FLASK_ENV': 'development',
                'DEBUG': True,
                'TESTING': False,
                'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
                'OPCUA_USERNAME': 'testuser',
                'OPCUA_PASSWORD': 'testpass',
                'OPCUA_SECURITY_POLICY': 'None',
                'OPCUA_SECURITY_MODE': 'None',
                'OPCUA_TRUST_CERT_FILE': '/nonexistent/cert.pem'
            }

            with patch('opcua.Client'):
                opcua_client = OPCUAClient()

                with pytest.raises(ValueError, match="OPC UA trust certificate file does not exist"):
                    opcua_client.init_app(mock_app)

    def test_certificate_loading_expired_certificate(self):
        """Test certificate loading fails with expired certificate."""
        cert_path = self.create_expired_certificate()

        try:
            with patch.dict(os.environ, {'FLASK_ENV': 'development', 'TESTING': 'false'}, clear=False):
                mock_app = Mock()
                mock_app.config = {
                    'FLASK_ENV': 'development',
                    'DEBUG': True,
                    'TESTING': False,
                    'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
                    'OPCUA_USERNAME': 'testuser',
                    'OPCUA_PASSWORD': 'testpass',
                    'OPCUA_SECURITY_POLICY': 'None',
                    'OPCUA_SECURITY_MODE': 'None',
                    'OPCUA_TRUST_CERT_FILE': str(cert_path)
                }

                with patch('opcua.Client'):
                    opcua_client = OPCUAClient()

                    with pytest.raises(ValueError, match="Server certificate has expired"):
                        opcua_client.init_app(mock_app)

        finally:
            cert_path.unlink()

    def test_certificate_loading_invalid_format(self):
        """Test certificate loading fails with invalid certificate format."""
        # Create a file with invalid certificate content
        temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.pem')
        temp_file.write("This is not a certificate")
        temp_file.close()
        cert_path = Path(temp_file.name)

        try:
            with patch.dict(os.environ, {'FLASK_ENV': 'development', 'TESTING': 'false'}, clear=False):
                mock_app = Mock()
                mock_app.config = {
                    'FLASK_ENV': 'development',
                    'DEBUG': True,
                    'TESTING': False,
                    'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
                    'OPCUA_USERNAME': 'testuser',
                    'OPCUA_PASSWORD': 'testpass',
                    'OPCUA_SECURITY_POLICY': 'None',
                    'OPCUA_SECURITY_MODE': 'None',
                    'OPCUA_TRUST_CERT_FILE': str(cert_path)
                }

                with patch('opcua.Client'):
                    opcua_client = OPCUAClient()

                    with pytest.raises(ValueError, match="Invalid certificate format"):
                        opcua_client.init_app(mock_app)

        finally:
            cert_path.unlink()

    def test_production_requires_trust_certificate(self):
        """Test that production environment requires trust certificate configuration."""
        with patch.dict(os.environ, {'FLASK_ENV': 'production', 'TESTING': 'false'}, clear=False):
            mock_app = Mock()
            mock_app.config = {
                'FLASK_ENV': 'production',
                'DEBUG': False,
                'TESTING': False,
                'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
                'OPCUA_USERNAME': 'testuser',
                'OPCUA_PASSWORD': 'testpass',
                'OPCUA_SECURITY_POLICY': 'None',  # Use None to trigger the production security check
                'OPCUA_SECURITY_MODE': 'None',
                'OPCUA_TRUST_CERT_FILE': None  # No trust certificate
            }

            with patch('opcua.Client'):
                opcua_client = OPCUAClient()

                with pytest.raises(ValueError, match="OPC UA security must be configured in production"):
                    opcua_client.init_app(mock_app)


class TestImprovedExceptionHandling:
    """Test improved exception handling that doesn't mask actionable failures."""

    def test_service_initialization_reraises_in_testing(self):
        """Test that service initialization re-raises exceptions in testing environment."""
        mock_service = Mock()
        mock_service.init_app.side_effect = ValueError("Configuration error")

        mock_app = Mock()
        mock_app.config = {'TESTING': True, 'FLASK_ENV': 'testing'}
        mock_logger = Mock()

        with patch.dict(os.environ, {'TESTING': 'true'}):
            with pytest.raises(RuntimeError, match="initialization failed in testing"):
                _initialize_critical_service(mock_service, "Test Service", mock_app, mock_logger)

    def test_service_initialization_logs_config_errors_in_development(self):
        """Test that configuration errors are prominently logged in development."""
        mock_service = Mock()
        mock_service.init_app.side_effect = ValueError("Configuration missing")

        mock_app = Mock()
        mock_app.config = {'TESTING': False, 'DEBUG': True}
        mock_logger = Mock()

        with patch.dict(os.environ, {'FLASK_ENV': 'development', 'TESTING': 'false'}):
            result = _initialize_critical_service(mock_service, "Test Service", mock_app, mock_logger)

            assert result is False
            mock_logger.error.assert_called()
            # Verify that configuration errors are logged with error level
            error_calls = [call for call in mock_logger.error.call_args_list 
                          if "configuration error" in str(call)]
            assert len(error_calls) > 0

    def test_service_initialization_reraises_in_production(self):
        """Test that service initialization re-raises exceptions in production."""
        mock_service = Mock()
        mock_service.init_app.side_effect = ConnectionError("Cannot connect")

        mock_app = Mock()
        mock_app.config = {'TESTING': False, 'DEBUG': False}
        mock_logger = Mock()

        with patch.dict(os.environ, {'FLASK_ENV': 'production', 'TESTING': 'false'}):
            with pytest.raises(RuntimeError, match="security validation failed in production"):
                _initialize_critical_service(mock_service, "Test Service", mock_app, mock_logger)