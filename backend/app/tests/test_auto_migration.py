"""Tests for auto-migration functionality."""

from sqlalchemy import inspect
from app.utils.auto_migration import (
    column_exists,
    add_password_reset_columns,
    run_auto_migrations,
)


class TestAutoMigration:
    """Test auto-migration functionality."""

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
