"""User permissions fix utility for ThermaCore SCADA.

This module provides functionality to fix existing users' permissions
based on their assigned roles, ensuring all users have the correct
permissions for user management and other operations.
"""

import json
import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)


def fix_user_permissions(engine):
    """Fix permissions for all existing users based on their roles.

    This function updates the permissions field for all users in the database,
    ensuring they have the correct permissions based on their role assignment.
    It's safe to run multiple times (idempotent).

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if update successful, False on error

    """
    try:
        # Define role-based permissions (must match get_role_permissions)
        role_permissions_map = {
            "admin": [
                "read_units",
                "write_units",
                "delete_units",
                "read_users",
                "write_users",
                "delete_users",
                "admin_panel",
                "remote_control",
            ],
            "operator": [
                "read_units",
                "read_users",
                "remote_control",
            ],
            "viewer": [
                "read_units",
                "read_users",
            ],
        }

        logger.info("Starting user permissions fix...")

        with engine.begin() as conn:
            # Get all users with their role names
            result = conn.execute(
                text(
                    """
                SELECT u.id, u.username, r.name as role_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.username != 'emergency_admin'
                """,
                ),
            )
            users = result.fetchall()

            if not users:
                logger.info("No users found to update (excluding emergency_admin)")
                return True

            logger.info(f"Found {len(users)} users to update")

            # Update each user's permissions based on their role
            updated_count = 0
            for user in users:
                user_id, username, role_name = user

                # Get permissions for this role
                permissions = role_permissions_map.get(role_name, [])
                permissions_json = json.dumps(permissions)

                # Update user permissions
                conn.execute(
                    text(
                        """
                    UPDATE users
                    SET permissions = :permissions,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :user_id
                    """,
                    ),
                    {
                        "permissions": permissions_json,
                        "user_id": user_id,
                    },
                )

                logger.info(
                    f"Updated permissions for user '{username}' (role: {role_name})",
                )
                updated_count += 1

            logger.info(f"✓ Successfully updated permissions for {updated_count} users")

        return True

    except Exception as e:
        logger.exception(f"Error fixing user permissions: {e}")
        return False
