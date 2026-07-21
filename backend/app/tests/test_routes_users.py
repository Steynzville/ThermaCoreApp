"""Additional coverage tests for user routes."""

from unittest.mock import MagicMock, patch

from sqlalchemy.exc import IntegrityError


def test_update_user_invalid_token_and_missing_role(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    with patch("app.routes.users.get_current_user_id", return_value=(None, False)):
        invalid_token_response = client.put(
            "/api/v1/users/2",
            json={"first_name": "X"},
            headers=headers,
        )
    assert invalid_token_response.status_code == 401

    with (
        patch("app.routes.users.get_current_user_id", return_value=(1, True)),
        patch(
            "app.models.Role.query.get",
            return_value=None,
        ),
    ):
        response = client.put(
            "/api/v1/users/2",
            json={"role_id": 999},
            headers=headers,
        )
    assert response.status_code == 400


def test_update_user_integrityerror_fallback_message(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    generic_orig = MagicMock()
    generic_orig.__str__ = lambda *_: "other_constraint"

    with (
        patch("app.routes.users.get_current_user_id", return_value=(1, True)),
        patch(
            "app.models.db.session.commit",
            side_effect=IntegrityError("stmt", "params", generic_orig),
        ),
    ):
        response = client.put(
            "/api/v1/users/2",
            json={"first_name": "ValidName"},
            headers=headers,
        )

    assert response.status_code == 409
    assert response.get_json()["error"] == "Database constraint violation"


def test_delete_deactivate_invalid_token_and_stats(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    with patch("app.routes.users.get_current_user_id", return_value=(None, False)):
        delete_response = client.delete("/api/v1/users/2", headers=headers)
        deactivate_response = client.patch(
            "/api/v1/users/2/deactivate",
            headers=headers,
        )

    assert delete_response.status_code == 401
    assert deactivate_response.status_code == 401

    stats_response = client.get("/api/v1/users/stats", headers=headers)
    assert stats_response.status_code == 200
    data = stats_response.get_json()
    assert "total_users" in data
    assert "admin_users" in data
