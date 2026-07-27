"""
Fix Client Admin Migration Script
Run this script to ensure clientadmin user has correct role and client_id
"""

import json
import logging
from sqlalchemy import inspect, text
from werkzeug.security import generate_password_hash

logger = logging.getLogger(__name__)

def fix_client_admin_data(engine):
    """Fix client admin data to ensure correct role and client_id."""
    try:
        with engine.begin() as conn:
            logger.info("Starting client admin data fix...")
            
            # 1. Ensure client_admin role exists
            role_res = conn.execute(
                text("SELECT id FROM roles WHERE name = 'client_admin'")
            ).fetchone()
            
            if not role_res:
                logger.info("Creating client_admin role...")
                conn.execute(
                    text(
                        "INSERT INTO roles (name, description) VALUES ('client_admin', 'Client Admin - Full administration for client tenants and users')"
                    )
                )
                role_res = conn.execute(
                    text("SELECT id FROM roles WHERE name = 'client_admin'")
                ).fetchone()
            
            client_admin_role_id = role_res[0]
            logger.info(f"✓ client_admin role ID: {client_admin_role_id}")

            # 2. Create or get ACME Energy client
            client_res = conn.execute(
                text("SELECT id FROM clients WHERE name = 'ACME Energy'")
            ).fetchone()
            
            if not client_res:
                logger.info("Creating ACME Energy client...")
                conn.execute(
                    text("INSERT INTO clients (name) VALUES ('ACME Energy')")
                )
                client_res = conn.execute(
                    text("SELECT id FROM clients WHERE name = 'ACME Energy'")
                ).fetchone()
            
            client_id = client_res[0]
            logger.info(f"✓ ACME Energy client ID: {client_id}")

            # 3. Create or update ACME tenants with correct client_id
            acme_tenants = [
                ("ACME Sydney", "acme-sydney", "ACME Energy Sydney Facility"),
                ("ACME Melbourne", "acme-melbourne", "ACME Energy Melbourne Facility"),
                ("ACME Brisbane", "acme-brisbane", "ACME Energy Brisbane Facility"),
            ]
            
            first_tenant_id = None
            for name, slug, desc in acme_tenants:
                t_res = conn.execute(
                    text("SELECT id FROM tenants WHERE slug = :slug"),
                    {"slug": slug}
                ).fetchone()
                
                if not t_res:
                    logger.info(f"Creating tenant: {name}")
                    conn.execute(
                        text(
                            """
                            INSERT INTO tenants (name, slug, description, is_active, client_id)
                            VALUES (:name, :slug, :desc, true, :client_id)
                            """
                        ),
                        {
                            "name": name,
                            "slug": slug,
                            "desc": desc,
                            "client_id": client_id,
                        }
                    )
                    t_res = conn.execute(
                        text("SELECT id FROM tenants WHERE slug = :slug"),
                        {"slug": slug}
                    ).fetchone()
                else:
                    # Update existing tenant to ensure client_id is correct
                    logger.info(f"Updating tenant: {name} with client_id: {client_id}")
                    conn.execute(
                        text(
                            "UPDATE tenants SET client_id = :client_id, updated_at = CURRENT_TIMESTAMP WHERE id = :id"
                        ),
                        {"client_id": client_id, "id": t_res[0]}
                    )
                
                if not first_tenant_id and t_res:
                    first_tenant_id = t_res[0]
            
            logger.info(f"✓ ACME tenants created/updated. First tenant ID: {first_tenant_id}")

            # 4. DELETE any duplicate client admin users first
            logger.info("Cleaning up duplicate client admin users...")
            
            # Get all client_admin users
            all_client_admins = conn.execute(
                text(
                    "SELECT id, username, email, client_id FROM users WHERE role_id = :role_id"
                ),
                {"role_id": client_admin_role_id}
            ).fetchall()
            
            logger.info(f"Found {len(all_client_admins)} client admin users")
            
            # Keep the one with username 'clientadmin' and email 'clientadmin@thermacore.com'
            # Delete the rest
            for user in all_client_admins:
                if user.username != 'clientadmin' or user.email != 'clientadmin@thermacore.com':
                    logger.info(f"Deleting duplicate client admin: {user.username} ({user.email})")
                    conn.execute(
                        text("DELETE FROM users WHERE id = :id"),
                        {"id": user.id}
                    )
                else:
                    logger.info(f"Keeping main client admin: {user.username} ({user.email})")

            # 5. Create or Update the main client admin user
            logger.info("Creating/updating main client admin user...")
            
            user_res = conn.execute(
                text(
                    "SELECT id FROM users WHERE email = 'clientadmin@thermacore.com' OR username = 'clientadmin'"
                )
            ).fetchone()
            
            if not user_res:
                # Create new client admin user
                logger.info("Creating new clientadmin user...")
                password_hash = generate_password_hash(
                    "clientadmin123",
                    method="pbkdf2:sha256"
                )
                client_admin_permissions = json.dumps(
                    [
                        "read_units",
                        "write_units",
                        "read_users",
                        "write_users",
                        "admin_panel",
                        "remote_control",
                    ]
                )
                
                conn.execute(
                    text(
                        """
                        INSERT INTO users (
                            username, email, password_hash, first_name, last_name,
                            role_id, client_id, tenant_id, is_active, registration_status, permissions
                        ) VALUES (
                            'clientadmin', 'clientadmin@thermacore.com', :password_hash, 'Client', 'Admin',
                            :role_id, :client_id, :tenant_id, true, 'approved', :permissions
                        )
                        """
                    ),
                    {
                        "password_hash": password_hash,
                        "role_id": client_admin_role_id,
                        "client_id": client_id,
                        "tenant_id": first_tenant_id,
                        "permissions": client_admin_permissions,
                    }
                )
                logger.info("✓ New clientadmin user created")
            else:
                # Update existing user with correct role and client_id
                logger.info(f"Updating existing clientadmin user (ID: {user_res[0]})...")
                conn.execute(
                    text(
                        """
                        UPDATE users 
                        SET client_id = :client_id, 
                            role_id = :role_id,
                            tenant_id = :tenant_id,
                            is_active = true,
                            registration_status = 'approved',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = :id
                        """
                    ),
                    {
                        "client_id": client_id,
                        "role_id": client_admin_role_id,
                        "tenant_id": first_tenant_id,
                        "id": user_res[0],
                    }
                )
                logger.info(f"✓ Existing clientadmin user updated with client_id: {client_id}")

            # 6. Verify the update
            verify_user = conn.execute(
                text(
                    """
                    SELECT id, username, email, role_id, client_id, tenant_id, first_name, last_name
                    FROM users 
                    WHERE username = 'clientadmin' AND email = 'clientadmin@thermacore.com'
                    """
                )
            ).fetchone()
            
            if verify_user:
                logger.info(f"✓ Verified clientadmin user: {verify_user}")
                logger.info(f"  - Username: {verify_user.username}")
                logger.info(f"  - Email: {verify_user.email}")
                logger.info(f"  - Role ID: {verify_user.role_id}")
                logger.info(f"  - Client ID: {verify_user.client_id}")
                logger.info(f"  - Tenant ID: {verify_user.tenant_id}")
            else:
                logger.error("❌ Verification failed - clientadmin user not found!")

            logger.info("✅ Client admin data fix completed successfully!")
            return True

    except Exception as e:
        logger.exception(f"Error fixing client admin data: {e}")
        return False

def run_fix():
    """Run the fix script with app context."""
    try:
        from app import create_app, db
        
        app = create_app()
        with app.app_context():
            engine = db.engine
            success = fix_client_admin_data(engine)
            
            if success:
                print("\n✅ Client admin fix completed successfully!")
                print("\nYou can now log in as:")
                print("  Username: clientadmin")
                print("  Password: clientadmin123")
                print("  Role: client_admin")
                print("  Client: ACME Energy (ID: 1)")
                print("  Tenants: ACME Sydney, ACME Melbourne, ACME Brisbane")
            else:
                print("\n❌ Client admin fix failed. Check the logs above.")
            
            return success
            
    except Exception as e:
        print(f"\n❌ Error running fix: {e}")
        return False

if __name__ == "__main__":
    # Configure logging to show INFO level
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    run_fix()
