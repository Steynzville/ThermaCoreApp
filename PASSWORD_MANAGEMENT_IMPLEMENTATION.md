# Password Management Tab Implementation

## Overview
This document describes the implementation of the Password Management feature in the AdminPanel component, which allows administrators to reset user passwords and change their own password through a secure, validated interface.

## Features Implemented

### 1. New Password Management Tab
- **Location**: Between "Users" and "Settings" tabs in the AdminPanel
- **Icon**: Key icon from lucide-react
- **Access**: Available to admin users only

### 2. Self Password Reset
- **Button**: "Change My Password" button for logged-in admin
- **Icon**: Lock icon
- **Functionality**: Opens the password reset modal with the current admin's information pre-populated

### 3. User Password Reset Table
- **Display**: Lists all users with their name, email, and role
- **Action**: Each user has a "Reset Password" button
- **Functionality**: Opens the password reset modal for the selected user

### 4. Password Reset Modal
The modal includes the following features:

#### Input Fields
- **New Password**: Password input field with visibility toggle
- **Confirm Password**: Password confirmation field with visibility toggle
- **Eye Icons**: Toggle between showing/hiding password text

#### Validation
- **Required Fields**: Both password fields must be filled
- **Minimum Length**: Password must be at least 6 characters long
- **Matching Validation**: Both password fields must match
- **Real-time Feedback**: Errors clear as user types

#### Visual Feedback
- **Error Messages**: Red border and error text below invalid fields
- **Info Banner**: Blue banner showing password requirements
- **Loading State**: Spinner shown during API call with "Resetting..." text
- **Disabled State**: Buttons disabled during password reset

### 5. Backend API Integration
- **Endpoint**: `POST /api/users/{id}/reset-password`
- **Headers**: Authorization Bearer token from localStorage
- **Body**: `{ "new_password": "user_entered_password" }`
- **Rate Limiting**: 10 password resets per hour per admin user
- **Response Handling**: 
  - Success: Toast notification with success message
  - Error: Toast notification with error message from server
  - Network Error: Generic error message with toast notification
  - Rate Limit Exceeded: 429 status with retry information

### 6. Error Handling
- **Network Errors**: Caught and displayed with toast notifications
- **Backend Errors**: Server error messages displayed to user
- **Validation Errors**: Client-side validation prevents invalid API calls

## Technical Implementation

### State Management
```javascript
// Password Management State
const [passwordResetModal, setPasswordResetModal] = useState(false);
const [selectedUserForReset, setSelectedUserForReset] = useState(null);
const [passwordFormData, setPasswordFormData] = useState({
  newPassword: "",
  confirmPassword: "",
});
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [passwordErrors, setPasswordErrors] = useState({});
const [isResettingPassword, setIsResettingPassword] = useState(false);
```

### Key Functions
1. **openPasswordResetModal(user)**: Opens modal with user context
2. **closePasswordResetModal()**: Closes modal and resets state
3. **validatePasswordForm()**: Validates password fields
4. **handlePasswordReset()**: Submits password reset to API
5. **handleSelfPasswordReset()**: Opens modal for current admin user

### API Integration
```javascript
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

## User Experience

### Password Reset Flow
1. Admin navigates to "Password Management" tab
2. Admin clicks "Change My Password" or "Reset Password" for a user
3. Modal opens with two password input fields
4. Admin enters and confirms the new password
5. Eye icons allow toggling password visibility
6. Real-time validation provides immediate feedback
7. Admin clicks "Reset Password" button
8. Loading state shows progress
9. Success/error toast notification appears
10. Modal closes on success

### Validation Messages
- "Password is required" - When field is empty
- "Password must be at least 6 characters long" - When password is too short
- "Please confirm your password" - When confirm field is empty
- "Passwords do not match" - When passwords don't match

## Testing

### Test Coverage
- Tab rendering and navigation
- Modal opening/closing
- Password visibility toggles
- Password validation (minimum length)
- Password matching validation
- User list display
- Existing tab functionality preservation

### Test Files
- `src/tests/AdminPanel.test.jsx` - Comprehensive test suite for AdminPanel component

## Dependencies
- **lucide-react**: Icons (Eye, EyeOff, Key, Lock)
- **sonner**: Toast notifications
- **AuthContext**: Current user information
- **apiFetch utility**: API request handling

## Browser Compatibility
- Modern browsers with ES6+ support
- Dark mode support included
- Responsive design for mobile/tablet

## Security Considerations
1. **Token-based Authentication**: Uses Bearer token for API requests
2. **Client-side Validation**: Prevents invalid data from being sent
3. **Server-side Validation**: Backend enforces password requirements
4. **No Password Exposure**: Passwords masked by default with toggle option
5. **Error Message Security**: Generic error messages for network failures
6. **Rate Limiting**: Password reset endpoint limited to 10 requests per hour per admin user to prevent brute force attacks and abuse

## Future Enhancements
- Password strength meter
- Password history tracking
- Password expiration policies
- Two-factor authentication integration
- Audit logging for password resets

## Backend API Requirements

### Endpoint
```
POST /api/users/{id}/reset-password
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Body
```json
{
  "new_password": "string (min 6 characters)"
}
```

### Success Response (200)
```json
{
  "message": "Password reset successfully"
}
```

### Error Responses
- **400**: Validation error
- **404**: User not found
- **401**: Unauthorized (no valid token)
- **429**: Rate limit exceeded (max 10 resets per hour per admin)
- **500**: Server error

### Rate Limiting
The password reset endpoint is protected with rate limiting to prevent abuse:
- **Limit**: 10 password resets per hour per admin user
- **Tracking**: Per authenticated admin user (not by IP)
- **Response Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
  - `X-RateLimit-Window`: Time window in seconds
- **429 Response**: Includes retry information and time until reset

## File Changes
### Frontend
- **Modified**: `src/components/AdminPanel.jsx`
  - Added Password Management tab
  - Implemented password reset modal
  - Integrated with backend API
  - Added validation and error handling

- **Created**: `src/tests/AdminPanel.test.jsx`
  - Comprehensive test suite for new functionality

### Backend
- **Modified**: `backend/app/routes/users.py`
  - Added rate limiting to password reset endpoint
  - Imported rate_limit decorator from middleware
  - Applied `@rate_limit(limit=10, window_seconds=3600, per="user")` to `reset_user_password` endpoint

## Maintenance Notes
- Password requirements (minimum length) should match backend validation
- API endpoint URL configured via `VITE_API_BASE_URL` environment variable
- Token stored in localStorage as `thermacore_token`
- Toast notifications use sonner library
