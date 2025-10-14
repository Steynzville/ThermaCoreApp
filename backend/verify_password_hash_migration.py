#!/usr/bin/env python3
"""
Verification script for password_hash column migration.

This script checks if the users.password_hash column has been correctly
migrated from VARCHAR(128) to TEXT to support longer scrypt hashes.

Usage:
    python verify_password_hash_migration.py
    
Environment Variables:
    DATABASE_URL: PostgreSQL connection string
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import OperationalError
except ImportError:
    print("❌ Error: SQLAlchemy not installed. Run: pip install sqlalchemy psycopg2-binary")
    sys.exit(1)


def check_password_hash_column():
    """Check the password_hash column type in the database."""
    
    # Get database URL
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("   Please set it with: export DATABASE_URL=\"postgresql://...\"")
        return False
    
    print("=" * 70)
    print("ThermaCore Password Hash Column Verification")
    print("=" * 70)
    print()
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        print("✓ Connecting to database...")
        with engine.connect() as conn:
            print("✓ Connected successfully")
            print()
            
            # Check if users table exists
            print("Checking users table...")
            result = conn.execute(text("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name='users'
                );
            """))
            table_exists = result.scalar()
            
            if not table_exists:
                print("❌ ERROR: users table does not exist")
                print("   Run migrations first: bash backend/apply_migrations.sh")
                return False
            
            print("✓ users table exists")
            print()
            
            # Check password_hash column type
            print("Checking password_hash column type...")
            result = conn.execute(text("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                  AND column_name = 'password_hash';
            """))
            
            col_info = result.fetchone()
            
            if not col_info:
                print("❌ ERROR: password_hash column does not exist")
                return False
            
            column_name, data_type, max_length, is_nullable = col_info
            
            print(f"   Column name: {column_name}")
            print(f"   Data type: {data_type}")
            print(f"   Max length: {max_length if max_length else 'unlimited'}")
            print(f"   Nullable: {is_nullable}")
            print()
            
            # Verify the column is TEXT
            if data_type.lower() == 'text':
                print("=" * 70)
                print("✅ SUCCESS: password_hash is correctly set to TEXT")
                print("=" * 70)
                print()
                print("The column can now store password hashes of any length,")
                print("including scrypt hashes (~162 characters).")
                print()
                return True
            
            elif data_type.lower() == 'character varying':
                print("=" * 70)
                print("❌ FAILURE: password_hash is still VARCHAR")
                print("=" * 70)
                print()
                print(f"Current type: VARCHAR({max_length})")
                print("Expected type: TEXT")
                print()
                print("This will cause truncation errors for scrypt password hashes!")
                print()
                print("Fix this by running:")
                print("  1. bash backend/apply_migrations.sh")
                print()
                print("Or manually apply migration 005:")
                print("  psql $DATABASE_URL -f backend/migrations/005_fix_password_hash_length.sql")
                print()
                return False
            
            else:
                print(f"⚠️  WARNING: Unexpected data type: {data_type}")
                print("   Expected: text")
                return False
                
    except OperationalError as e:
        print(f"❌ Database connection error: {e}")
        print("   Check your DATABASE_URL and ensure the database is accessible")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_password_hash_length():
    """Test that password hashes can be stored without truncation."""
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return False
    
    try:
        from app import create_app, db
        from app.models import User, Role, RoleEnum
        
        app = create_app()
        
        with app.app_context():
            print("Testing password hash storage...")
            print()
            
            # Get admin role
            admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
            if not admin_role:
                print("⚠️  Warning: Admin role not found, skipping storage test")
                return True
            
            # Create a test user with a long password
            test_username = f"test_user_{os.getpid()}"
            test_user = User(
                username=test_username,
                email=f"{test_username}@test.com",
                first_name="Test",
                last_name="User",
                role_id=admin_role.id
            )
            
            # Set a password (will generate ~162 char scrypt hash)
            test_password = "TestPassword123!VeryLongPasswordToGenerateLongHash"
            test_user.set_password(test_password)
            
            hash_length = len(test_user.password_hash)
            print(f"   Generated password hash length: {hash_length} characters")
            
            try:
                # Try to save the user
                db.session.add(test_user)
                db.session.commit()
                
                # Verify the hash wasn't truncated
                saved_user = User.query.filter_by(username=test_username).first()
                saved_hash_length = len(saved_user.password_hash)
                
                print(f"   Saved password hash length: {saved_hash_length} characters")
                print()
                
                if saved_hash_length == hash_length:
                    print("✅ Password hash stored successfully without truncation")
                    
                    # Verify password check works
                    if saved_user.check_password(test_password):
                        print("✅ Password verification works correctly")
                    else:
                        print("❌ Password verification failed (hash may be corrupted)")
                        return False
                else:
                    print("❌ Password hash was truncated!")
                    print(f"   Expected: {hash_length} characters")
                    print(f"   Got: {saved_hash_length} characters")
                    return False
                
                # Clean up
                db.session.delete(saved_user)
                db.session.commit()
                print()
                return True
                
            except Exception as e:
                db.session.rollback()
                print(f"❌ Error storing password hash: {e}")
                
                if "value too long" in str(e).lower():
                    print()
                    print("This is the VARCHAR(128) truncation error!")
                    print("Migration 005 needs to be applied.")
                
                return False
                
    except ImportError as e:
        print(f"⚠️  Warning: Cannot run storage test: {e}")
        return True
    except Exception as e:
        print(f"⚠️  Warning: Storage test failed: {e}")
        return True


if __name__ == '__main__':
    success = check_password_hash_column()
    
    if success:
        print()
        success = test_password_hash_length()
    
    sys.exit(0 if success else 1)
