# Verification Steps for Admin Panel User Creation

## Overview

This document provides step-by-step instructions to verify that the Admin Panel can properly create admin, operator, and viewer accounts with correct backend roles.

## Prerequisites

1. Backend server running and accessible
2. Admin user credentials available
3. Frontend development server running (or production build deployed)

## Verification Procedure

### Step 1: Access Admin Panel

1. Log in to the application as an admin user
2. Navigate to the Admin Panel (usually via Settings or Admin menu)
3. Ensure you see the "Users" tab

**Expected Result:** Admin Panel loads successfully with Users, Password Management, and Settings tabs visible.

### Step 2: Check User Creation Form

1. Click the "Add User" button in the Users tab
2. Verify the modal appears with the following fields:
   - Username (required, marked with *)
   - Email (required, marked with *)
   - Password (required, marked with *, includes show/hide toggle)
   - First Name (optional)
   - Last Name (optional)
   - Role dropdown (required, marked with *)

**Expected Result:** Modal titled "Create New User" appears with all fields properly labeled.

### Step 3: Verify Role Dropdown Options

1. Click on the Role dropdown
2. Verify the following options are available:
   - Admin
   - Operator
   - Viewer

**Expected Result:** All three roles are visible in the dropdown.

### Step 4: Test Form Validation

#### Test Empty Fields
1. Try clicking "Create User" without filling any fields
2. **Expected:** Error toast appears: "Please fill in all required fields"

#### Test Short Password
1. Fill in username, email, and select a role
2. Enter password with less than 6 characters (e.g., "12345")
3. Click "Create User"
4. **Expected:** Error toast appears: "Password must be at least 6 characters long"

### Step 5: Create Test Operator Account

1. Fill in the form:
   - Username: `test_operator`
   - Email: `operator@test.com`
   - Password: `operator123`
   - First Name: `Test`
   - Last Name: `Operator`
   - Role: Select **Operator**

2. Click "Create User"

**Expected Results:**
- Success toast appears: "User test_operator created successfully"
- Modal closes
- New user appears in the user list with:
  - Name: "Test Operator"
  - Email: "operator@test.com"
  - Role badge: "Operator"
  - Status: "Active"

### Step 6: Create Test Viewer Account

1. Click "Add User" again
2. Fill in the form:
   - Username: `test_viewer`
   - Email: `viewer@test.com`
   - Password: `viewer123`
   - First Name: `Test`
   - Last Name: `Viewer`
   - Role: Select **Viewer**

3. Click "Create User"

**Expected Results:**
- Success toast appears: "User test_viewer created successfully"
- Modal closes
- New user appears in the user list with:
  - Name: "Test Viewer"
  - Email: "viewer@test.com"
  - Role badge: "Viewer"
  - Status: "Active"

### Step 7: Verify Backend Persistence

1. Open browser developer console (F12)
2. Go to Application/Storage → LocalStorage
3. Note the current admin user details
4. Log out from the admin account

**Expected:** Logged out successfully, redirected to login page.

### Step 8: Test Operator Account Login and Permissions

1. Log in with operator credentials:
   - Username: `test_operator`
   - Password: `operator123`

2. Navigate to the Dashboard or Units page
3. Select any unit
4. Look for remote control options/buttons

**Expected Results:**
- Login successful
- User logged in as "Test Operator"
- **Remote control options ARE visible** (operators can control units)
- Dashboard shows unit information
- Cannot access Admin Panel (if attempted, should show permission error)

### Step 9: Test Viewer Account Login and Permissions

1. Log out from operator account
2. Log in with viewer credentials:
   - Username: `test_viewer`
   - Password: `viewer123`

3. Navigate to the Dashboard or Units page
4. Select any unit
5. Look for remote control options/buttons

**Expected Results:**
- Login successful
- User logged in as "Test Viewer"
- **Remote control options are NOT visible** (viewers are read-only)
- Dashboard shows unit information
- Can view data but cannot modify anything
- Cannot access Admin Panel (if attempted, should show permission error)

### Step 10: Verify Backend Database

If you have access to the backend database:

1. Connect to the database
2. Query the users table:
   ```sql
   SELECT id, username, email, first_name, last_name, role_id, is_active 
   FROM users 
   WHERE username IN ('test_operator', 'test_viewer');
   ```

**Expected Results:**
- Both users exist in the database
- `test_operator` has role_id = 2 (operator role)
- `test_viewer` has role_id = 3 (viewer role)
- Both users have `is_active = true`
- Password hashes are properly stored

### Step 11: Create Admin Account (Optional)

1. Log back in as admin
2. Create a test admin account with role "Admin"
3. Log in with the new admin account
4. Verify full admin permissions:
   - Can access Admin Panel
   - Can create/edit users
   - Can control units
   - Can view all data

## Cleanup

After verification, you may want to:

1. Log back in as the original admin
2. Go to Admin Panel → Users
3. Deactivate or delete test accounts (test_operator, test_viewer)

## Troubleshooting

### Issue: "Add User" button doesn't open modal
- **Solution:** Check browser console for JavaScript errors
- Verify PageHeader component is properly imported
- Check if there are any CSS/styling issues

### Issue: Roles dropdown is empty or shows "Select a role" only
- **Solution:** Check backend connection
- Verify `/api/v1/roles` endpoint is accessible
- Check browser network tab for failed requests
- Backend should return roles: `[{id: 1, name: 'admin'}, {id: 2, name: 'operator'}, {id: 3, name: 'viewer'}]`

### Issue: User creation fails with network error
- **Solution:** Verify backend is running and accessible
- Check `VITE_API_BASE_URL` environment variable
- Verify CORS is properly configured on backend
- Check backend logs for errors

### Issue: User created but can't log in
- **Solution:** Verify password was correctly sent to backend
- Check backend password hashing is working
- Verify user is marked as active in database
- Check if JWT tokens are being generated correctly

### Issue: Permissions not working correctly
- **Solution:** Clear browser cache and localStorage
- Log out and log back in
- Verify backend is returning correct role in JWT token
- Check `src/utils/permissions.js` for role-based permission logic

## Success Criteria

✅ All three roles (admin, operator, viewer) can be selected in the dropdown  
✅ Users can be created with all three roles  
✅ Created users appear in the user list with correct role badges  
✅ Users persist in the backend database with correct role_id  
✅ Operator users can see remote control options  
✅ Viewer users cannot see remote control options  
✅ Role-based permissions work correctly after login  
✅ Form validation works as expected  
✅ Success and error messages display properly  

## Notes

- The original prompt-based user creation has been completely replaced
- All user creation now goes through the backend API
- Passwords are securely hashed on the backend
- JWT authentication is required for user creation
- Only admin users can create new users
- The implementation follows existing code patterns and best practices

## Related Files

- `src/components/AdminPanel.jsx` - Main implementation
- `backend/app/routes/auth.py` - Backend user creation endpoint
- `backend/app/models/__init__.py` - User and Role models
- `src/utils/permissions.js` - Permission checking functions
- `src/utils/apiFetch.js` - API request utility
