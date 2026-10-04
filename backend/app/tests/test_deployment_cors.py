"""Deployment origins must come from configuration, for both app branches."""

import pytest

from app import create_app
from config import TestingConfig


@pytest.mark.parametrize(
    "origin",
    ["https://thermacore.netlify.app", "https://thermacoreapp.netlify.app"],
)
def test_factory_uses_configured_cors_origin(monkeypatch, origin):
    monkeypatch.setattr(TestingConfig, "CORS_ORIGINS", [origin])
    monkeypatch.setenv("SKIP_EXTERNAL_SERVICES", "true")
    app = create_app("testing")
    client = app.test_client()
    response = client.options(
        "/api/v1/account/settings",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert "PUT" in response.headers["Access-Control-Allow-Methods"]
    rejected = client.options(
        "/api/v1/account/settings",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "PUT",
        },
    )
    assert "Access-Control-Allow-Origin" not in rejected.headers
