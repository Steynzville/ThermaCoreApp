"""Tests for tenant management routes."""

from unittest.mock import patch

from sqlalchemy.exc import IntegrityError

# API prefix for all tenant endpoints
API_PREFIX = "/api/v1"


class TestCreateTenantErrors:
    """Test cases for tenant creation error paths."""

    def test_create_tenant_validation_error(self, client, auth_headers):
        """Test that invalid tenant data returns validation error."""
        # Missing required "name" and "slug"
        resp = client.post(
            f"{API_PREFIX}/tenants",
            json={"description": "no name or slug"},
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert "Validation error" in resp.get_json()["error"]

    def test_create_tenant_duplicate_slug(self, client, auth_headers, db_session):
        """Test that duplicate tenant slug returns conflict error."""
        with patch(
            "app.routes.tenants.db.session.commit",
            side_effect=IntegrityError("", "", ""),
        ):
            resp = client.post(
                f"{API_PREFIX}/tenants",
                json={"name": "Acme", "slug": "acme"},
                headers=auth_headers,
            )
        assert resp.status_code == 409
        assert "already exists" in resp.get_json()["error"]


class TestUpdateTenantErrors:
    """Test cases for tenant update error paths."""

    def test_update_tenant_validation_error(self, client, auth_headers, seed_tenant):
        """Test that invalid update data returns validation error."""
        resp = client.patch(
            f"{API_PREFIX}/tenants/{seed_tenant.id}",
            json={"contact_email": "not-an-email"},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_update_tenant_not_found(self, client, auth_headers):
        """Test that updating non-existent tenant returns 404."""
        resp = client.patch(
            f"{API_PREFIX}/tenants/999999",
            json={"name": "Doesn't matter"},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_update_tenant_duplicate_slug(self, client, auth_headers, seed_tenant):
        """Test that duplicate slug on update returns conflict error."""
        with patch(
            "app.routes.tenants.db.session.commit",
            side_effect=IntegrityError("", "", ""),
        ):
            resp = client.patch(
                f"{API_PREFIX}/tenants/{seed_tenant.id}",
                json={"slug": "taken-slug"},
                headers=auth_headers,
            )
        assert resp.status_code == 409

    def test_update_tenant_put_requires_all_fields(
        self, client, auth_headers, seed_tenant
    ):
        """Test that PUT requires all required fields."""
        # Missing 'slug' field
        resp = client.put(
            f"{API_PREFIX}/tenants/{seed_tenant.id}",
            json={"name": "New Name Only"},
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert "Validation error" in resp.get_json()["error"]

    def test_update_tenant_put_full_replacement(
        self, client, auth_headers, seed_tenant
    ):
        """Test that PUT performs full replacement with all required fields."""
        resp = client.put(
            f"{API_PREFIX}/tenants/{seed_tenant.id}",
            json={
                "name": "New Name",
                "slug": "new-slug",
                "is_active": True,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["name"] == "New Name"
        assert data["slug"] == "new-slug"

    def test_update_tenant_patch_allows_partial(
        self, client, auth_headers, seed_tenant
    ):
        """Test that PATCH allows partial updates."""
        resp = client.patch(
            f"{API_PREFIX}/tenants/{seed_tenant.id}",
            json={"name": "Updated Name"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Updated Name"


class TestDeleteTenantErrors:
    """Test cases for tenant deletion error paths."""

    def test_delete_tenant_blocked_by_users(
        self, client, auth_headers, seed_tenant, seed_user
    ):
        """Test that tenant with associated users cannot be deleted."""
        resp = client.delete(
            f"{API_PREFIX}/tenants/{seed_tenant.id}",
            headers=auth_headers,
        )
        assert resp.status_code == 409
        assert "associated users" in resp.get_json()["error"]

    def test_delete_tenant_blocked_by_units(
        self, client, auth_headers, seed_tenant, seed_unit
    ):
        """Test that tenant with associated units cannot be deleted."""
        resp = client.delete(
            f"{API_PREFIX}/tenants/{seed_tenant.id}",
            headers=auth_headers,
        )
        assert resp.status_code == 409
        assert "associated units" in resp.get_json()["error"]

    def test_delete_tenant_not_found(self, client, auth_headers):
        """Test that deleting non-existent tenant returns 404."""
        resp = client.delete(
            f"{API_PREFIX}/tenants/999999",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_delete_tenant_integrity_error(self, client, auth_headers, seed_tenant):
        """Test that integrity error on delete returns 409."""
        with patch(
            "app.routes.tenants.db.session.commit",
            side_effect=IntegrityError("", "", ""),
        ):
            resp = client.delete(
                f"{API_PREFIX}/tenants/{seed_tenant.id}",
                headers=auth_headers,
            )
        assert resp.status_code == 409
        assert "existing related data" in resp.get_json()["error"]

    def test_delete_tenant_generic_failure(self, client, auth_headers, seed_tenant):
        """Test that generic database failure returns 500."""
        with patch(
            "app.routes.tenants.db.session.commit",
            side_effect=Exception("Unexpected error"),
        ):
            resp = client.delete(
                f"{API_PREFIX}/tenants/{seed_tenant.id}",
                headers=auth_headers,
            )
        assert resp.status_code == 500
        assert "unexpected error" in resp.get_json()["error"].lower()

    def test_delete_tenant_success(self, client, auth_headers, seed_tenant):
        """Test successful tenant deletion."""
        resp = client.delete(
            f"{API_PREFIX}/tenants/{seed_tenant.id}",
            headers=auth_headers,
        )
        assert resp.status_code == 204


class TestCurrentTenant:
    """Test cases for current tenant endpoint."""

    def test_get_current_tenant_admin_cross_tenant(
        self, client, admin_no_tenant_headers
    ):
        """Test admin with cross-tenant access returns null tenant."""
        resp = client.get(
            f"{API_PREFIX}/tenants/current",
            headers=admin_no_tenant_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["data"] is None
        assert "cross-tenant" in body["message"]

    def test_get_current_tenant_no_tenant_no_admin(self, client, no_tenant_headers):
        """Test user without tenant returns 404."""
        resp = client.get(
            f"{API_PREFIX}/tenants/current",
            headers=no_tenant_headers,
        )
        assert resp.status_code == 404

    def test_get_current_tenant_success(
        self, client, tenant_scoped_headers, seed_tenant
    ):
        """Test successful retrieval of current tenant."""
        resp = client.get(
            f"{API_PREFIX}/tenants/current",
            headers=tenant_scoped_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["id"] == seed_tenant.id


class TestSwitchTenant:
    """Test cases for tenant switching endpoint."""

    def test_switch_tenant_to_valid_tenant(self, client, auth_headers, seed_tenant):
        """Test switching to a valid tenant."""
        resp = client.post(
            f"{API_PREFIX}/tenants/switch",
            json={"tenant_id": seed_tenant.id},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert "Switched to tenant" in resp.get_json()["message"]
        assert seed_tenant.name in resp.get_json()["message"]

    def test_switch_tenant_to_none(self, client, auth_headers):
        """Test switching to cross-tenant access (null tenant_id)."""
        resp = client.post(
            f"{API_PREFIX}/tenants/switch",
            json={"tenant_id": None},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert "cross-tenant access" in resp.get_json()["message"]

    def test_switch_tenant_not_found(self, client, auth_headers):
        """Test switching to non-existent tenant returns 404."""
        resp = client.post(
            f"{API_PREFIX}/tenants/switch",
            json={"tenant_id": 999999},
            headers=auth_headers,
        )
        assert resp.status_code == 404
        assert "not found" in resp.get_json()["error"]

    def test_switch_tenant_to_inactive(
        self, client, auth_headers, seed_inactive_tenant
    ):
        """Test switching to inactive tenant returns 400."""
        resp = client.post(
            f"{API_PREFIX}/tenants/switch",
            json={"tenant_id": seed_inactive_tenant.id},
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert "not active" in resp.get_json()["error"]

    def test_switch_tenant_invalid_data(self, client, auth_headers):
        """Test switch with invalid data returns validation error."""
        resp = client.post(
            f"{API_PREFIX}/tenants/switch",
            json={"tenant_id": "not-an-integer"},
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert "Validation error" in resp.get_json()["error"]

    def test_switch_tenant_requires_permission(self, client, non_admin_headers):
        """Test that switch endpoint requires admin permissions."""
        resp = client.post(
            f"{API_PREFIX}/tenants/switch",
            json={"tenant_id": 1},
            headers=non_admin_headers,
        )
        assert resp.status_code == 403


class TestListAndGetTenant:
    """Test cases for listing and retrieving tenants."""

    def test_get_tenants_active_only_filter(
        self, client, auth_headers, seed_tenant, seed_inactive_tenant
    ):
        """Test that active_only filter returns only active tenants."""
        resp = client.get(
            f"{API_PREFIX}/tenants?active_only=true",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.get_json()["data"]]
        assert seed_tenant.id in ids
        assert seed_inactive_tenant.id not in ids

    def test_get_tenants_pagination_valid(self, client, auth_headers):
        """Test that valid pagination parameters work correctly."""
        resp = client.get(
            f"{API_PREFIX}/tenants?page=1&per_page=10",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["page"] == 1
        assert body["per_page"] == 10

    def test_get_tenants_pagination_invalid_page(self, client, auth_headers):
        """Test that invalid page parameter returns 400."""
        resp = client.get(
            f"{API_PREFIX}/tenants?page=0",
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert "Page must be at least 1" in resp.get_json()["error"]

    def test_get_tenants_pagination_invalid_per_page(self, client, auth_headers):
        """Test that invalid per_page parameter returns 400."""
        resp = client.get(
            f"{API_PREFIX}/tenants?per_page=0",
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert "Per page must be between 1 and 100" in resp.get_json()["error"]

    def test_get_tenants_pagination_oversized_per_page(self, client, auth_headers):
        """Test that oversized per_page parameter returns 400."""
        resp = client.get(
            f"{API_PREFIX}/tenants?per_page=200",
            headers=auth_headers,
        )
        assert resp.status_code == 400
        assert "Per page must be between 1 and 100" in resp.get_json()["error"]

    def test_get_tenant_includes_stats(
        self, client, auth_headers, seed_tenant, seed_user, seed_unit
    ):
        """Test that tenant details include user and unit counts."""
        resp = client.get(
            f"{API_PREFIX}/tenants/{seed_tenant.id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        stats = resp.get_json()["data"]["stats"]
        assert stats["user_count"] >= 1
        assert stats["unit_count"] >= 1

    def test_get_tenant_not_found(self, client, auth_headers):
        """Test that retrieving non-existent tenant returns 404."""
        resp = client.get(
            f"{API_PREFIX}/tenants/999999",
            headers=auth_headers,
        )
        assert resp.status_code == 404
