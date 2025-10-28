"""Tests for tenant middleware and filtering functionality."""

import os

import pytest
from flask import g

from app import create_app, db
from app.middleware.tenant import (
    ensure_tenant_isolation,
    get_current_tenant_id,
    is_admin_with_cross_tenant_access,
    set_current_tenant,
    set_tenant_for_new_object,
    tenant_filter,
    validate_tenant_access,
)
from app.models import Role, Tenant, Unit

@pytest.fixture
def app():
    """Create application for testing."""
    os.environ["FLASK_ENV"] = "testing"
    os.environ["SECRET_KEY"] = "test-secret-key"
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"

    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    with app.app_context():
        db.create_all()

        # Create roles
        from app.models import RoleEnum

        admin_role = Role(name=RoleEnum.ADMIN)
        operator_role = Role(name=RoleEnum.OPERATOR)
        viewer_role = Role(name=RoleEnum.VIEWER)

        db.session.add_all([admin_role, operator_role, viewer_role])
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def tenants(app):
    """Create test tenants."""
    with app.app_context():
        tenant1 = Tenant(name="Company A", slug="company-a")
        tenant2 = Tenant(name="Company B", slug="company-b")
        db.session.add_all([tenant1, tenant2])
        db.session.commit()

        # Store IDs to return
        tenant1_id = tenant1.id
        tenant2_id = tenant2.id

        # Return IDs instead of objects to avoid detached instance errors
        return tenant1_id, tenant2_id

class TestTenantContext:
    """Test tenant context functions."""

    def test_set_and_get_current_tenant(self, app):
        """Test setting and getting current tenant ID."""
        with app.app_context():
            with app.test_request_context():
                # Set tenant
                set_current_tenant(123)

                # Get tenant
                tenant_id = get_current_tenant_id()
                assert tenant_id == 123

    def test_admin_cross_tenant_access(self, app):
        """Test admin cross-tenant access flag."""
        with app.app_context():
            with app.test_request_context():
                # Set admin flag
                g.is_cross_tenant_admin = True
                g.tenant_id = None

                # Check admin status
                assert is_admin_with_cross_tenant_access() is True
                assert get_current_tenant_id() is None

    def test_non_admin_tenant_access(self, app):
        """Test non-admin tenant access."""
        with app.app_context():
            with app.test_request_context():
                # Set non-admin flag
                g.is_cross_tenant_admin = False
                g.tenant_id = 456

                # Check admin status
                assert is_admin_with_cross_tenant_access() is False
                assert get_current_tenant_id() == 456

class TestTenantValidation:
    """Test tenant validation functions."""

    def test_validate_tenant_access_admin(self, app):
        """Test admin can access any tenant."""
        with app.app_context():
            with app.test_request_context():
                # Set as admin
                g.is_cross_tenant_admin = True

                # Admin can access any tenant
                assert validate_tenant_access(123) is True
                assert validate_tenant_access(456) is True

    def test_validate_tenant_access_own_tenant(self, app):
        """Test user can access their own tenant."""
        with app.app_context():
            with app.test_request_context():
                # Set as non-admin with tenant
                g.is_cross_tenant_admin = False
                g.tenant_id = 123

                # Can access own tenant
                assert validate_tenant_access(123) is True
                # Cannot access other tenant
                assert validate_tenant_access(456) is False

    def test_validate_tenant_access_no_tenant(self, app):
        """Test user without tenant cannot access any tenant."""
        with app.app_context():
            with app.test_request_context():
                # Set as non-admin without tenant
                g.is_cross_tenant_admin = False
                g.tenant_id = None

                # Cannot access any tenant
                assert validate_tenant_access(123) is False
                assert validate_tenant_access(456) is False

class TestTenantFilter:
    """Test tenant filtering on queries."""

    def test_tenant_filter_for_admin(self, app, tenants):
        """Test that admins see all data without filter."""
        tenant1_id, tenant2_id = tenants

        with app.app_context():
            # Create units in different tenants
            from datetime import datetime

            unit1 = Unit(
                id="TC001",
                name="Unit 1",
                serial_number="SN001",
                install_date=datetime.utcnow(),
                tenant_id=tenant1_id,
            )
            unit2 = Unit(
                id="TC002",
                name="Unit 2",
                serial_number="SN002",
                install_date=datetime.utcnow(),
                tenant_id=tenant2_id,
            )
            db.session.add_all([unit1, unit2])
            db.session.commit()

            with app.test_request_context():
                # Set as admin
                g.is_cross_tenant_admin = True
                g.tenant_id = None

                # Query all units
                query = Unit.query
                filtered_query = tenant_filter(query, Unit)

                # Admin sees all units
                units = filtered_query.all()
                assert len(units) == 2

    def test_tenant_filter_for_non_admin(self, app, tenants):
        """Test that non-admins only see their tenant's data."""
        tenant1_id, tenant2_id = tenants

        with app.app_context():
            # Create units in different tenants
            from datetime import datetime

            unit1 = Unit(
                id="TC001",
                name="Unit 1",
                serial_number="SN001",
                install_date=datetime.utcnow(),
                tenant_id=tenant1_id,
            )
            unit2 = Unit(
                id="TC002",
                name="Unit 2",
                serial_number="SN002",
                install_date=datetime.utcnow(),
                tenant_id=tenant2_id,
            )
            db.session.add_all([unit1, unit2])
            db.session.commit()

            with app.test_request_context():
                # Set as non-admin with tenant 1
                g.is_cross_tenant_admin = False
                g.tenant_id = tenant1_id

                # Query units
                query = Unit.query
                filtered_query = tenant_filter(query, Unit)

                # Non-admin only sees tenant 1 units
                units = filtered_query.all()
                assert len(units) == 1
                assert units[0].tenant_id == tenant1_id

class TestTenantIsolation:
    """Test tenant isolation enforcement."""

    def test_ensure_tenant_isolation_admin(self, app, tenants):
        """Test admin can access any tenant's objects."""
        tenant1_id, tenant2_id = tenants

        with app.app_context():
            from datetime import datetime

            unit = Unit(
                id="TC001",
                name="Unit 1",
                serial_number="SN001",
                install_date=datetime.utcnow(),
                tenant_id=tenant1_id,
            )
            db.session.add(unit)
            db.session.commit()

            with app.test_request_context():
                # Set as admin
                g.is_cross_tenant_admin = True

                # Admin can access any object
                assert ensure_tenant_isolation(unit) is True

    def test_ensure_tenant_isolation_own_tenant(self, app, tenants):
        """Test user can access their own tenant's objects."""
        tenant1_id, tenant2_id = tenants

        with app.app_context():
            from datetime import datetime

            unit = Unit(
                id="TC001",
                name="Unit 1",
                serial_number="SN001",
                install_date=datetime.utcnow(),
                tenant_id=tenant1_id,
            )
            db.session.add(unit)
            db.session.commit()

            with app.test_request_context():
                # Set as non-admin with tenant 1
                g.is_cross_tenant_admin = False
                g.tenant_id = tenant1_id

                # Can access own tenant's object
                assert ensure_tenant_isolation(unit) is True

    def test_ensure_tenant_isolation_different_tenant(self, app, tenants):
        """Test user cannot access different tenant's objects."""
        tenant1_id, tenant2_id = tenants

        with app.app_context():
            from datetime import datetime

            unit = Unit(
                id="TC001",
                name="Unit 1",
                serial_number="SN001",
                install_date=datetime.utcnow(),
                tenant_id=tenant1_id,
            )
            db.session.add(unit)
            db.session.commit()

            with app.test_request_context():
                # Set as non-admin with tenant 2
                g.is_cross_tenant_admin = False
                g.tenant_id = tenant2_id

                # Cannot access different tenant's object
                with pytest.raises(ValueError, match="Access denied"):
                    ensure_tenant_isolation(unit)

class TestSetTenantForNewObject:
    """Test automatic tenant assignment for new objects."""

    def test_set_tenant_for_new_object(self, app, tenants):
        """Test setting tenant for new object."""
        tenant1_id, tenant2_id = tenants

        with app.app_context():
            from datetime import datetime

            with app.test_request_context():
                # Set as non-admin with tenant 1
                g.is_cross_tenant_admin = False
                g.tenant_id = tenant1_id

                # Create new unit without tenant_id
                unit = Unit(
                    id="TC001",
                    name="Unit 1",
                    serial_number="SN001",
                    install_date=datetime.utcnow(),
                )

                # Set tenant automatically
                set_tenant_for_new_object(unit)

                # Tenant should be set
                assert unit.tenant_id == tenant1_id

    def test_set_tenant_preserves_existing(self, app, tenants):
        """Test that existing tenant_id is preserved."""
        tenant1_id, tenant2_id = tenants

        with app.app_context():
            from datetime import datetime

            with app.test_request_context():
                # Set as admin
                g.is_cross_tenant_admin = True
                g.tenant_id = None

                # Create new unit with explicit tenant_id
                unit = Unit(
                    id="TC001",
                    name="Unit 1",
                    serial_number="SN001",
                    install_date=datetime.utcnow(),
                    tenant_id=tenant2_id,
                )

                # Set tenant (should preserve existing)
                set_tenant_for_new_object(unit)

                # Tenant should be preserved
                assert unit.tenant_id == tenant2_id
