"""Additional coverage tests for historical routes."""

from unittest.mock import patch


def test_compare_units_returns_zero_summary_when_no_data(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post(
        "/api/v1/historical/compare/units",
        json={
            "unit_ids": ["TEST001"],
            "sensor_type": "nonexistent_sensor",
            "aggregation": "daily",
        },
        headers=headers,
    )

    assert response.status_code == 200
    summary = response.get_json()["comparison"]["unit_summaries"]["TEST001"]
    assert summary["data_points"] == 0


def test_historical_data_exception_path(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with patch("app.routes.historical.db.session.query", side_effect=Exception("boom")):
        response = client.get("/api/v1/historical/data/TEST001", headers=headers)

    assert response.status_code == 500


def test_historical_export_and_statistics_exception_paths(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    with patch("app.routes.historical.db.session.query", side_effect=Exception("boom")):
        export_response = client.get(
            "/api/v1/historical/export/TEST001?format=json",
            headers=headers,
        )
    assert export_response.status_code == 500

    with patch("app.routes.historical.db.session.query", side_effect=Exception("boom")):
        stats_response = client.get(
            "/api/v1/historical/statistics/TEST001?days=3",
            headers=headers,
        )
    assert stats_response.status_code == 500
