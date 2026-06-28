"""Tests for the examples routes."""

import pytest
from flask import g


def test_comprehensive_example_success(client):
    """Test comprehensive example endpoint with valid data and query parameters."""
    headers = {"Content-Type": "application/json"}
    payload = {
        "name": "Test User",
        "email": "test@thermacore.com",
        "age": 30,
        "tags": ["scada", "water"],
    }
    # Test with include_meta=True and format=json
    response = client.post(
        "/api/v1/examples/comprehensive?include_meta=true&format=json",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "processed_data" in data["data"]
    assert data["data"]["processed_data"]["name"] == "Test User"
    assert data["data"]["query_params"]["include_meta"] is True
    assert data["data"]["query_params"]["format"] == "json"
    assert "meta" in data["data"]

    # Test with include_meta=False and format=xml
    response2 = client.post(
        "/api/v1/examples/comprehensive?include_meta=false&format=xml",
        json=payload,
        headers=headers,
    )
    assert response2.status_code == 200
    data2 = response2.get_json()
    assert data2["data"]["query_params"]["include_meta"] is False
    assert data2["data"]["query_params"]["format"] == "xml"
    assert "meta" not in data2["data"]


def test_comprehensive_example_invalid_payload(client):
    """Test comprehensive example endpoint with invalid JSON payload."""
    headers = {"Content-Type": "application/json"}
    # Missing required name and invalid email
    payload = {
        "email": "not-an-email",
        "age": 200,  # Range is 1-150
    }
    response = client.post(
        "/api/v1/examples/comprehensive",
        json=payload,
        headers=headers,
    )
    # webargs / marshmallow validation failure typically returns 422 or 400
    assert response.status_code in [400, 422]


def test_comprehensive_example_invalid_query_params(client):
    """Test comprehensive example endpoint with invalid query parameters."""
    headers = {"Content-Type": "application/json"}
    payload = {
        "name": "Test User",
        "email": "test@thermacore.com",
    }
    # Invalid format parameter
    response = client.post(
        "/api/v1/examples/comprehensive?format=invalid",
        json=payload,
        headers=headers,
    )
    assert response.status_code in [400, 422]


def test_rate_limited_example(client):
    """Test rate limited example endpoint."""
    response = client.get("/api/v1/examples/rate-limited")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "strict rate limiting" in data["data"]["message"]


def test_metrics_demo(client):
    """Test metrics demo endpoint with multiple HTTP methods."""
    # Test GET
    response_get = client.get("/api/v1/examples/metrics-demo")
    assert response_get.status_code == 200
    assert response_get.get_json()["data"]["method"] == "GET"

    # Test POST
    response_post = client.post("/api/v1/examples/metrics-demo")
    assert response_post.status_code == 200
    assert response_post.get_json()["data"]["method"] == "POST"

    # Test PUT
    response_put = client.put("/api/v1/examples/metrics-demo")
    assert response_put.status_code == 200
    assert response_put.get_json()["data"]["method"] == "PUT"


def test_validation_demo_success(client):
    """Test validation demo with valid input."""
    headers = {"Content-Type": "application/json"}
    payload = {
        "name": "ThermaCore Operator",
        "email": "operator@thermacore.com",
        "age": 45,
    }
    response = client.post(
        "/api/v1/examples/validation-demo",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["validated_input"]["name"] == "ThermaCore Operator"


def test_validation_demo_failure(client):
    """Test validation demo with invalid input."""
    headers = {"Content-Type": "application/json"}
    payload = {
        "name": "",  # Too short
        "email": "invalid-email",
    }
    response = client.post(
        "/api/v1/examples/validation-demo",
        json=payload,
        headers=headers,
    )
    assert response.status_code in [400, 422]
