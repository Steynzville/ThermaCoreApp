#!/usr/bin/env python3
"""
Test script to validate migration 005 can be applied successfully.

This script tests the migration process in a controlled environment
to ensure it works correctly before applying to production.

Usage:
    python test_migration_005.py
    
Environment Variables:
    DATABASE_URL: PostgreSQL connection string (test database recommended)
"""

import os
import sys
import subprocess

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import OperationalError
except ImportError:
    print("❌ Error: SQLAlchemy not installed. Run: pip install sqlalchemy psycopg2-binary")
    sys.exit(1)


class Migration005Test:
    """Test suite for migration 005."""
    
    def __init__(self):
        self.database_url = os.environ.get('DATABASE_URL')
        self.passed_tests = 0
        self.failed_tests = 0
        self.warnings = 0
        
    def print_header(self, text):
        """Print a test section header."""
        print("\n" + "=" * 70)
        print(text)
        print("=" * 70 + "\n")
    
    def print_test(self, test_name):
        """Print test name."""
        print(f"Testing: {test_name}...")
    
    def print_pass(self, message):
        """Print success message."""
        print(f"  ✅ {message}")
        self.passed_tests += 1
    
    def print_fail(self, message):
        """Print failure message."""
        print(f"  ❌ {message}")
        self.failed_tests += 1
    
    def print_warning(self, message):
        """Print warning message."""
        print(f"  ⚠️  {message}")
        self.warnings += 1
    
    def test_database_connection(self):
        """Test 1: Database connectivity."""
        self.print_test("Database connectivity")
        
        if not self.database_url:
            self.print_fail("DATABASE_URL not set")
            return False
        
        try:
            engine = create_engine(self.database_url)
            with engine.connect() as conn:
                result = conn.execute(text("SELECT current_database();"))
                db_name = result.scalar()
                self.print_pass(f"Connected to database: {db_name}")
                return True
        except Exception as e:
            self.print_fail(f"Cannot connect to database: {e}")
            return False
    
    def test_migration_script_exists(self):
        """Test 2: Migration script files exist."""
        self.print_test("Migration script files exist")
        
        script_dir = os.path.dirname(__file__)
        
        # Check apply_migrations.sh
        migration_script = os.path.join(script_dir, 'apply_migrations.sh')
        if os.path.exists(migration_script):
            self.print_pass("apply_migrations.sh exists")
        else:
            self.print_fail("apply_migrations.sh not found")
            return False
        
        # Check migration 005
        migration_file = os.path.join(script_dir, 'migrations', '005_fix_password_hash_length.sql')
        if os.path.exists(migration_file):
            self.print_pass("005_fix_password_hash_length.sql exists")
        else:
            self.print_fail("005_fix_password_hash_length.sql not found")
            return False
        
        # Check verification script
        verify_script = os.path.join(script_dir, 'verify_password_hash_migration.py')
        if os.path.exists(verify_script):
            self.print_pass("verify_password_hash_migration.py exists")
        else:
            self.print_fail("verify_password_hash_migration.py not found")
            return False
        
        return True
    
    def test_migration_sql_content(self):
        """Test 3: Migration 005 SQL content is correct."""
        self.print_test("Migration 005 SQL content")
        
        script_dir = os.path.dirname(__file__)
        migration_file = os.path.join(script_dir, 'migrations', '005_fix_password_hash_length.sql')
        
        try:
            with open(migration_file, 'r') as f:
                content = f.read()
            
            # Check for key SQL statements
            if 'ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT' in content:
                self.print_pass("Contains ALTER COLUMN to TEXT")
            else:
                self.print_fail("Missing ALTER COLUMN to TEXT statement")
                return False
            
            if 'ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL' in content:
                self.print_pass("Contains SET NOT NULL constraint")
            else:
                self.print_warning("Missing SET NOT NULL constraint (may be intentional)")
            
            return True
        except Exception as e:
            self.print_fail(f"Cannot read migration file: {e}")
            return False
    
    def test_users_table_exists(self):
        """Test 4: Users table exists in database."""
        self.print_test("Users table exists")
        
        try:
            engine = create_engine(self.database_url)
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT EXISTS(
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name='users'
                    );
                """))
                exists = result.scalar()
                
                if exists:
                    self.print_pass("users table exists")
                    return True
                else:
                    self.print_fail("users table does not exist")
                    self.print_warning("Run initial migrations first: bash apply_migrations.sh")
                    return False
        except Exception as e:
            self.print_fail(f"Cannot check users table: {e}")
            return False
    
    def test_password_hash_column_exists(self):
        """Test 5: password_hash column exists."""
        self.print_test("password_hash column exists")
        
        try:
            engine = create_engine(self.database_url)
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT EXISTS(
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='users' 
                        AND column_name='password_hash'
                    );
                """))
                exists = result.scalar()
                
                if exists:
                    self.print_pass("password_hash column exists")
                    return True
                else:
                    self.print_fail("password_hash column does not exist")
                    return False
        except Exception as e:
            self.print_fail(f"Cannot check password_hash column: {e}")
            return False
    
    def test_password_hash_column_type(self):
        """Test 6: Check password_hash column type."""
        self.print_test("password_hash column type")
        
        try:
            engine = create_engine(self.database_url)
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT 
                        data_type,
                        character_maximum_length,
                        is_nullable
                    FROM information_schema.columns
                    WHERE table_name='users' 
                    AND column_name='password_hash';
                """))
                row = result.fetchone()
                
                if not row:
                    self.print_fail("Cannot get column information")
                    return False
                
                data_type, max_length, is_nullable = row
                
                print(f"     Current type: {data_type}")
                if max_length:
                    print(f"     Max length: {max_length}")
                else:
                    print(f"     Max length: unlimited")
                print(f"     Nullable: {is_nullable}")
                
                if data_type.lower() == 'text':
                    self.print_pass("Column is already TEXT type")
                    return True
                elif data_type.lower() == 'character varying':
                    self.print_warning(f"Column is VARCHAR({max_length}) - Migration 005 needs to be applied")
                    return True  # Not a failure, just needs migration
                else:
                    self.print_warning(f"Unexpected data type: {data_type}")
                    return True
        except Exception as e:
            self.print_fail(f"Cannot check column type: {e}")
            return False
    
    def test_migration_history_table(self):
        """Test 7: Migration history table exists or can be created."""
        self.print_test("Migration history table")
        
        try:
            engine = create_engine(self.database_url)
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT EXISTS(
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name='migration_history'
                    );
                """))
                exists = result.scalar()
                
                if exists:
                    self.print_pass("migration_history table exists")
                    
                    # Check if migration 005 is recorded
                    result = conn.execute(text("""
                        SELECT EXISTS(
                            SELECT 1 FROM migration_history 
                            WHERE migration_name='005_fix_password_hash_length.sql'
                        );
                    """))
                    migration_recorded = result.scalar()
                    
                    if migration_recorded:
                        self.print_pass("Migration 005 is recorded as applied")
                    else:
                        self.print_warning("Migration 005 is not recorded (will be added when migration runs)")
                else:
                    self.print_warning("migration_history table does not exist (will be created)")
                
                return True
        except Exception as e:
            self.print_fail(f"Cannot check migration_history: {e}")
            return False
    
    def test_bash_script_syntax(self):
        """Test 8: Bash script syntax is valid."""
        self.print_test("Bash script syntax")
        
        script_dir = os.path.dirname(__file__)
        scripts = [
            'apply_migrations.sh',
            'deploy_migration_005.sh'
        ]
        
        all_valid = True
        for script in scripts:
            script_path = os.path.join(script_dir, script)
            if os.path.exists(script_path):
                try:
                    result = subprocess.run(
                        ['bash', '-n', script_path],
                        capture_output=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        self.print_pass(f"{script} syntax valid")
                    else:
                        self.print_fail(f"{script} syntax error")
                        all_valid = False
                except Exception as e:
                    self.print_warning(f"Cannot check {script}: {e}")
            else:
                self.print_warning(f"{script} not found (may be optional)")
        
        return all_valid
    
    def test_python_script_syntax(self):
        """Test 9: Python script syntax is valid."""
        self.print_test("Python script syntax")
        
        script_dir = os.path.dirname(__file__)
        scripts = [
            'verify_password_hash_migration.py',
            'health_check.py',
            'scripts/create_first_admin.py'
        ]
        
        all_valid = True
        for script in scripts:
            script_path = os.path.join(script_dir, script)
            if os.path.exists(script_path):
                try:
                    result = subprocess.run(
                        ['python3', '-m', 'py_compile', script_path],
                        capture_output=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        self.print_pass(f"{script} syntax valid")
                    else:
                        self.print_fail(f"{script} syntax error")
                        all_valid = False
                except Exception as e:
                    self.print_warning(f"Cannot check {script}: {e}")
            else:
                self.print_warning(f"{script} not found")
        
        return all_valid
    
    def run_all_tests(self):
        """Run all tests."""
        self.print_header("Migration 005 Test Suite")
        
        print("This test suite validates that migration 005 can be applied successfully.")
        print("It checks scripts, database connectivity, and current state.\n")
        
        # Run tests
        tests = [
            self.test_database_connection,
            self.test_migration_script_exists,
            self.test_migration_sql_content,
            self.test_users_table_exists,
            self.test_password_hash_column_exists,
            self.test_password_hash_column_type,
            self.test_migration_history_table,
            self.test_bash_script_syntax,
            self.test_python_script_syntax,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.print_fail(f"Test error: {e}")
            print()
        
        # Print summary
        self.print_header("Test Summary")
        
        total_tests = self.passed_tests + self.failed_tests
        print(f"Total tests: {total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"⚠️  Warnings: {self.warnings}")
        print()
        
        if self.failed_tests == 0:
            print("=" * 70)
            print("✅ All tests passed!")
            print("=" * 70)
            print()
            print("Migration 005 is ready to be applied.")
            print()
            print("Next steps:")
            print("  1. Apply migration: bash backend/deploy_migration_005.sh")
            print("  2. Verify migration: python backend/verify_password_hash_migration.py")
            print("  3. Test authentication: https://thermacoreapp.netlify.app")
            print()
            return 0
        else:
            print("=" * 70)
            print("❌ Some tests failed")
            print("=" * 70)
            print()
            print("Please fix the issues above before applying the migration.")
            print()
            return 1


def main():
    """Main entry point."""
    test_suite = Migration005Test()
    return test_suite.run_all_tests()


if __name__ == '__main__':
    sys.exit(main())
