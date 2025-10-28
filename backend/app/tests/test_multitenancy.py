"""Tests for multi-tenancy models and functionality."""

import os

import pytest

from app import create_app, db
from app.models import Role, Tenant, Unit, User

@pytest.fixture
def app():
    """Create application for testing."""
    # Set test environment variables
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

class TestTenantModel:
    """Test Tenant model."""

    def test_create_tenant(self, app):
        """Test creating a tenant."""
        with app.app_context():
            tenant = Tenant(
                name="Test Company",
                slug="test-company",
                description="A test company",
                is_active=True,
            )
            db.session.add(tenant)
            db.session.commit()

            assert tenant.id is not None
            assert tenant.name == "Test Company"
            assert tenant.slug == "test-company"
            assert tenant.is_active is True

    def test_tenant_unique_name(self, app):
        """Test that tenant names must be unique."""
        with app.app_context():
            tenant1 = Tenant(name="Test Company", slug="test-company-1")
            tenant2 = Tenant(name="Test Company", slug="test-company-2")

            db.session.add(tenant1)
            db.session.commit()

            db.session.add(tenant2)
            with pytest.raises(Exception):  # IntegrityError
                db.session.commit()

    def test_tenant_relationships(self, app):
        """Test tenant relationships with users and units."""
        with app.app_context():
            # Create tenant
            tenant = Tenant(name="Test Company", slug="test-company")
            db.session.add(tenant)
            db.session.commit()

            # Create user with tenant
            admin_role = Role.query.filter_by(name="admin").first()
            user = User(
                username="testuser",
                email="test@example.com",
                role_id=admin_role.id,
                tenant_id=tenant.id,
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()

            # Verify relationship
            assert user.tenant == tenant
            assert user in tenant.users

class TestMultiTenancyUserModel:
    """Test User model with multi-tenancy."""

    def test_user_with_tenant(self, app):
        """Test creating a user with a tenant."""
        with app.app_context():
            # Create tenant
            tenant = Tenant(name="Company A", slug="company-a")
            db.session.add(tenant)
            db.session.commit()

            # Create user
            admin_role = Role.query.filter_by(name="admin").first()
            user = User(
                username="user1",
                email="user1@example.com",
                role_id=admin_role.id,
                tenant_id=tenant.id,
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()

            assert user.tenant_id == tenant.id
            assert user.tenant == tenant

    def test_user_without_tenant(self, app):
        """Test creating a user without a tenant (for backward compatibility)."""
        with app.app_context():
            admin_role = Role.query.filter_by(name="admin").first()
            user = User(
                username="user2",
                email="user2@example.com",
                role_id=admin_role.id,
                tenant_id=None,
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()

            assert user.tenant_id is None
            assert user.tenant is None

class TestMultiTenancyUnitModel:
    """Test Unit model with multi-tenancy."""

    def test_unit_with_tenant(self, app):
        """Test creating a unit with a tenant."""
        with app.app_context():
            from datetime import datetime

            # Create tenant
            tenant = Tenant(name="Company B", slug="company-b")
            db.session.add(tenant)
            db.session.commit()

            # Create unit
            unit = Unit(
                id="TC001",
                name="Test Unit",
                serial_number="SN001",
                install_date=datetime.utcnow(),
                tenant_id=tenant.id,
            )
            db.session.add(unit)
            db.session.commit()

            assert unit.tenant_id == tenant.id
            assert unit.tenant == tenant

    def test_unit_without_tenant(self, app):
        """Test creating a unit without a tenant (for backward compatibility)."""
        with app.app_context():
            from datetime import datetime

            unit = Unit(
                id="TC002",
                name="Test Unit 2",
                serial_number="SN002",
                install_date=datetime.utcnow(),
                tenant_id=None,
            )
            db.session.add(unit)
            db.session.commit()

            assert unit.tenant_id is None
            assert unit.tenant is None

class TestTenantIsolation:
    """Test tenant data isolation."""

    def test_users_in_different_tenants(self, app):
        """Test that users in different tenants are isolated."""
        with app.app_context():
            # Create two tenants
            tenant1 = Tenant(name="Company X", slug="company-x")
            tenant2 = Tenant(name="Company Y", slug="company-y")
            db.session.add_all([tenant1, tenant2])
            db.session.commit()

            # Create users in different tenants
            admin_role = Role.query.filter_by(name="admin").first()

            user1 = User(
                username="user_x",
                email="user@x.com",
                role_id=admin_role.id,
                tenant_id=tenant1.id,
            )
            user1.set_password("password123")

            user2 = User(
                username="user_y",
                email="user@y.com",
                role_id=admin_role.id,
                tenant_id=tenant2.id,
            )
            user2.set_password("password123")

            db.session.add_all([user1, user2])
            db.session.commit()

            # Query users by tenant
            tenant1_users = User.query.filter_by(tenant_id=tenant1.id).all()
            tenant2_users = User.query.filter_by(tenant_id=tenant2.id).all()

            assert len(tenant1_users) == 1
            assert len(tenant2_users) == 1
            assert user1 in tenant1_users
            assert user2 in tenant2_users
            assert user1 not in tenant2_users
            assert user2 not in tenant1_users

    def test_units_in_different_tenants(self, app):
        """Test that units in different tenants are isolated."""
        with app.app_context():
            from datetime import datetime

            # Create two tenants
            tenant1 = Tenant(name="Company X", slug="company-x")
            tenant2 = Tenant(name="Company Y", slug="company-y")
            db.session.add_all([tenant1, tenant2])
            db.session.commit()

            # Create units in different tenants
            unit1 = Unit(
                id="TX001",
                name="Unit X",
                serial_number="SNX001",
                install_date=datetime.utcnow(),
                tenant_id=tenant1.id,
            )

            unit2 = Unit(
                id="TY001",
                name="Unit Y",
                serial_number="SNY001",
                install_date=datetime.utcnow(),
                tenant_id=tenant2.id,
            )

            db.session.add_all([unit1, unit2])
            db.session.commit()

            # Query units by tenant
            tenant1_units = Unit.query.filter_by(tenant_id=tenant1.id).all()
            tenant2_units = Unit.query.filter_by(tenant_id=tenant2.id).all()

            assert len(tenant1_units) == 1
            assert len(tenant2_units) == 1
            assert unit1 in tenant1_units
            assert unit2 in tenant2_units
            assert unit1 not in tenant2_units
            assert unit2 not in tenant1_units
