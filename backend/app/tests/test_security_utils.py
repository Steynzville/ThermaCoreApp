"""Tests for security utilities module."""

import re

from app.security_utils import (
    generate_secure_hex,
    generate_secure_int,
    generate_secure_password,
    generate_secure_token,
)

class TestSecurityUtils:
    """Test security utility functions."""

    def test_generate_secure_token_default_length(self):
        """Test secure token generation with default length."""
        token = generate_secure_token()
        assert token is not None
        assert len(token) > 0
        # URL-safe tokens will be longer than the input length due to base64 encoding
        assert isinstance(token, str)

    def test_generate_secure_token_custom_length(self):
        """Test secure token generation with custom length."""
        token = generate_secure_token(16)
        assert token is not None
        assert len(token) > 0
        assert isinstance(token, str)

    def test_generate_secure_token_uniqueness(self):
        """Test that secure tokens are unique."""
        tokens = [generate_secure_token() for _ in range(100)]
        # All tokens should be unique
        assert len(tokens) == len(set(tokens))

    def test_generate_secure_hex_default_length(self):
        """Test secure hex generation with default length."""
        hex_str = generate_secure_hex()
        assert hex_str is not None
        assert len(hex_str) == 64  # 32 bytes = 64 hex characters
        # Should only contain hex characters
        assert re.match(r"^[0-9a-f]+$", hex_str)

    def test_generate_secure_hex_custom_length(self):
        """Test secure hex generation with custom length."""
        hex_str = generate_secure_hex(16)
        assert hex_str is not None
        assert len(hex_str) == 32  # 16 bytes = 32 hex characters
        assert re.match(r"^[0-9a-f]+$", hex_str)

    def test_generate_secure_hex_uniqueness(self):
        """Test that secure hex strings are unique."""
        hex_strings = [generate_secure_hex() for _ in range(100)]
        # All hex strings should be unique
        assert len(hex_strings) == len(set(hex_strings))

    def test_generate_secure_password_default_length(self):
        """Test secure password generation with default length."""
        password = generate_secure_password()
        assert password is not None
        assert len(password) == 16
        # Should contain various character types
        assert any(c.islower() for c in password)
        assert any(c.isupper() for c in password)
        assert any(c.isdigit() for c in password)

    def test_generate_secure_password_custom_length(self):
        """Test secure password generation with custom length."""
        password = generate_secure_password(32)
        assert password is not None
        assert len(password) == 32

    def test_generate_secure_password_uniqueness(self):
        """Test that secure passwords are unique."""
        passwords = [generate_secure_password() for _ in range(100)]
        # All passwords should be unique
        assert len(passwords) == len(set(passwords))

    def test_generate_secure_int_default_range(self):
        """Test secure integer generation with default range."""
        for _ in range(100):
            value = generate_secure_int()
            assert 0 <= value <= 100

    def test_generate_secure_int_custom_range(self):
        """Test secure integer generation with custom range."""
        for _ in range(100):
            value = generate_secure_int(50, 150)
            assert 50 <= value <= 150

    def test_generate_secure_int_single_value(self):
        """Test secure integer generation with single value range."""
        value = generate_secure_int(42, 42)
        assert value == 42

    def test_generate_secure_int_distribution(self):
        """Test that secure integers have reasonable distribution."""
        values = [generate_secure_int(0, 10) for _ in range(1000)]
        # Should have values across the range
        unique_values = set(values)
        assert len(unique_values) >= 5  # At least half the range covered
