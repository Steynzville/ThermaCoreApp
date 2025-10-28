"""Security utilities for cryptographically secure operations.

This module provides secure alternatives to standard random operations
for security-critical use cases.
"""

import secrets
import string

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token.

    Args:
        length: Length of the token to generate (default: 32)

    Returns:
        A secure random token string using URL-safe characters
    """
    return secrets.token_urlsafe(length)

def generate_secure_hex(length: int = 32) -> str:
    """Generate a cryptographically secure random hex string.

    Args:
        length: Number of bytes to generate (default: 32)

    Returns:
        A secure random hex string
    """
    return secrets.token_hex(length)

def generate_secure_password(length: int = 16) -> str:
    """Generate a cryptographically secure random password.

    Args:
        length: Length of the password (default: 16)

    Returns:
        A secure random password with letters, digits, and punctuation.
        Guaranteed to contain at least one digit.
    """
    if length < 1:
        raise ValueError("Password length must be at least 1")

    alphabet = string.ascii_letters + string.digits + string.punctuation

    # Generate password ensuring it contains at least one digit
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(c.isdigit() for c in password):
            return password

def generate_secure_int(min_value: int = 0, max_value: int = 100) -> int:
    """Generate a cryptographically secure random integer.

    Args:
        min_value: Minimum value (inclusive)
        max_value: Maximum value (inclusive)

    Returns:
        A secure random integer in the specified range
    """
    return secrets.randbelow(max_value - min_value + 1) + min_value
