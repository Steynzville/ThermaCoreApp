"""Additional coverage tests for analytics routes."""

from unittest.mock import patch


def test_dashboard_summary_exception_path(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with patch("app.routes.analytics.db.session.query", side_effect=Exception("boom")):
        response = client.get("/api/v1/analytics/dashboard/summary", headers=headers)

    assert response.status_code == 500


def test_trends_with_sensor_filter_and_exception(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    filtered_response = client.get(
        "/api/v1/analytics/trends/TEST001?days=1&sensor_type=temperature",
        headers=headers,
    )
    assert filtered_response.status_code == 200

    with patch("app.routes.analytics.db.session.query", side_effect=Exception("boom")):
        error_response = client.get(
            "/api/v1/analytics/trends/TEST001?days=1",
            headers=headers,
        )
    assert error_response.status_code == 500


def test_alert_patterns_exception_path(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with patch("app.routes.analytics.db.session.query", side_effect=Exception("boom")):
        response = client.get(
            "/api/v1/analytics/alerts/patterns?days=7",
            headers=headers,
        )

    assert response.status_code == 500
