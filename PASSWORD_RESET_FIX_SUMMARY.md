# Password Reset Validation and API Integration Fix

## Summary
Fixed critical issues in the password reset functionality in `src/components/AdminPanel.jsx` including validation warnings, real-time validation, and API integration.

## Problems Identified

1. **API Token Mismatch**: The `apiFetch.js` utility was looking for `localStorage.getItem('token')` but the application stores the token as `'thermacore_token'`
2. **Redundant API Configuration**: AdminPanel was manually constructing full URLs and adding Authorization headers when the `apiPost` utility already handles this
3. **Incomplete State Reset**: Validation states weren't being properly reset when opening the password reset modal

## Changes Made

### 1. Fixed Token Handling (`src/utils/apiFetch.js`)

**Before:**
```javascript
const token = localStorage.getItem('token');
```

**After:**
```javascript
const token = localStorage.getItem('thermacore_token');
```

This ensures the API utility uses the correct token key that the application stores in localStorage.

### 2. Simplified API Call (`src/components/AdminPanel.jsx`)

**Before:**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://thermacoreapp.onrender.com';
const token = localStorage.getItem('thermacore_token');

const response = await apiPost(
  `${API_BASE_URL}/api/users/${selectedUserForReset.id}/reset-password`,
  { new_password: passwordFormData.newPassword },
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);
```

**After:**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://thermacoreapp.onrender.com';

const response = await apiPost(
  `${API_BASE_URL}/api/users/${selectedUserForReset.id}/reset-password`,
  { new_password: passwordFormData.newPassword }
);
```

The `apiPost` utility now automatically adds the Authorization header using the correct token.

### 3. Complete State Reset (`src/components/AdminPanel.jsx`)

**Before:**
```javascript
const openPasswordResetModal = (user) => {
  setSelectedUserForReset(user);
  setPasswordFormData({ newPassword: "", confirmPassword: "" });
  setPasswordErrors({});
  setShowNewPassword(false);
  setShowConfirmPassword(false);
  setPasswordResetModal(true);
};
```

**After:**
```javascript
const openPasswordResetModal = (user) => {
  setSelectedUserForReset(user);
  setPasswordFormData({ newPassword: "", confirmPassword: "" });
  setPasswordErrors({});
  setShowNewPassword(false);
  setShowConfirmPassword(false);
  setIsValidPassword(false);
  setPasswordsMatch(false);
  setErrorMessage("");
  setPasswordResetModal(true);
};
```

This ensures all validation states are properly initialized when the modal opens.

## Validation Flow

The password reset form now has a single source of truth for validation:

### Password Length Validation
- **State**: `isValidPassword`
- **Updated**: Real-time in `onChange` handler (line 615)
- **Rule**: `newPassword.length >= 6`
- **UI Feedback**: Warning message shown when `passwordFormData.newPassword.length > 0 && !isValidPassword` (lines 691-697)

### Password Match Validation
- **State**: `passwordsMatch`
- **Updated**: Real-time in both `onChange` handlers (lines 616, 655)
- **Rule**: `newPassword === confirmPassword`
- **UI Feedback**: Warning message shown when `passwordFormData.confirmPassword.length > 0 && !passwordsMatch` (lines 699-705)

### Submit Button State
- **Enabled**: `isValidPassword && passwordsMatch && !isResettingPassword`
- **Disabled**: Any validation fails or submission in progress (line 724)

## Test Coverage

### Original Tests (14 tests in `AdminPanel.test.jsx`)
- Component rendering
- Tab navigation
- Modal opening/closing
- Password visibility toggle
- Basic validation checks

### New Comprehensive Tests (7 tests in `AdminPanel.validation.test.jsx`)
1. Shows warning for passwords less than 6 characters
2. Removes warning when password reaches 6 characters
3. Shows mismatch warning in real-time
4. Removes mismatch warning when passwords match
5. Enables button only when both validations pass
6. Successfully submits password reset with valid data
7. Shows error message on API failure

**Total**: 21 tests passing

## API Integration

### Endpoint
```
POST /api/users/{user_id}/reset-password
```

### Request Body
```json
{
  "new_password": "string"
}
```

### Authentication
- Requires valid JWT token in Authorization header
- Requires admin role
- Rate limited: 10 password resets per hour per admin user

### Backend Implementation
Location: `/backend/app/routes/users.py` (lines 429-478)

The endpoint:
1. Validates user exists
2. Validates password length (minimum 6 characters)
3. Updates user password using `user.set_password()`
4. Returns success message

## Testing Verification

### Unit Tests
```bash
npm test -- AdminPanel --run
```
Result: ✓ 21 tests passed

### Build Verification
```bash
npm run build
```
Result: ✓ Build successful with security check passed

### Validation Scenarios Tested

1. **5 characters → Warning shown**
   - Input: "12345"
   - Expected: Warning message + disabled button
   - Result: ✓ Pass

2. **6 characters → Warning removed**
   - Input: "123456"
   - Expected: No warning message + enabled button (if passwords match)
   - Result: ✓ Pass

3. **Mismatched passwords**
   - Input: New="password123", Confirm="password456"
   - Expected: Mismatch warning + disabled button
   - Result: ✓ Pass

4. **Matching passwords (6+ chars)**
   - Input: Both="password123"
   - Expected: No warnings + enabled button
   - Result: ✓ Pass

5. **API Success**
   - Valid password submitted
   - Expected: Success toast + modal closes
   - Result: ✓ Pass

6. **API Failure**
   - API returns error
   - Expected: Error message displayed
   - Result: ✓ Pass

## Benefits

1. **Single Source of Truth**: Validation state (`isValidPassword`, `passwordsMatch`) is the definitive source for all validation logic
2. **Real-time Feedback**: Validation updates on every keystroke
3. **Consistent API Integration**: All API calls use the same token handling mechanism
4. **Better Error Handling**: Clear error messages for both validation and API failures
5. **Comprehensive Testing**: 21 tests ensure reliability

## Future Enhancements

1. **Password Strength Indicator**: Visual indicator showing password strength
2. **Password Requirements Display**: List all requirements (length, special chars, etc.)
3. **Debounced Validation**: Reduce validation frequency for better performance
4. **Backend Validation Sync**: Match frontend validation with backend requirements
5. **Password History**: Prevent reuse of recent passwords
