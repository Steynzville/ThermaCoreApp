"""Add multi-tenancy support to the database schema.

This migration adds:
1. Tenants table with client information
2. tenant_id foreign key to users table
3. tenant_id foreign key to units table
"""

from sqlalchemy import inspect, text


def validate_sql_identifier(identifier):
    """Validate SQL identifier to prevent SQL injection.

    Args:
        identifier: String to validate as SQL identifier

    Returns:
        bool: True if valid, False otherwise
    """
    if not identifier or not isinstance(identifier, str):
        return False
    # Allow alphanumeric, underscore, and dots (for schema.table)
    # Must start with letter or underscore
    if not identifier[0].isalpha() and identifier[0] != "_":
        return False
    return all(c.isalnum() or c in ("_", ".") for c in identifier)


def column_exists(connection, table_name, column_name):
    """Check if a column exists in a table.

    Args:
        connection: SQLAlchemy connection
        table_name: Name of the table
        column_name: Name of the column

    Returns:
        bool: True if column exists, False otherwise
    """
    # Validate inputs to prevent SQL injection
    if not validate_sql_identifier(table_name):
        raise ValueError(f"Invalid table name: {table_name}")
    if not validate_sql_identifier(column_name):
        raise ValueError(f"Invalid column name: {column_name}")

    inspector = inspect(connection)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def table_exists(connection, table_name):
    """Check if a table exists in the database.

    Args:
        connection: SQLAlchemy connection
        table_name: Name of the table

    Returns:
        bool: True if table exists, False otherwise
    """
    # Validate input to prevent SQL injection
    if not validate_sql_identifier(table_name):
        raise ValueError(f"Invalid table name: {table_name}")

    inspector = inspect(connection)
    return table_name in inspector.get_table_names()


def add_tenants_table(connection):
    """Create the tenants table if it doesn't exist.

    Args:
        connection: SQLAlchemy connection
    """
    if table_exists(connection, "tenants"):
        print("Tenants table already exists, skipping creation")
        return

    print("Creating tenants table...")
    connection.execute(
        text(
            """
            CREATE TABLE tenants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL UNIQUE,
                slug VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                contact_name VARCHAR(200),
                contact_email VARCHAR(120),
                contact_phone VARCHAR(50),
                address_line1 VARCHAR(255),
                address_line2 VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(100),
                postal_code VARCHAR(20),
                country VARCHAR(100),
                is_active BOOLEAN NOT NULL DEFAULT 1,
                max_users INTEGER,
                max_units INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        ),
    )

    # Create indexes
    connection.execute(text("CREATE INDEX idx_tenants_name ON tenants(name)"))
    connection.execute(text("CREATE INDEX idx_tenants_slug ON tenants(slug)"))
    connection.execute(text("CREATE INDEX idx_tenants_is_active ON tenants(is_active)"))

    print("Tenants table created successfully")


def add_tenant_id_to_users(connection):
    """Add tenant_id column to users table if it doesn't exist.

    Args:
        connection: SQLAlchemy connection
    """
    if column_exists(connection, "users", "tenant_id"):
        print("tenant_id column already exists in users table, skipping")
        return

    print("Adding tenant_id column to users table...")
    connection.execute(
        text(
            """
            ALTER TABLE users
            ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)
            """,
        ),
    )

    # Create index for tenant_id
    connection.execute(text("CREATE INDEX idx_users_tenant_id ON users(tenant_id)"))

    print("tenant_id column added to users table successfully")


def add_tenant_id_to_units(connection):
    """Add tenant_id column to units table if it doesn't exist.

    Args:
        connection: SQLAlchemy connection
    """
    if column_exists(connection, "units", "tenant_id"):
        print("tenant_id column already exists in units table, skipping")
        return

    print("Adding tenant_id column to units table...")
    connection.execute(
        text(
            """
            ALTER TABLE units
            ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)
            """,
        ),
    )

    # Create index for tenant_id
    connection.execute(text("CREATE INDEX idx_units_tenant_id ON units(tenant_id)"))

    print("tenant_id column added to units table successfully")


def create_default_tenant(connection):
    """Create a default tenant for existing data.

    Args:
        connection: SQLAlchemy connection
    """
    # Check if default tenant already exists
    result = connection.execute(
        text("SELECT COUNT(*) FROM tenants WHERE slug = 'default'"),
    )
    count = result.scalar()

    if count > 0:
        print("Default tenant already exists, skipping creation")
        return

    print("Creating default tenant...")
    connection.execute(
        text(
            """
            INSERT INTO tenants (name, slug, description, is_active, created_at, updated_at)
            VALUES (
                'Default Tenant',
                'default',
                'Default tenant for existing users and units',
                1,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            """,
        ),
    )
    print("Default tenant created successfully")


def migrate_existing_data(connection):
    """Migrate existing users and units to the default tenant.

    Args:
        connection: SQLAlchemy connection
    """
    # Get default tenant ID
    result = connection.execute(
        text("SELECT id FROM tenants WHERE slug = 'default'"),
    )
    tenant_row = result.fetchone()

    if not tenant_row:
        print("Default tenant not found, skipping data migration")
        return

    default_tenant_id = tenant_row[0]

    # Update users with NULL tenant_id
    result = connection.execute(
        text(
            """
            UPDATE users
            SET tenant_id = :tenant_id
            WHERE tenant_id IS NULL
            """,
        ),
        {"tenant_id": default_tenant_id},
    )
    users_updated = result.rowcount
    print(f"Updated {users_updated} users with default tenant")

    # Update units with NULL tenant_id
    result = connection.execute(
        text(
            """
            UPDATE units
            SET tenant_id = :tenant_id
            WHERE tenant_id IS NULL
            """,
        ),
        {"tenant_id": default_tenant_id},
    )
    units_updated = result.rowcount
    print(f"Updated {units_updated} units with default tenant")


def run_migration(connection):
    """Run the multi-tenancy migration.

    Args:
        connection: SQLAlchemy connection
    """
    print("Starting multi-tenancy migration...")

    try:
        # Step 1: Create tenants table
        add_tenants_table(connection)

        # Step 2: Add tenant_id to users table
        add_tenant_id_to_users(connection)

        # Step 3: Add tenant_id to units table
        add_tenant_id_to_units(connection)

        # Step 4: Create default tenant
        create_default_tenant(connection)

        # Step 5: Migrate existing data
        migrate_existing_data(connection)

        # Commit the transaction
        connection.commit()

        print("Multi-tenancy migration completed successfully!")

    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
        raise


if __name__ == "__main__":
    import sys

    # This script is meant to be run from the Flask application context
    # Example usage:
    # from app import create_app, db
    # app = create_app()
    # with app.app_context():
    #     with db.engine.connect() as connection:
    #         run_migration(connection)
    print(
        "ERROR: This migration script should be run from the Flask application context"
    )
    print("See the script for example usage")
    sys.exit(1)
