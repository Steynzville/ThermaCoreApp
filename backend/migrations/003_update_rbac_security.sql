-- Migration to update RBAC permissions for enhanced security
-- This migration removes write/delete permissions from operator role
-- and remote_control permission from viewer role per security review

-- Remove all current operator permissions to rebuild securely
DELETE FROM role_permissions 
WHERE role_id = (SELECT id FROM roles WHERE name = 'operator');

-- Remove all current viewer permissions to rebuild securely
DELETE FROM role_permissions 
WHERE role_id = (SELECT id FROM roles WHERE name = 'viewer');

-- Re-assign operator role permissions (read-only + remote control)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'operator' AND p.name IN ('read_units', 'read_users', 'remote_control')
ON CONFLICT DO NOTHING;

-- Re-assign viewer role permissions (read-only, no remote control)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.name IN ('read_units', 'read_users')
ON CONFLICT DO NOTHING;

-- Update role descriptions to reflect security model
UPDATE roles SET description = 'ThermaCore staff only - Full system administration with all permissions'
WHERE name = 'admin';

UPDATE roles SET description = 'Client power users - Read-only access with remote control capabilities'
WHERE name = 'operator';

UPDATE roles SET description = 'Client read-only users - View-only access to system data'
WHERE name = 'viewer';
