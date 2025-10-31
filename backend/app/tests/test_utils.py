"""Shared test utilities for ThermaCore test suite.

This module provides common helper functions used across multiple test files
to maintain DRY (Don't Repeat Yourself) principle and reduce code duplication.
"""

import json


def unwrap_response(response):
    """Helper to extract data from standardized API response envelope.

    The API wraps responses in: {'success': bool, 'data': {...}, 'message': str, ...}
    This helper extracts the actual data payload.

    Args:
        response: Flask test client response object

    Returns:
        dict: The unwrapped data payload or the original response data
    """
    data = json.loads(response.data)
    if "data" in data and "success" in data:
        return data["data"]
    return data


def get_auth_token(client, username="admin", password="admin123"):
    """Helper method to get authentication token for testing.

    Args:
        client: Flask test client
        username: Username for login (default: "admin")
        password: Password for login (default: "admin123")

    Returns:
        str: JWT access token

    Raises:
        AssertionError: If login fails
    """
    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 200
    data = unwrap_response(response)
    return data["access_token"]
