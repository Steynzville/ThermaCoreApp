"""Auto-migration utility for Render free plan without shell access.

This module provides automatic schema migration capabilities for environments
where shell access is not available (e.g., Render free plan). It checks for
missing columns and creates them via raw SQL when needed.
"""

import logging
from sqlalchemy import text, inspect


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
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception as e:
        logger.error(f"Error checking if column exists: {e}", exc_info=True)
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
        table_name = 'users'
        columns_added = []
        
        # Check and add reset_token column
        if not column_exists(engine, table_name, 'reset_token'):
            logger.info(f"Column 'reset_token' not found in '{table_name}' table. Adding...")
            with engine.begin() as conn:
                # PostgreSQL syntax with IF NOT EXISTS for safety
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)"
                ))
            columns_added.append('reset_token')
            logger.info("✓ Column 'reset_token' added successfully")
        else:
            logger.info("✓ Column 'reset_token' already exists")
        
        # Check and add reset_token_expires column
        if not column_exists(engine, table_name, 'reset_token_expires'):
            logger.info(f"Column 'reset_token_expires' not found in '{table_name}' table. Adding...")
            with engine.begin() as conn:
                # Use TIMESTAMPTZ for PostgreSQL (timezone-aware)
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ"
                ))
            columns_added.append('reset_token_expires')
            logger.info("✓ Column 'reset_token_expires' added successfully")
        else:
            logger.info("✓ Column 'reset_token_expires' already exists")
        
        # Check and create index on reset_token if it doesn't exist
        # Note: We check index existence via a query rather than inspector
        # because index inspection can be database-specific
        try:
            with engine.begin() as conn:
                # Check if index exists - database-specific query
                if engine.dialect.name == "postgresql":
                    result = conn.execute(text(
                        "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_reset_token'"
                    ))
                    index_exists = result.fetchone() is not None
                else:  # sqlite
                    result = conn.execute(text(
                        "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_users_reset_token'"
                    ))
                    index_exists = result.fetchone() is not None
                
                if not index_exists:
                    logger.info("Creating index 'idx_users_reset_token'...")
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)"
                    ))
                    logger.info("✓ Index 'idx_users_reset_token' created successfully")
                else:
                    logger.info("✓ Index 'idx_users_reset_token' already exists")
        except Exception as idx_error:
            # Index creation is not critical - log warning but continue
            logger.warning(f"Could not create/verify index: {idx_error}")
        
        if columns_added:
            logger.info(f"Auto-migration complete: Added columns {columns_added}")
        else:
            logger.info("Auto-migration complete: All required columns already exist")
        
        return True
        
    except Exception as e:
        logger.error(f"Error during auto-migration: {e}", exc_info=True)
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
        table_name = 'users'
        
        # Check and add permissions column
        if not column_exists(engine, table_name, 'permissions'):
            logger.info(f"Column 'permissions' not found in '{table_name}' table. Adding...")
            with engine.begin() as conn:
                # Add JSON column for PostgreSQL, TEXT for SQLite compatibility
                # PostgreSQL will use JSONB for better performance
                if engine.dialect.name == "postgresql":
                    conn.execute(text(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB"
                    ))
                elif engine.dialect.name == "sqlite":
                    conn.execute(text(
                        "ALTER TABLE users ADD COLUMN permissions TEXT"
                    ))
                else:
                    logger.error(f"Unsupported database dialect: {engine.dialect.name}")
                    return False
            logger.info("✓ Column 'permissions' added successfully")
        else:
            logger.info("✓ Column 'permissions' already exists")
        
        return True
        
    except Exception as e:
        logger.error(f"Error adding permissions column: {e}", exc_info=True)
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
        import json
        # Import centralized permissions constant from models
        from app.models import EMERGENCY_ADMIN_PERMISSIONS
        
        # Use centralized emergency admin permissions constant
        # Ensures consistency across auth endpoint, auto-migration, and permission checks
        emergency_permissions = json.dumps(EMERGENCY_ADMIN_PERMISSIONS)
        
        with engine.begin() as conn:
            # Check if emergency_admin user exists
            result = conn.execute(text(
                "SELECT id FROM users WHERE username = 'emergency_admin'"
            ))
            existing_user = result.fetchone()
            
            if existing_user:
                logger.info("Updating emergency_admin user with comprehensive permissions")
                conn.execute(text(
                    """
                    UPDATE users 
                    SET permissions = :permissions,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE username = 'emergency_admin'
                    """
                ), {
                    "permissions": emergency_permissions
                })
                logger.info("✓ Emergency admin permissions updated successfully")
            else:
                logger.info("✓ Emergency admin user does not exist yet (will be created when needed)")
        
        return True
        
    except Exception as e:
        logger.error(f"Error updating emergency admin permissions: {e}", exc_info=True)
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
    import re
    # SQL identifiers should only contain alphanumeric and underscore, not start with number
    return bool(re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', identifier))


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
        table_name = 'users'
        columns_added = []
        
        # Define columns to add with their SQL definitions
        # These are hardcoded constants for security - never use user input here
        columns_to_add = [
            ('phone_number', "VARCHAR(20)"),
            ('company', "VARCHAR(255) DEFAULT 'Default'"),
            ('company_identifier', "VARCHAR(255)"),
            ('department', "VARCHAR(100)"),
            ('position', "VARCHAR(100)"),
            ('first_name', "VARCHAR(100)"),
            ('last_name', "VARCHAR(100)"),
            ('is_active', "BOOLEAN DEFAULT true"),
            ('last_login', "TIMESTAMP"),
        ]
        
        for column_name, column_def in columns_to_add:
            # Validate column name to prevent SQL injection
            if not _validate_sql_identifier(column_name):
                logger.error(f"Invalid column name '{column_name}' - skipping for security")
                continue
                
            if not column_exists(engine, table_name, column_name):
                logger.info(f"Column '{column_name}' not found in '{table_name}' table. Adding...")
                with engine.begin() as conn:
                    # Note: DDL statements cannot use parameterized queries for identifiers
                    # Column names are validated above and come from hardcoded list
                    conn.execute(text(
                        f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_def}"
                    ))
                columns_added.append(column_name)
                logger.info(f"✓ Column '{column_name}' added successfully")
            else:
                logger.info(f"✓ Column '{column_name}' already exists")
        
        # Create indexes for better query performance
        # These are hardcoded constants for security - never use user input here
        indexes_to_create = [
            ('idx_users_company', 'company'),
            ('idx_users_company_identifier', 'company_identifier'),
        ]
        
        for index_name, column_name in indexes_to_create:
            # Validate both index name and column name to prevent SQL injection
            if not _validate_sql_identifier(index_name):
                logger.error(f"Invalid index name '{index_name}' - skipping for security")
                continue
            if not _validate_sql_identifier(column_name):
                logger.error(f"Invalid column name '{column_name}' for index - skipping for security")
                continue
                
            try:
                with engine.begin() as conn:
                    # Check if index exists - database-specific query
                    if engine.dialect.name == "postgresql":
                        result = conn.execute(
                            text("SELECT 1 FROM pg_indexes WHERE indexname = :index_name"),
                            {"index_name": index_name}
                        )
                        index_exists = result.fetchone() is not None
                    else:  # sqlite
                        result = conn.execute(
                            text("SELECT name FROM sqlite_master WHERE type='index' AND name = :index_name"),
                            {"index_name": index_name}
                        )
                        index_exists = result.fetchone() is not None
                    
                    if not index_exists:
                        logger.info(f"Creating index '{index_name}'...")
                        # Note: DDL statements cannot use parameterized queries for identifiers
                        # Index and column names are validated above and come from hardcoded list
                        conn.execute(text(
                            f"CREATE INDEX IF NOT EXISTS {index_name} ON users({column_name})"
                        ))
                        logger.info(f"✓ Index '{index_name}' created successfully")
                    else:
                        logger.info(f"✓ Index '{index_name}' already exists")
            except Exception as idx_error:
                # Index creation is not critical - log warning but continue
                logger.warning(f"Could not create/verify index '{index_name}': {idx_error}")
        
        if columns_added:
            logger.info(f"User profile fields migration complete: Added columns {columns_added}")
        else:
            logger.info("User profile fields migration complete: All required columns already exist")
        
        return True
        
    except Exception as e:
        logger.error(f"Error adding user profile fields: {e}", exc_info=True)
        return False


def add_user_approval_columns(engine):
    """Add user approval workflow columns to users table if they don't exist.
    
    This function adds fields for user registration approval workflow:
    - registration_status: VARCHAR(20) for approval status (pending, approved, rejected, invited)
    - approved_by: INTEGER for the admin user ID who approved the registration
    - approved_at: TIMESTAMP for when the registration was approved
    - rejection_reason: TEXT for rejection explanation
    - registration_notes: TEXT for admin notes about the registration
    
    Uses centralized column definitions from migration_constants to prevent drift.
    
    Args:
        engine: SQLAlchemy engine instance
        
    Returns:
        bool: True if columns were added or already exist, False on error
    """
    try:
        # Import centralized constants to prevent drift
        from app.utils.migration_constants import (
            USER_APPROVAL_COLUMNS,
            USER_APPROVAL_INDEX
        )
        
        table_name = 'users'
        columns_added = []
        existing_columns = []
        
        # Get list of existing columns
        inspector = inspect(engine)
        current_columns = [col['name'] for col in inspector.get_columns(table_name)]
        
        # Add each column if it doesn't exist, using centralized definitions
        for column_name, pg_def, sqlite_def in USER_APPROVAL_COLUMNS:
            # Validate column name to prevent SQL injection
            if not _validate_sql_identifier(column_name):
                logger.error(f"Invalid column name '{column_name}' - skipping for security")
                continue
                
            if column_name not in current_columns:
                logger.info(f"Column '{column_name}' not found in '{table_name}' table. Adding...")
                with engine.begin() as conn:
                    # Note: DDL statements cannot use parameterized queries for identifiers
                    # Column names are validated above and come from hardcoded list
                    if engine.dialect.name == "postgresql":
                        column_def = pg_def
                        conn.execute(text(
                            f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_def}"
                        ))
                    elif engine.dialect.name == "sqlite":
                        column_def = sqlite_def
                        conn.execute(text(
                            f"ALTER TABLE users ADD COLUMN {column_name} {column_def}"
                        ))
                    else:
                        logger.error(f"Unsupported database dialect: {engine.dialect.name}")
                        return False
                columns_added.append(column_name)
                logger.info(f"✓ Column '{column_name}' added successfully")
            else:
                existing_columns.append(column_name)
                logger.info(f"✓ Column '{column_name}' already exists")
        
        # Create index for faster pending user queries
        if _validate_sql_identifier(USER_APPROVAL_INDEX):
            try:
                with engine.begin() as conn:
                    if engine.dialect.name == "postgresql":
                        # Check if index exists (PostgreSQL syntax)
                        result = conn.execute(
                            text("SELECT 1 FROM pg_indexes WHERE indexname = :index_name"),
                            {"index_name": USER_APPROVAL_INDEX}
                        )
                        index_exists = result.fetchone() is not None
                    else:  # sqlite
                        # Check if index exists (SQLite syntax)
                        result = conn.execute(
                            text("SELECT name FROM sqlite_master WHERE type='index' AND name = :index_name"),
                            {"index_name": USER_APPROVAL_INDEX}
                        )
                        index_exists = result.fetchone() is not None
                    
                    if not index_exists:
                        logger.info(f"Creating index '{USER_APPROVAL_INDEX}'...")
                        if engine.dialect.name == "postgresql":
                            conn.execute(text(
                                f"CREATE INDEX IF NOT EXISTS {USER_APPROVAL_INDEX} ON users(registration_status)"
                            ))
                        else:  # sqlite
                            conn.execute(text(
                                f"CREATE INDEX IF NOT EXISTS {USER_APPROVAL_INDEX} ON users(registration_status)"
                            ))
                        logger.info(f"✓ Index '{USER_APPROVAL_INDEX}' created successfully")
                    else:
                        logger.info(f"✓ Index '{USER_APPROVAL_INDEX}' already exists")
            except Exception as idx_error:
                # Index creation is not critical - log warning but continue
                logger.warning(f"Could not create/verify index '{USER_APPROVAL_INDEX}': {idx_error}")
        
        # IMPROVED BACKFILL: Always backfill when column exists with NULL/empty values
        # regardless of whether it was just created or already existed
        if 'registration_status' in columns_added or 'registration_status' in existing_columns:
            try:
                with engine.begin() as conn:
                    logger.info("Backfilling existing users with 'approved' status...")
                    result = conn.execute(text(
                        "UPDATE users SET registration_status = 'approved' WHERE registration_status IS NULL OR registration_status = ''"
                    ))
                    if result.rowcount > 0:
                        logger.info(f"✓ Backfilled {result.rowcount} existing users to 'approved' status")
                    else:
                        logger.info("✓ No users needed backfilling")
            except Exception as update_error:
                logger.warning(f"Could not backfill existing users: {update_error}")
        
        if columns_added:
            logger.info(f"User approval workflow migration complete: Added columns {columns_added}")
        else:
            logger.info("User approval workflow migration complete: All required columns already exist")
        
        return True
        
    except Exception as e:
        logger.error(f"Error adding user approval columns: {e}", exc_info=True)
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
        from app import db
        from app.utils.user_permissions_fix import fix_user_permissions
        
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
            
            # Run user approval workflow migration
            user_approval_success = add_user_approval_columns(engine)
            success = success and user_approval_success
            
            # Update emergency_admin with comprehensive permissions
            emergency_admin_success = update_emergency_admin_permissions(engine)
            success = success and emergency_admin_success
            
            # Fix existing users' permissions based on their roles
            user_permissions_success = fix_user_permissions(engine)
            success = success and user_permissions_success and user_profile_success
        
        if success:
            logger.info("All auto-migrations completed successfully")
        else:
            logger.warning("Some auto-migrations failed - check logs for details")
        
        return success
        
    except Exception as e:
        logger.error(f"Error running auto-migrations: {e}", exc_info=True)
        # Don't crash the app if migrations fail - just log the error
        return False
