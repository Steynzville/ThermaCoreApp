"""Tests for auto-migration functionality."""

from sqlalchemy import inspect
from app.utils.auto_migration import (
    column_exists,
    add_password_reset_columns,
    add_user_profile_fields,
    add_user_approval_columns,
    run_auto_migrations,
    _validate_sql_identifier,
)


class TestAutoMigration:
    """Test auto-migration functionality."""

    def test_validate_sql_identifier(self):
        """Test SQL identifier validation function."""
        # Valid identifiers
        assert _validate_sql_identifier('valid_column') is True
        assert _validate_sql_identifier('column123') is True
        assert _validate_sql_identifier('_private_column') is True
        assert _validate_sql_identifier('CamelCase') is True
        assert _validate_sql_identifier('snake_case_column') is True
        
        # Invalid identifiers
        assert _validate_sql_identifier('123column') is False  # starts with number
        assert _validate_sql_identifier('column-name') is False  # contains dash
        assert _validate_sql_identifier('column name') is False  # contains space
        assert _validate_sql_identifier('column;DROP') is False  # contains semicolon
        assert _validate_sql_identifier('column*name') is False  # contains asterisk
        assert _validate_sql_identifier('') is False  # empty string

    def test_column_exists_check(self, app, db_session):
        """Test column_exists helper function."""
        from app import db
        
        # Test with existing columns
        assert column_exists(db.engine, 'users', 'username') is True
        assert column_exists(db.engine, 'users', 'email') is True
        
        # Test with non-existent column
        assert column_exists(db.engine, 'users', 'nonexistent_column') is False

    def test_add_password_reset_columns_idempotent(self, app, db_session):
        """Test that add_password_reset_columns is idempotent."""
        from app import db
        
        # Run migration multiple times - should not error
        result1 = add_password_reset_columns(db.engine)
        result2 = add_password_reset_columns(db.engine)
        result3 = add_password_reset_columns(db.engine)
        
        assert result1 is True
        assert result2 is True
        assert result3 is True
        
        # Verify columns exist
        assert column_exists(db.engine, 'users', 'reset_token') is True
        assert column_exists(db.engine, 'users', 'reset_token_expires') is True

    def test_run_auto_migrations(self, app, db_session):
        """Test run_auto_migrations function."""
        # Should complete without errors
        result = run_auto_migrations(app)
        assert result is True
        
        # Verify columns were created
        from app import db
        assert column_exists(db.engine, 'users', 'reset_token') is True
        assert column_exists(db.engine, 'users', 'reset_token_expires') is True

    def test_password_reset_columns_type(self, app, db_session):
        """Test that password reset columns have correct types."""
        from app import db
        
        # Ensure columns exist
        run_auto_migrations(app)
        
        # Check column types using inspector
        inspector = inspect(db.engine)
        columns = {col['name']: col for col in inspector.get_columns('users')}
        
        # Verify reset_token column exists and is string type
        assert 'reset_token' in columns
        # VARCHAR or String type
        assert 'VARCHAR' in str(columns['reset_token']['type']).upper() or 'STRING' in str(columns['reset_token']['type']).upper()
        
        # Verify reset_token_expires column exists
        assert 'reset_token_expires' in columns
        # Should be a datetime/timestamp type
        col_type = str(columns['reset_token_expires']['type']).upper()
        assert any(dt in col_type for dt in ['TIMESTAMP', 'DATETIME'])

    def test_add_user_profile_fields_idempotent(self, app, db_session):
        """Test that add_user_profile_fields is idempotent."""
        from app import db
        
        # Run migration multiple times - should not error
        result1 = add_user_profile_fields(db.engine)
        result2 = add_user_profile_fields(db.engine)
        result3 = add_user_profile_fields(db.engine)
        
        assert result1 is True
        assert result2 is True
        assert result3 is True
        
        # Verify all columns exist
        required_columns = [
            'phone_number', 'company', 'company_identifier',
            'department', 'position', 'first_name', 'last_name',
            'is_active', 'last_login'
        ]
        for column_name in required_columns:
            assert column_exists(db.engine, 'users', column_name) is True

    def test_user_profile_fields_columns_type(self, app, db_session):
        """Test that user profile columns have correct types."""
        from app import db
        
        # Ensure columns exist
        run_auto_migrations(app)
        
        # Check column types using inspector
        inspector = inspect(db.engine)
        columns = {col['name']: col for col in inspector.get_columns('users')}
        
        # Verify phone_number column exists and is string type
        assert 'phone_number' in columns
        col_type = str(columns['phone_number']['type']).upper()
        assert 'VARCHAR' in col_type or 'STRING' in col_type
        
        # Verify company column exists and is string type
        assert 'company' in columns
        col_type = str(columns['company']['type']).upper()
        assert 'VARCHAR' in col_type or 'STRING' in col_type
        
        # Verify company_identifier column exists
        assert 'company_identifier' in columns
        
        # Verify department column exists
        assert 'department' in columns
        
        # Verify position column exists
        assert 'position' in columns
        
        # Verify first_name column exists
        assert 'first_name' in columns
        
        # Verify last_name column exists
        assert 'last_name' in columns
        
        # Verify is_active column exists and is boolean type
        assert 'is_active' in columns
        col_type = str(columns['is_active']['type']).upper()
        assert 'BOOL' in col_type or 'TINYINT' in col_type or 'INTEGER' in col_type
        
        # Verify last_login column exists and is datetime type
        assert 'last_login' in columns
        col_type = str(columns['last_login']['type']).upper()
        assert any(dt in col_type for dt in ['TIMESTAMP', 'DATETIME'])

    def test_add_user_approval_columns_idempotent(self, app, db_session):
        """Test that add_user_approval_columns is idempotent."""
        from app import db
        
        # Run migration multiple times - should not error
        result1 = add_user_approval_columns(db.engine)
        result2 = add_user_approval_columns(db.engine)
        result3 = add_user_approval_columns(db.engine)
        
        assert result1 is True
        assert result2 is True
        assert result3 is True
        
        # Verify all columns exist
        required_columns = [
            'registration_status', 'approved_by', 'approved_at',
            'rejection_reason', 'registration_notes'
        ]
        for column_name in required_columns:
            assert column_exists(db.engine, 'users', column_name) is True

    def test_user_approval_columns_type(self, app, db_session):
        """Test that user approval columns have correct types."""
        from app import db
        
        # Ensure columns exist
        run_auto_migrations(app)
        
        # Check column types using inspector
        inspector = inspect(db.engine)
        columns = {col['name']: col for col in inspector.get_columns('users')}
        
        # Verify registration_status column exists and is string type
        assert 'registration_status' in columns
        col_type = str(columns['registration_status']['type']).upper()
        assert 'VARCHAR' in col_type or 'STRING' in col_type
        
        # Verify approved_by column exists and is integer type
        assert 'approved_by' in columns
        col_type = str(columns['approved_by']['type']).upper()
        assert 'INT' in col_type
        
        # Verify approved_at column exists and is datetime type
        assert 'approved_at' in columns
        col_type = str(columns['approved_at']['type']).upper()
        assert any(dt in col_type for dt in ['TIMESTAMP', 'DATETIME'])
        
        # Verify rejection_reason column exists
        assert 'rejection_reason' in columns
        
        # Verify registration_notes column exists
        assert 'registration_notes' in columns
