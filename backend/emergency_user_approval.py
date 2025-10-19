"""Emergency user approval script.

This script approves all users stuck in 'pending' status after the auto-migration.
It should be run when all users, including emergency_admin, are unable to log in
due to being in 'pending' registration status.

Usage:
    python emergency_user_approval.py

This script can be safely run multiple times - it only updates users that are
currently in 'pending' status.
"""

import sys
import os
import logging

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

logger = logging.getLogger(__name__)


def approve_all_existing_users(config_name=None):
    """Emergency fix: Approve all existing users.
    
    This function updates all users with 'pending' registration status to 'approved'.
    It sets the approver to the emergency_admin user if available.
    
    Args:
        config_name: Optional config name (e.g., 'testing', 'development', 'production')
    
    Returns:
        int: Number of users approved
    """
    app = create_app(config_name)
    
    with app.app_context():
        try:
            with db.engine.begin() as conn:
                # Get emergency_admin user ID for approved_by field (using parameterized query)
                result = conn.execute(
                    text("SELECT id FROM users WHERE username = :username LIMIT 1"),
                    {"username": "emergency_admin"}
                )
                emergency_admin_row = result.fetchone()
                emergency_admin_id = emergency_admin_row[0] if emergency_admin_row else None
                
                logger.info("Starting emergency user approval process...")
                logger.info(f"Emergency admin ID: {emergency_admin_id or 'Not found'}")
                
                # Update all pending users to approved status (using parameterized query)
                result = conn.execute(
                    text("""
                        UPDATE users 
                        SET registration_status = 'approved',
                            approved_at = CURRENT_TIMESTAMP,
                            approved_by = :admin_id
                        WHERE registration_status = 'pending'
                    """),
                    {"admin_id": emergency_admin_id}
                )
                
                count = result.rowcount
                logger.info(f"✓ All existing users approved ({count} users updated)")
                return count
            
        except Exception as e:
            logger.error(f"✗ Error during emergency approval: {e}")
            raise


if __name__ == "__main__":
    print("=" * 70)
    print("EMERGENCY USER APPROVAL SCRIPT")
    print("=" * 70)
    print()
    print("This script will approve all users stuck in 'pending' status.")
    print("After running this script, users will be able to log in.")
    print()
    
    try:
        count = approve_all_existing_users()
        print()
        print("=" * 70)
        print("SUCCESS: Emergency approval completed")
        print("=" * 70)
        print(f"Total users approved: {count}")
        print()
        print("Users can now log in to the system.")
        sys.exit(0)
    except Exception as e:
        print()
        print("=" * 70)
        print("ERROR: Emergency approval failed")
        print("=" * 70)
        print(f"Error: {e}")
        print()
        print("Please check the error message and try again.")
        print("Contact support if the problem persists.")
        sys.exit(1)
