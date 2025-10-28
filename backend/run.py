"""Main application entry point for ThermaCore SCADA API."""

import logging
import sys
from pathlib import Path

import click
from sqlalchemy import text

# Add backend to Python path for proper imports in both development and deployment
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app, db

# Create Flask application
# Flask's create_app() reads FLASK_ENV, FLASK_DEBUG, and other environment variables
# to select the appropriate configuration (see app/__init__.py lines 112-122)
app = create_app()

# Configure logging
logger = logging.getLogger(__name__)


# Initialize database on startup
def init_database_on_startup():
    """Initialize database tables and seed default data with self-healing capabilities."""
    with app.app_context():
        try:
            from app.models import (  # noqa: PLC0415 - Avoid circular import
                Permission,
                PermissionEnum,
                Role,
                RoleEnum,
                User,
            )

            # Create all database tables
            app.logger.info("Initializing database tables...")
            db.create_all()
            app.logger.info("✓ Database tables initialized")

            # Start atomic transaction for all seeding
            try:
                # Seed permissions
                app.logger.info("Seeding permissions...")
                permissions_data = [
                    (PermissionEnum.READ_UNITS, "Read access to unit information"),
                    (PermissionEnum.WRITE_UNITS, "Create and update units"),
                    (PermissionEnum.DELETE_UNITS, "Delete units"),
                    (PermissionEnum.READ_USERS, "Read access to user information"),
                    (PermissionEnum.WRITE_USERS, "Create and update users"),
                    (PermissionEnum.DELETE_USERS, "Delete users"),
                    (PermissionEnum.ADMIN_PANEL, "Access to administration panel"),
                    (PermissionEnum.REMOTE_CONTROL, "Remote control access to units"),
                ]

                permissions_map = {}
                for perm_enum, description in permissions_data:
                    permission = Permission.query.filter_by(name=perm_enum).first()
                    if not permission:
                        permission = Permission(name=perm_enum, description=description)
                        db.session.add(permission)
                        app.logger.info(f"Created permission: {perm_enum.value}")
                    permissions_map[perm_enum] = permission

                db.session.flush()  # Flush to get IDs without committing

                # Refresh all permissions from database to ensure they're attached to session
                for perm_enum in permissions_map:
                    db.session.refresh(permissions_map[perm_enum])

                app.logger.info("✓ Permissions seeded successfully")

                # Seed roles with self-healing permissions
                app.logger.info("Seeding roles with self-healing permissions...")

                # Admin role - always ensure full permissions
                admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
                if not admin_role:
                    admin_role = Role(
                        name=RoleEnum.ADMIN,
                        description="ThermaCore staff only - Full system administration with all permissions",
                    )
                    db.session.add(admin_role)
                    app.logger.info("Created admin role")
                else:
                    app.logger.info("Updating admin role permissions (self-healing)")

                admin_role.permissions = list(permissions_map.values())

                # Operator role - always ensure correct permissions
                operator_role = Role.query.filter_by(name=RoleEnum.OPERATOR).first()
                if not operator_role:
                    operator_role = Role(
                        name=RoleEnum.OPERATOR,
                        description="Client power users - Read-only access with remote control capabilities",
                    )
                    db.session.add(operator_role)
                    app.logger.info("Created operator role")
                else:
                    app.logger.info("Updating operator role permissions (self-healing)")

                operator_role.permissions = [
                    permissions_map[PermissionEnum.READ_UNITS],
                    permissions_map[PermissionEnum.READ_USERS],
                    permissions_map[PermissionEnum.REMOTE_CONTROL],
                ]

                # Viewer role - always ensure correct permissions
                viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
                if not viewer_role:
                    viewer_role = Role(
                        name=RoleEnum.VIEWER,
                        description="Client read-only users - View-only access to system data",
                    )
                    db.session.add(viewer_role)
                    app.logger.info("Created viewer role")
                else:
                    app.logger.info("Updating viewer role permissions (self-healing)")

                viewer_role.permissions = [
                    permissions_map[PermissionEnum.READ_UNITS],
                    permissions_map[PermissionEnum.READ_USERS],
                ]

                # Commit atomic transaction for permissions and roles
                db.session.commit()
                app.logger.info("✓ All roles seeded with self-healing permissions")

                # Seed default admin user if not present (separate transaction)
                admin_user = User.query.filter_by(username="Steyn_Admin").first()
                if not admin_user:
                    if not admin_role or admin_role.id is None:
                        app.logger.warning(
                            "Cannot create default admin user: admin role is missing or has no ID",
                        )
                    else:
                        app.logger.info("Creating default admin user...")
                        # Get password from environment or generate a secure random one
                        default_password = os.environ.get("DEFAULT_ADMIN_PASSWORD")
                        if not default_password:
                            import secrets
                            import string
                            # Generate a secure random password
                            alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
                            default_password = ''.join(secrets.choice(alphabet) for _ in range(16))
                            app.logger.warning("=" * 70)
                            app.logger.warning("⚠️  IMPORTANT: No DEFAULT_ADMIN_PASSWORD set!")
                            app.logger.warning(f"Generated random password: {default_password}")
                            app.logger.warning("SAVE THIS PASSWORD - It will not be shown again!")
                            app.logger.warning("=" * 70)
                        
                        admin_user = User(
                            username="Steyn_Admin",
                            email="admin@thermacore.com",
                            first_name="Admin",
                            last_name="User",
                            role_id=admin_role.id,
                            is_active=True,
                        )
                        admin_user.set_password(default_password)
                        db.session.add(admin_user)
                        db.session.commit()
                        app.logger.info("=" * 70)
                        app.logger.info("✅ Default admin user created!")
                        app.logger.info("=" * 70)
                        app.logger.info("   Username: Steyn_Admin")
                        app.logger.info("   Password: [Set via DEFAULT_ADMIN_PASSWORD or auto-generated above]")
                        app.logger.info("=" * 70)
                        app.logger.warning(
                            "Please change the password after first login"
                        )
                        app.logger.info("=" * 70)

            except Exception as e:
                app.logger.error(f"Database seeding failed: {e}")
                db.session.rollback()
                raise

        except Exception as e:
            app.logger.error(f"Database initialization failed: {e}")
            # Don't fail the app startup - database might already be initialized
            # or there might be connection issues that resolve later
            import traceback  # noqa: PLC0415 - Conditional import

            traceback.print_exc()


# Run database initialization
init_database_on_startup()


@app.cli.command()
def init_db():
    """Initialize the database with tables and seed data."""
    click.echo("Creating database tables...")

    try:
        # Read and execute schema file
        schema_path = Path(__file__).parent / "migrations" / "001_initial_schema.sql"
        with schema_path.open() as f:
            schema_sql = f.read()

        # Execute entire schema at once to preserve PL/pgSQL functions
        db.session.execute(text(schema_sql))

        db.session.commit()
        click.echo("✓ Database schema created successfully")

        # Read and execute seed data
        seed_path = Path(__file__).parent / "migrations" / "002_seed_data.sql"
        with seed_path.open() as f:
            seed_sql = f.read()

        # Execute entire seed file at once
        db.session.execute(text(seed_sql))

        db.session.commit()
        click.echo("✓ Seed data inserted successfully")
        click.echo("\nDatabase initialization completed!")
        click.echo("Default admin user: admin / admin123")

    except Exception as e:
        db.session.rollback()
        click.echo(f"✗ Error initializing database: {e}")
        sys.exit(1)


@app.cli.command()
def create_admin():
    """Create an admin user."""
    import getpass  # noqa: PLC0415 - Conditional import

    from app.models import Role, User  # noqa: PLC0415 - Avoid circular import

    admin_role = Role.query.filter_by(name="admin").first()
    if not admin_role:
        click.echo("Error: Admin role not found. Please run 'flask init-db' first.")
        return

    username = click.prompt("Enter admin username")
    email = click.prompt("Enter admin email")
    password = getpass.getpass("Enter admin password: ")

    # Check if user already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email),
    ).first()

    if existing_user:
        click.echo("Error: User with this username or email already exists.")
        return

    # Create admin user
    admin_user = User(
        username=username,
        email=email,
        first_name="Admin",
        last_name="User",
        role_id=admin_role.id,
    )
    admin_user.set_password(password)

    try:
        db.session.add(admin_user)
        db.session.commit()
        click.echo(f"✓ Admin user '{username}' created successfully!")
    except Exception as e:
        db.session.rollback()
        click.echo(f"✗ Error creating admin user: {e}")


if __name__ == "__main__":
    # Use Flask's built-in debug configuration
    # The app.debug is set by the configuration loaded in create_app
    # Flask's app.run() automatically uses app.debug when debug parameter is not specified
    #
    # IMPORTANT: This is only for development/testing purposes.
    # In production, use a production WSGI server (e.g., gunicorn, uWSGI)
    # instead of app.run(), and ensure FLASK_ENV is never set to 'development'.
    if not app.debug:
        raise RuntimeError(
            "This script is for development only. "
            "In production, use a WSGI server like Gunicorn or uWSGI.",
        )
    app.run(host="127.0.0.1", port=5000)
