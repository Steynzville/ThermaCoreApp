"""Auto-migration utility for Render free plan without shell access.

This module provides automatic schema migration capabilities for environments
where shell access is not available (e.g., Render free plan). It checks for
missing columns and creates them via raw SQL when needed.
"""

import logging

from sqlalchemy import inspect, text

from app.utils.user_permissions_fix import fix_user_permissions

logger = logging.getLogger(__name__)


def column_exists(engine, table_name, column_name):
    """Check if a column exists in a table.

    Args:
        engine: SQLAlchemy engine instance
        table_name: Name of the table to check
        column_name: Name of the column to check

    Returns:
        bool: True if column exists, False otherwise

    """
    try:
        inspector = inspect(engine)
        columns = [col["name"] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception:
        logger.exception("Error checking if column exists")
        return False


def add_password_reset_columns(engine):
    """Add password reset columns to users table if they don't exist.

    This function adds:
    - reset_token: VARCHAR(255) for storing password reset tokens
    - reset_token_expires: TIMESTAMPTZ for token expiration
    - Index on reset_token for faster lookups

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if columns were added or already exist, False on error

    """
    try:
        table_name = "users"
        columns_added = []

        # Check and add reset_token column
        if not column_exists(engine, table_name, "reset_token"):
            logger.info(
                f"Column 'reset_token' not found in '{table_name}' table. Adding...",
            )
            with engine.begin() as conn:
                # PostgreSQL syntax with IF NOT EXISTS for safety
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)",
                    ),
                )
            columns_added.append("reset_token")
            logger.info("✓ Column 'reset_token' added successfully")
        else:
            logger.info("✓ Column 'reset_token' already exists")

        # Check and add reset_token_expires column
        if not column_exists(engine, table_name, "reset_token_expires"):
            logger.info(
                f"Column 'reset_token_expires' not found in '{table_name}' table. Adding...",
            )
            with engine.begin() as conn:
                # Use TIMESTAMPTZ for PostgreSQL (timezone-aware)
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ",
                    ),
                )
            columns_added.append("reset_token_expires")
            logger.info("✓ Column 'reset_token_expires' added successfully")
        else:
            logger.info("✓ Column 'reset_token_expires' already exists")

        # Check and create index on reset_token if it doesn't exist
        # Note: We check index existence via a query rather than inspector
        # because index inspection can be database-specific
        try:
            with engine.begin() as conn:
                # Check if index exists (PostgreSQL syntax)
                result = conn.execute(
                    text(
                        "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_reset_token'",
                    ),
                )
                index_exists = result.fetchone() is not None

                if not index_exists:
                    logger.info("Creating index 'idx_users_reset_token'...")
                    conn.execute(
                        text(
                            "CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)",
                        ),
                    )
                    logger.info("✓ Index 'idx_users_reset_token' created successfully")
                else:
                    logger.info("✓ Index 'idx_users_reset_token' already exists")
        except Exception:
            # Index creation is not critical - log warning but continue
            logger.exception("Could not create/verify index")

        if columns_added:
            logger.info(f"Auto-migration complete: Added columns {columns_added}")
        else:
            logger.info("Auto-migration complete: All required columns already exist")

        return True

    except Exception:
        logger.exception("Error during auto-migration")
        return False


def add_permissions_column(engine):
    """Add permissions column to users table if it doesn't exist.

    This function adds:
    - permissions: JSON column for storing direct user permissions

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if column was added or already exists, False on error

    """
    try:
        table_name = "users"

        # Check and add permissions column
        if not column_exists(engine, table_name, "permissions"):
            logger.info(
                f"Column 'permissions' not found in '{table_name}' table. Adding...",
            )
            with engine.begin() as conn:
                # Add JSON column for PostgreSQL, TEXT for SQLite compatibility
                # PostgreSQL will use JSONB for better performance
                if engine.dialect.name == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB",
                        ),
                    )
                elif engine.dialect.name == "sqlite":
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN permissions TEXT",
                        ),
                    )
                else:
                    logger.error(f"Unsupported database dialect: {engine.dialect.name}")
                    return False
            logger.info("✓ Column 'permissions' added successfully")
        else:
            logger.info("✓ Column 'permissions' already exists")

        return True

    except Exception:
        logger.exception("Error adding permissions column")
        return False


def update_emergency_admin_permissions(engine):
    """Update emergency_admin user with comprehensive permissions.

    This ensures the emergency_admin has all necessary permissions for
    full administrative access, including user creation.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if update successful or user doesn't exist, False on error

    """
    try:
        import json  # noqa: PLC0415 - Standard library, conditional usage

        # Import centralized permissions constant from models
        from app.models import EMERGENCY_ADMIN_PERMISSIONS

        # Use centralized emergency admin permissions constant
        # Ensures consistency across auth endpoint, auto-migration, and permission checks
        emergency_permissions = json.dumps(EMERGENCY_ADMIN_PERMISSIONS)

        with engine.begin() as conn:
            # Check if emergency_admin user exists
            result = conn.execute(
                text(
                    "SELECT id FROM users WHERE username = 'emergency_admin'",
                ),
            )
            existing_user = result.fetchone()

            if existing_user:
                logger.info(
                    "Updating emergency_admin user with comprehensive permissions",
                )
                conn.execute(
                    text(
                        """
                    UPDATE users
                    SET permissions = :permissions,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE username = 'emergency_admin'
                    """,
                    ),
                    {
                        "permissions": emergency_permissions,
                    },
                )
                logger.info("✓ Emergency admin permissions updated successfully")
            else:
                logger.info(
                    "✓ Emergency admin user does not exist yet (will be created when needed)",
                )

        return True

    except Exception:
        logger.exception("Error updating emergency admin permissions")
        return False


def add_user_approval_columns(engine):
    """Add user approval workflow columns to users table if they don't exist.

    This function adds:
    - registration_status: VARCHAR(20) for tracking approval status (default 'approved')
    - approval_date: TIMESTAMP for when the user was approved
    - approved_by: INTEGER for tracking which admin approved the user
    - rejection_reason: TEXT for documenting rejection reasons

    IMPORTANT: Existing users are automatically set to 'approved' status to prevent
    any access disruption. This ensures a safe migration with zero impact.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if columns were added or already exist, False on error

    """
    try:
        table_name = "users"
        columns_added = []

        # Check and add registration_status column
        if not column_exists(engine, table_name, "registration_status"):
            logger.info(
                f"Column 'registration_status' not found in '{table_name}' table. Adding...",
            )
            with engine.begin() as conn:
                # Add with default 'approved' to ensure existing users maintain access
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'approved'",
                    ),
                )
            columns_added.append("registration_status")
            logger.info("✓ Column 'registration_status' added successfully")
        else:
            logger.info("✓ Column 'registration_status' already exists")

        # Check and add approval_date column
        if not column_exists(engine, table_name, "approval_date"):
            logger.info(
                f"Column 'approval_date' not found in '{table_name}' table. Adding...",
            )
            with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP",
                        ),
                    )
                else:  # SQLite
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN approval_date TIMESTAMP",
                        ),
                    )
            columns_added.append("approval_date")
            logger.info("✓ Column 'approval_date' added successfully")
        else:
            logger.info("✓ Column 'approval_date' already exists")

        # Check and add approved_by column
        if not column_exists(engine, table_name, "approved_by"):
            logger.info(
                f"Column 'approved_by' not found in '{table_name}' table. Adding...",
            )
            with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER",
                        ),
                    )
                else:  # SQLite
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN approved_by INTEGER",
                        ),
                    )
            columns_added.append("approved_by")
            logger.info("✓ Column 'approved_by' added successfully")
        else:
            logger.info("✓ Column 'approved_by' already exists")

        # Check and add rejection_reason column
        if not column_exists(engine, table_name, "rejection_reason"):
            logger.info(
                f"Column 'rejection_reason' not found in '{table_name}' table. Adding...",
            )
            with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
                        ),
                    )
                else:  # SQLite
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN rejection_reason TEXT",
                        ),
                    )
            columns_added.append("rejection_reason")
            logger.info("✓ Column 'rejection_reason' added successfully")
        else:
            logger.info("✓ Column 'rejection_reason' already exists")

        # Update existing users to have approved status and set approval_date
        # This is critical for ensuring existing users maintain access
        with engine.begin() as conn:
            logger.info("Ensuring all existing users have approved status...")
            result = conn.execute(
                text(
                    """
                UPDATE users
                SET registration_status = 'approved',
                    approval_date = created_at
                WHERE registration_status IS NULL OR registration_status = 'approved'
                """,
                ),
            )
            rows_updated = result.rowcount
            logger.info(f"✓ Updated {rows_updated} existing users to approved status")

        # Create indexes for efficient queries
        try:
            with engine.begin() as conn:
                # Check and create index on registration_status
                if engine.dialect.name == "postgresql":
                    result = conn.execute(
                        text(
                            "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_registration_status'",
                        ),
                    )
                    index_exists = result.fetchone() is not None
                    if not index_exists:
                        logger.info("Creating index 'idx_users_registration_status'...")
                        conn.execute(
                            text(
                                "CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status)",
                            ),
                        )
                        logger.info(
                            "✓ Index 'idx_users_registration_status' created successfully",
                        )
                    else:
                        logger.info(
                            "✓ Index 'idx_users_registration_status' already exists",
                        )
                else:  # SQLite
                    conn.execute(
                        text(
                            "CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status)",
                        ),
                    )
                    logger.info(
                        "✓ Index 'idx_users_registration_status' created/verified",
                    )

                # Check and create index on approved_by
                if engine.dialect.name == "postgresql":
                    result = conn.execute(
                        text(
                            "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_approved_by'",
                        ),
                    )
                    index_exists = result.fetchone() is not None
                    if not index_exists:
                        logger.info("Creating index 'idx_users_approved_by'...")
                        conn.execute(
                            text(
                                "CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by)",
                            ),
                        )
                        logger.info(
                            "✓ Index 'idx_users_approved_by' created successfully",
                        )
                    else:
                        logger.info("✓ Index 'idx_users_approved_by' already exists")
                else:  # SQLite
                    conn.execute(
                        text(
                            "CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by)",
                        ),
                    )
                    logger.info("✓ Index 'idx_users_approved_by' created/verified")
        except Exception:
            # Index creation is not critical - log warning but continue
            logger.exception("Could not create/verify indexes")

        if columns_added:
            logger.info(
                f"User approval workflow migration complete: Added columns {columns_added}",
            )
        else:
            logger.info(
                "User approval workflow migration complete: All required columns already exist",
            )

        return True

    except Exception:
        logger.exception("Error during user approval columns migration")
        return False


def _validate_sql_identifier(identifier):
    """Validate SQL identifier to prevent injection.

    Ensures identifier contains only alphanumeric characters and underscores,
    and doesn't start with a number.

    Args:
        identifier: The SQL identifier to validate

    Returns:
        bool: True if valid, False otherwise

    """
    import re  # noqa: PLC0415 - Conditional import

    # SQL identifiers should only contain alphanumeric and underscore, not start with number
    return bool(re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", identifier))


def add_user_profile_fields(engine):
    """Add user profile fields to users table if they don't exist.

    This function adds fields for multi-tenancy and enhanced user management:
    - phone_number: VARCHAR(20) for contact information
    - company: VARCHAR(255) for company name (with DEFAULT 'Default')
    - company_identifier: VARCHAR(255) for unique company identifier
    - department: VARCHAR(100) for user department
    - position: VARCHAR(100) for user job position
    - first_name: VARCHAR(100) for user first name
    - last_name: VARCHAR(100) for user last name
    - is_active: BOOLEAN for account status (DEFAULT true)
    - last_login: TIMESTAMP for tracking last login time

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if columns were added or already exist, False on error

    """
    try:
        table_name = "users"
        columns_added = []

        # Define columns to add with their SQL definitions
        # These are hardcoded constants for security - never use user input here
        columns_to_add = [
            ("phone_number", "VARCHAR(20)"),
            ("company", "VARCHAR(255) DEFAULT 'Default'"),
            ("company_identifier", "VARCHAR(255)"),
            ("department", "VARCHAR(100)"),
            ("position", "VARCHAR(100)"),
            ("first_name", "VARCHAR(100)"),
            ("last_name", "VARCHAR(100)"),
            ("is_active", "BOOLEAN DEFAULT true"),
            ("last_login", "TIMESTAMP"),
        ]

        for column_name, column_def in columns_to_add:
            # Validate column name to prevent SQL injection
            if not _validate_sql_identifier(column_name):
                logger.error(
                    f"Invalid column name '{column_name}' - skipping for security",
                )
                continue

            if not column_exists(engine, table_name, column_name):
                logger.info(
                    f"Column '{column_name}' not found in '{table_name}' table. Adding...",
                )
                with engine.begin() as conn:
                    # Note: DDL statements cannot use parameterized queries for identifiers
                    # Column names are validated above and come from hardcoded list
                    conn.execute(
                        text(
                            f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_def}",
                        ),
                    )
                columns_added.append(column_name)
                logger.info(f"✓ Column '{column_name}' added successfully")
            else:
                logger.info(f"✓ Column '{column_name}' already exists")

        # Create indexes for better query performance
        # These are hardcoded constants for security - never use user input here
        indexes_to_create = [
            ("idx_users_company", "company"),
            ("idx_users_company_identifier", "company_identifier"),
        ]

        for index_name, column_name in indexes_to_create:
            # Validate both index name and column name to prevent SQL injection
            if not _validate_sql_identifier(index_name):
                logger.error(
                    f"Invalid index name '{index_name}' - skipping for security",
                )
                continue
            if not _validate_sql_identifier(column_name):
                logger.error(
                    f"Invalid column name '{column_name}' for index - skipping for security",
                )
                continue

            try:
                with engine.begin() as conn:
                    # Check if index exists (PostgreSQL syntax)
                    result = conn.execute(
                        text("SELECT 1 FROM pg_indexes WHERE indexname = :index_name"),
                        {"index_name": index_name},
                    )
                    index_exists = result.fetchone() is not None

                    if not index_exists:
                        logger.info(f"Creating index '{index_name}'...")
                        # Note: DDL statements cannot use parameterized queries for identifiers
                        # Index and column names are validated above and come from hardcoded list
                        conn.execute(
                            text(
                                f"CREATE INDEX IF NOT EXISTS {index_name} ON users({column_name})",
                            ),
                        )
                        logger.info(f"✓ Index '{index_name}' created successfully")
                    else:
                        logger.info(f"✓ Index '{index_name}' already exists")
            except Exception:
                # Index creation is not critical - log warning but continue
                logger.exception(
                    "Could not create/verify index '{index_name}': {idx_error}",
                )

        if columns_added:
            logger.info(
                f"User profile fields migration complete: Added columns {columns_added}",
            )
        else:
            logger.info(
                "User profile fields migration complete: All required columns already exist",
            )

        return True

    except Exception:
        logger.exception("Error adding user profile fields")
        return False


def table_exists(engine, table_name):
    """Check if a table exists in the database.

    Args:
        engine: SQLAlchemy engine instance
        table_name: Name of the table to check

    Returns:
        bool: True if table exists, False otherwise

    """
    try:
        inspector = inspect(engine)
        return table_name in inspector.get_table_names()
    except Exception:
        logger.exception("Error checking if table exists")
        return False


def add_tenants_table(engine):
    """Create the tenants table if it doesn't exist.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if table was created or already exists, False on error

    """
    try:
        if table_exists(engine, "tenants"):
            logger.info("✓ Tenants table already exists")
            return True

        logger.info("Creating tenants table...")
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
                # PostgreSQL version
                conn.execute(
                    text(
                        """
                    CREATE TABLE IF NOT EXISTS tenants (
                        id SERIAL PRIMARY KEY,
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
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        max_users INTEGER,
                        max_units INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """,
                    ),
                )

                # Create indexes
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name)",
                    ),
                )
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)",
                    ),
                )
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active)",
                    ),
                )

            elif engine.dialect.name == "sqlite":
                # SQLite version
                conn.execute(
                    text(
                        """
                    CREATE TABLE IF NOT EXISTS tenants (
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
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name)",
                    ),
                )
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)",
                    ),
                )
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active)",
                    ),
                )
            else:
                logger.error(f"Unsupported database dialect: {engine.dialect.name}")
                return False

        logger.info("✓ Tenants table created successfully")
        return True

    except Exception:
        logger.exception("Error creating tenants table")
        return False


def add_tenant_id_to_users(engine):
    """Add tenant_id column to users table if it doesn't exist.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if column was added or already exists, False on error

    """
    try:
        table_name = "users"

        if column_exists(engine, table_name, "tenant_id"):
            logger.info("✓ Column 'tenant_id' already exists in users table")
            return True

        logger.info("Adding tenant_id column to users table...")
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(
                    text(
                        """
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id)
                    """,
                    ),
                )

                # Create index for tenant_id
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)",
                    ),
                )

            elif engine.dialect.name == "sqlite":
                # SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
                # But we already checked that the column doesn't exist
                # Note: SQLite foreign key constraints require 'PRAGMA foreign_keys = ON'
                # to be enforced. Without this pragma, REFERENCES clauses are parsed
                # but not enforced by default.
                conn.execute(
                    text(
                        """
                    ALTER TABLE users
                    ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)
                    """,
                    ),
                )

                # Create index for tenant_id
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)",
                    ),
                )
            else:
                logger.error(f"Unsupported database dialect: {engine.dialect.name}")
                return False

        logger.info("✓ Column 'tenant_id' added to users table successfully")
        return True

    except Exception:
        logger.exception("Error adding tenant_id to users table")
        return False


def add_tenant_id_to_units(engine):
    """Add tenant_id column to units table if it doesn't exist.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if column was added or already exists, False on error

    """
    try:
        table_name = "units"

        if column_exists(engine, table_name, "tenant_id"):
            logger.info("✓ Column 'tenant_id' already exists in units table")
            return True

        logger.info("Adding tenant_id column to units table...")
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(
                    text(
                        """
                    ALTER TABLE units
                    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id)
                    """,
                    ),
                )

                # Create index for tenant_id
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON units(tenant_id)",
                    ),
                )

            elif engine.dialect.name == "sqlite":
                # SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
                # But we already checked that the column doesn't exist
                # Note: SQLite foreign key constraints require 'PRAGMA foreign_keys = ON'
                # to be enforced. Without this pragma, REFERENCES clauses are parsed
                # but not enforced by default.
                conn.execute(
                    text(
                        """
                    ALTER TABLE units
                    ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)
                    """,
                    ),
                )

                # Create index for tenant_id
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON units(tenant_id)",
                    ),
                )
            else:
                logger.error(f"Unsupported database dialect: {engine.dialect.name}")
                return False

        logger.info("✓ Column 'tenant_id' added to units table successfully")
        return True

    except Exception:
        logger.exception("Error adding tenant_id to units table")
        return False


def add_multi_tenancy_support(engine):
    """Add multi-tenancy support to the database schema.

    This function orchestrates the multi-tenancy migration by:
    1. Creating the tenants table
    2. Adding tenant_id to users table
    3. Adding tenant_id to units table

    All operations are idempotent and production-safe.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if all migrations successful, False otherwise

    """
    try:
        logger.info("Starting multi-tenancy migration...")

        # Step 1: Create tenants table
        tenants_success = add_tenants_table(engine)

        # Step 2: Add tenant_id to users table
        users_success = add_tenant_id_to_users(engine)

        # Step 3: Add tenant_id to units table
        units_success = add_tenant_id_to_units(engine)

        success = tenants_success and users_success and units_success

        if success:
            logger.info("✓ Multi-tenancy migration completed successfully")
        else:
            logger.warning(
                "Some multi-tenancy migrations failed - check logs for details",
            )

        return success

    except Exception:
        logger.exception("Error during multi-tenancy migration")
        return False


def run_auto_migrations(app):
    """Run all auto-migrations needed for the application.

    This function is called during app initialization to ensure the database
    schema is up to date, even without shell access for running migrations.

    Args:
        app: Flask application instance

    Returns:
        bool: True if migrations successful, False otherwise

    """
    try:
        logger.info("Starting auto-migration checks...")

        # Get database engine from SQLAlchemy
        # Use app.extensions to get the SQLAlchemy instance directly
        from app import db  # noqa: PLC0415 - Conditional import

        # Get engine within app context
        with app.app_context():
            engine = db.engine

            # Run user profile fields migration (must run before other migrations)
            user_profile_success = add_user_profile_fields(engine)

            # Run password reset columns migration
            success = add_password_reset_columns(engine)

            # Run permissions column migration
            permissions_success = add_permissions_column(engine)
            success = success and permissions_success

            # Update emergency_admin with comprehensive permissions
            emergency_admin_success = update_emergency_admin_permissions(engine)
            success = success and emergency_admin_success

            # Run user approval workflow columns migration
            approval_success = add_user_approval_columns(engine)
            success = success and approval_success

            # Run multi-tenancy migration
            multi_tenancy_success = add_multi_tenancy_support(engine)
            success = success and multi_tenancy_success

            # Fix existing users' permissions based on their roles
            user_permissions_success = fix_user_permissions(engine)
            success = success and user_permissions_success and user_profile_success

        if success:
            logger.info("All auto-migrations completed successfully")
        else:
            logger.warning("Some auto-migrations failed - check logs for details")

        return success

    except Exception:
        logger.exception("Error running auto-migrations")
        # Don't crash the app if migrations fail - just log the error
        return False
