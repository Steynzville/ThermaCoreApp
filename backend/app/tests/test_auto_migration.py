"""Tests for auto-migration functionality."""

from sqlalchemy import inspect
from unittest.mock import MagicMock, patch

from app.utils.auto_migration import (
    _validate_sql_identifier,
    add_multi_tenancy_support,
    add_password_reset_columns,
    add_tenant_id_to_units,
    add_tenant_id_to_users,
    add_tenants_table,
    add_user_profile_fields,
    column_exists,
    run_auto_migrations,
    table_exists,
)


class TestAutoMigration:
    """Test auto-migration functionality."""

    def test_validate_sql_identifier(self):
        """Test SQL identifier validation function."""
        # Valid identifiers
        assert _validate_sql_identifier("valid_column") is True
        assert _validate_sql_identifier("column123") is True
        assert _validate_sql_identifier("_private_column") is True
        assert _validate_sql_identifier("CamelCase") is True
        assert _validate_sql_identifier("snake_case_column") is True

        # Invalid identifiers
        assert _validate_sql_identifier("123column") is False  # starts with number
        assert _validate_sql_identifier("column-name") is False  # contains dash
        assert _validate_sql_identifier("column name") is False  # contains space
        assert _validate_sql_identifier("column;DROP") is False  # contains semicolon
        assert _validate_sql_identifier("column*name") is False  # contains asterisk
        assert _validate_sql_identifier("") is False  # empty string

    def test_column_exists_check(self, app, db_session):
        """Test column_exists helper function."""
        from app import db

        # Test with existing columns
        assert column_exists(db.engine, "users", "username") is True
        assert column_exists(db.engine, "users", "email") is True

        # Test with non-existent column
        assert column_exists(db.engine, "users", "nonexistent_column") is False

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
        assert column_exists(db.engine, "users", "reset_token") is True
        assert column_exists(db.engine, "users", "reset_token_expires") is True

    def test_run_auto_migrations(self, app, db_session):
        """Test run_auto_migrations function."""
        # Should complete without errors
        result = run_auto_migrations(app)
        assert result is True

        # Verify columns were created
        from app import db

        assert column_exists(db.engine, "users", "reset_token") is True
        assert column_exists(db.engine, "users", "reset_token_expires") is True

    def test_password_reset_columns_type(self, app, db_session):
        """Test that password reset columns have correct types."""
        from app import db

        # Ensure columns exist
        run_auto_migrations(app)

        # Check column types using inspector
        inspector = inspect(db.engine)
        columns = {col["name"]: col for col in inspector.get_columns("users")}

        # Verify reset_token column exists and is string type
        assert "reset_token" in columns
        # VARCHAR or String type
        assert (
            "VARCHAR" in str(columns["reset_token"]["type"]).upper()
            or "STRING" in str(columns["reset_token"]["type"]).upper()
        )

        # Verify reset_token_expires column exists
        assert "reset_token_expires" in columns
        # Should be a datetime/timestamp type
        col_type = str(columns["reset_token_expires"]["type"]).upper()
        assert any(dt in col_type for dt in ["TIMESTAMP", "DATETIME"])

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
            "phone_number",
            "company",
            "company_identifier",
            "department",
            "position",
            "first_name",
            "last_name",
            "is_active",
            "last_login",
        ]
        for column_name in required_columns:
            assert column_exists(db.engine, "users", column_name) is True

    def test_user_profile_fields_columns_type(self, app, db_session):
        """Test that user profile columns have correct types."""
        from app import db

        # Ensure columns exist
        run_auto_migrations(app)

        # Check column types using inspector
        inspector = inspect(db.engine)
        columns = {col["name"]: col for col in inspector.get_columns("users")}

        # Verify phone_number column exists and is string type
        assert "phone_number" in columns
        col_type = str(columns["phone_number"]["type"]).upper()
        assert "VARCHAR" in col_type or "STRING" in col_type

        # Verify company column exists and is string type
        assert "company" in columns
        col_type = str(columns["company"]["type"]).upper()
        assert "VARCHAR" in col_type or "STRING" in col_type

        # Verify company_identifier column exists
        assert "company_identifier" in columns

        # Verify department column exists
        assert "department" in columns

        # Verify position column exists
        assert "position" in columns

        # Verify first_name column exists
        assert "first_name" in columns

        # Verify last_name column exists
        assert "last_name" in columns

        # Verify is_active column exists and is boolean type
        assert "is_active" in columns
        col_type = str(columns["is_active"]["type"]).upper()
        assert "BOOL" in col_type or "TINYINT" in col_type or "INTEGER" in col_type

        # Verify last_login column exists and is datetime type
        assert "last_login" in columns
        col_type = str(columns["last_login"]["type"]).upper()
        assert any(dt in col_type for dt in ["TIMESTAMP", "DATETIME"])

    def test_table_exists_check(self, app, db_session):
        """Test table_exists helper function."""
        from app import db

        # Test with existing table
        assert table_exists(db.engine, "users") is True
        assert table_exists(db.engine, "roles") is True

        # Test with non-existent table
        assert table_exists(db.engine, "nonexistent_table") is False

    def test_add_tenants_table_idempotent(self, app, db_session):
        """Test that add_tenants_table is idempotent."""
        from app import db

        # Run migration multiple times - should not error
        result1 = add_tenants_table(db.engine)
        result2 = add_tenants_table(db.engine)
        result3 = add_tenants_table(db.engine)

        assert result1 is True
        assert result2 is True
        assert result3 is True

        # Verify table exists
        assert table_exists(db.engine, "tenants") is True

    def test_tenants_table_structure(self, app, db_session):
        """Test that tenants table has correct structure."""
        from app import db

        # Ensure table exists
        add_tenants_table(db.engine)

        # Check table columns using inspector
        inspector = inspect(db.engine)
        columns = {col["name"]: col for col in inspector.get_columns("tenants")}

        # Verify required columns exist
        required_columns = [
            "id",
            "name",
            "slug",
            "description",
            "contact_name",
            "contact_email",
            "contact_phone",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "is_active",
            "max_users",
            "max_units",
            "created_at",
            "updated_at",
        ]
        for col_name in required_columns:
            assert col_name in columns, f"Column {col_name} not found in tenants table"

        # Verify name is string type
        assert "name" in columns
        col_type = str(columns["name"]["type"]).upper()
        assert "VARCHAR" in col_type or "STRING" in col_type

        # Verify is_active is boolean type
        assert "is_active" in columns
        col_type = str(columns["is_active"]["type"]).upper()
        assert "BOOL" in col_type or "TINYINT" in col_type or "INTEGER" in col_type

    def test_add_tenant_id_to_users_idempotent(self, app, db_session):
        """Test that add_tenant_id_to_users is idempotent."""
        from app import db

        # First ensure tenants table exists
        add_tenants_table(db.engine)

        # Run migration multiple times - should not error
        result1 = add_tenant_id_to_users(db.engine)
        result2 = add_tenant_id_to_users(db.engine)
        result3 = add_tenant_id_to_users(db.engine)

        assert result1 is True
        assert result2 is True
        assert result3 is True

        # Verify column exists
        assert column_exists(db.engine, "users", "tenant_id") is True

    def test_add_tenant_id_to_units_idempotent(self, app, db_session):
        """Test that add_tenant_id_to_units is idempotent."""
        from app import db

        # First ensure tenants table exists
        add_tenants_table(db.engine)

        # Run migration multiple times - should not error
        result1 = add_tenant_id_to_units(db.engine)
        result2 = add_tenant_id_to_units(db.engine)
        result3 = add_tenant_id_to_units(db.engine)

        assert result1 is True
        assert result2 is True
        assert result3 is True

        # Verify column exists
        assert column_exists(db.engine, "units", "tenant_id") is True

    def test_add_multi_tenancy_support_comprehensive(self, app, db_session):
        """Test that add_multi_tenancy_support adds all required components."""
        from app import db

        # Run the comprehensive migration
        result = add_multi_tenancy_support(db.engine)
        assert result is True

        # Verify tenants table exists
        assert table_exists(db.engine, "tenants") is True

        # Verify tenant_id columns exist
        assert column_exists(db.engine, "users", "tenant_id") is True
        assert column_exists(db.engine, "units", "tenant_id") is True

        # Run again to test idempotency
        result2 = add_multi_tenancy_support(db.engine)
        assert result2 is True

    def test_run_auto_migrations_includes_multi_tenancy(self, app, db_session):
        """Test that run_auto_migrations includes multi-tenancy migrations."""
        # Should complete without errors
        result = run_auto_migrations(app)
        assert result is True

        # Verify multi-tenancy components were created
        from app import db

        assert table_exists(db.engine, "tenants") is True
        assert column_exists(db.engine, "users", "tenant_id") is True
        assert column_exists(db.engine, "units", "tenant_id") is True

    def test_tenant_id_columns_nullable(self, app, db_session):
        """Test that tenant_id columns are nullable for backward compatibility."""
        from app import db

        # Ensure migration has run
        add_multi_tenancy_support(db.engine)

        # Check column nullable status using inspector
        inspector = inspect(db.engine)

        # Check users.tenant_id
        users_columns = {col["name"]: col for col in inspector.get_columns("users")}
        assert "tenant_id" in users_columns
        # tenant_id should be nullable for backward compatibility
        assert users_columns["tenant_id"]["nullable"] is True

        # Check units.tenant_id
        units_columns = {col["name"]: col for col in inspector.get_columns("units")}
        assert "tenant_id" in units_columns
        # tenant_id should be nullable for backward compatibility
        assert units_columns["tenant_id"]["nullable"] is True

    def test_column_exists_exception(self):
        """Test that column_exists handles exceptions gracefully and returns False."""
        mock_engine = MagicMock()
        with patch("app.utils.auto_migration.inspect", side_effect=Exception("Connection Timeout")):
            assert column_exists(mock_engine, "users", "any") is False

    def test_add_password_reset_columns_exception(self):
        """Test that add_password_reset_columns handles DB interruptions / exceptions gracefully."""
        mock_engine = MagicMock()
        # Make column_exists raise an Exception to simulate connection interruption
        with patch("app.utils.auto_migration.column_exists", side_effect=Exception("Database lock error")):
            assert add_password_reset_columns(mock_engine) is False

    def test_add_permissions_column_sqlite(self):
        """Test add_permissions_column on sqlite dialect."""
        mock_engine = MagicMock()
        mock_engine.dialect.name = "sqlite"
        mock_conn = MagicMock()
        mock_engine.begin.return_value.__enter__.return_value = mock_conn

        with patch("app.utils.auto_migration.column_exists", return_value=False):
            from app.utils.auto_migration import add_permissions_column
            assert add_permissions_column(mock_engine) is True
            # Should have executed SQLite compatible SQL
            mock_conn.execute.assert_called()

    def test_add_permissions_column_exception(self):
        """Test add_permissions_column exceptions handling."""
        mock_engine = MagicMock()
        with patch("app.utils.auto_migration.column_exists", side_effect=Exception("Schema lock")):
            from app.utils.auto_migration import add_permissions_column
            assert add_permissions_column(mock_engine) is False

    def test_add_user_approval_columns_sqlite(self):
        """Test add_user_approval_columns sqlite path and exception."""
        mock_engine = MagicMock()
        mock_engine.dialect.name = "sqlite"
        
        with patch("app.utils.auto_migration.column_exists", return_value=False), \
             patch("app.utils.auto_migration.table_exists", return_value=True):
            from app.utils.auto_migration import add_user_approval_columns
            # Will execute SQLite queries
            assert add_user_approval_columns(mock_engine) is True

    def test_table_exists_exception(self):
        """Test table_exists handles exceptions."""
        mock_engine = MagicMock()
        with patch("app.utils.auto_migration.inspect", side_effect=Exception("DB Interruption")):
            assert table_exists(mock_engine, "tenants") is False

    def test_add_tenants_table_exception(self):
        """Test add_tenants_table handles exceptions."""
        mock_engine = MagicMock()
        with patch("app.utils.auto_migration.table_exists", side_effect=Exception("Table lock")):
            assert add_tenants_table(mock_engine) is False

    def test_run_auto_migrations_exception(self, app):
        """Test run_auto_migrations handles exceptions gracefully."""
        with patch("app.utils.auto_migration.add_password_reset_columns", side_effect=Exception("Migration crash")):
            assert run_auto_migrations(app) is False
