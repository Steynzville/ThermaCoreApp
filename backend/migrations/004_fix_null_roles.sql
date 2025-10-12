-- Fix NULL role assignments for existing users
-- This is a common cause of 500 errors during authentication
-- Run this if users exist but have NULL role_id

-- First, check for users with NULL role_id
DO $$
DECLARE
    null_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_role_count FROM users WHERE role_id IS NULL;
    
    IF null_role_count > 0 THEN
        RAISE NOTICE '⚠️  Found % user(s) with NULL role_id', null_role_count;
        RAISE NOTICE 'Fixing...';
    ELSE
        RAISE NOTICE '✅ All users have roles assigned';
    END IF;
END $$;

-- Update Steyn_Admin to have admin role if role_id is NULL
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'Steyn_Admin' 
  AND role_id IS NULL;

-- Update any other users without roles to have viewer role (safe default)
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'viewer')
WHERE role_id IS NULL;

-- Verify all users now have roles
DO $$
DECLARE
    null_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_role_count FROM users WHERE role_id IS NULL;
    
    IF null_role_count = 0 THEN
        RAISE NOTICE '✅ All users now have roles assigned';
    ELSE
        RAISE WARNING '⚠️  Still have % user(s) with NULL role_id', null_role_count;
    END IF;
END $$;

-- Display user role assignments
SELECT 
    u.id,
    u.username,
    u.email,
    u.is_active,
    r.name as role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.id;
