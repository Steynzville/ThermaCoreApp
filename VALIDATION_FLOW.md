# Password Reset Validation Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER OPENS PASSWORD MODAL                    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Initial State Reset  │
                    │ • newPassword = ""    │
                    │ • confirmPassword=""  │
                    │ • isValidPassword=❌  │
                    │ • passwordsMatch=❌   │
                    │ • errorMessage=""     │
                    └───────────┬───────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────┐
        │      USER TYPES IN PASSWORD FIELD         │
        └───────────────┬───────────────────────────┘
                        │
                        ├─────────────────┬─────────────────┐
                        ▼                 ▼                 ▼
              ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
              │   < 6 chars  │  │   = 6 chars  │  │   > 6 chars  │
              └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                     │                 │                 │
                     ▼                 ▼                 ▼
            ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
            │ isValidPassword│ │ isValidPassword│ │ isValidPassword│
            │      = ❌      │ │      = ✅      │ │      = ✅      │
            └────────┬───────┘ └────────┬───────┘ └────────┬───────┘
                     │                 │                 │
                     ▼                 ▼                 ▼
            ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
            │⚠️ Show Warning │ │✅ Hide Warning │ │✅ Hide Warning │
            │    (Yellow)    │ │                │ │                │
            └────────────────┘ └────────────────┘ └────────────────┘


        ┌───────────────────────────────────────────┐
        │    USER TYPES IN CONFIRM PASSWORD FIELD   │
        └───────────────┬───────────────────────────┘
                        │
                        ├──────────────────┬──────────────────┐
                        ▼                  ▼                  ▼
              ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
              │   No Input   │   │  Mismatched  │   │   Matched    │
              └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
                     │                  │                  │
                     ▼                  ▼                  ▼
            ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
            │ passwordsMatch │  │ passwordsMatch │  │ passwordsMatch │
            │      = ❌      │  │      = ❌      │  │      = ✅      │
            └────────┬───────┘  └────────┬───────┘  └────────┬───────┘
                     │                  │                  │
                     ▼                  ▼                  ▼
            ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
            │                │  │⚠️ Show Warning │  │✅ Hide Warning │
            │                │  │    (Yellow)    │  │                │
            └────────────────┘  └────────────────┘  └────────────────┘


        ┌───────────────────────────────────────────┐
        │           SUBMIT BUTTON STATE             │
        └───────────────┬───────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────┐
        │  if (!isValidPassword || !passwordsMatch  │
        │       || isResettingPassword)             │
        └───────────────┬───────────────────────────┘
                        │
                ┌───────┴───────┐
                ▼               ▼
        ┌──────────────┐ ┌──────────────┐
        │   DISABLED   │ │   ENABLED    │
        │   (Gray)     │ │   (Blue)     │
        └──────┬───────┘ └──────┬───────┘
               │                │
               │                ▼
               │     ┌──────────────────────┐
               │     │   USER CLICKS SUBMIT │
               │     └──────────┬───────────┘
               │                │
               │                ▼
               │     ┌──────────────────────┐
               │     │  isResettingPassword │
               │     │        = ✅          │
               │     │  (Show spinner)      │
               │     └──────────┬───────────┘
               │                │
               │                ▼
               │     ┌──────────────────────┐
               │     │    API POST Call     │
               │     │  /api/users/{id}/    │
               │     │  reset-password      │
               │     └──────────┬───────────┘
               │                │
               │        ┌───────┴───────┐
               │        ▼               ▼
               │  ┌──────────┐   ┌──────────┐
               │  │ Success  │   │  Error   │
               │  └────┬─────┘   └────┬─────┘
               │       │              │
               │       ▼              ▼
               │  ┌──────────┐   ┌──────────┐
               │  │✅ Toast  │   │❌ Show   │
               │  │ Success  │   │ Error    │
               │  │ Message  │   │ Message  │
               │  └────┬─────┘   └────┬─────┘
               │       │              │
               │       ▼              │
               │  ┌──────────┐       │
               │  │  Close   │       │
               └─▶│  Modal   │◀──────┘
                  └──────────┘
```

## State Variables (Single Source of Truth)

### 1. `isValidPassword`
- **Purpose**: Track if password meets minimum length requirement
- **Updated**: Real-time in newPassword onChange handler
- **Rule**: `newPassword.length >= 6`
- **Used By**: 
  - Warning message display (lines 691-697)
  - Button disabled state (line 724)
  - Form submission validation (line 172)

### 2. `passwordsMatch`
- **Purpose**: Track if passwords match
- **Updated**: Real-time in both onChange handlers
- **Rule**: `newPassword === confirmPassword`
- **Used By**:
  - Warning message display (lines 699-705)
  - Button disabled state (line 724)
  - Form submission validation (line 175)

### 3. `errorMessage`
- **Purpose**: Store API or validation errors
- **Updated**: 
  - Cleared in onChange handlers
  - Set on form submission validation failure
  - Set on API error
- **Used By**: Error message display (lines 683-689)

### 4. `isResettingPassword`
- **Purpose**: Track API request in progress
- **Updated**: Set to true before API call, set to false in finally block
- **Used By**: 
  - Button disabled state (line 724)
  - Spinner display (lines 731-733)
  - Button text change (line 734)

## Validation Rules

### Password Length
```javascript
const isValid = newPassword.length >= 6;
```
- ✅ Meets requirement: 6+ characters
- ❌ Fails requirement: < 6 characters

### Password Match
```javascript
const match = newPassword === confirmPassword && confirmPassword.length > 0;
```
- ✅ Meets requirement: Both fields have same value
- ❌ Fails requirement: Values differ or confirm is empty

### Form Submission
```javascript
const canSubmit = isValidPassword && passwordsMatch && !isResettingPassword;
```
- ✅ Can submit: All validations pass and not already submitting
- ❌ Cannot submit: Any validation fails or submission in progress

## UI Feedback

### Warning Messages
| Condition | Message | Color | Location |
|-----------|---------|-------|----------|
| `length > 0 && length < 6` | "Password must be at least 6 characters long" | Yellow | Below password field |
| `confirmPassword.length > 0 && !match` | "Passwords do not match" | Yellow | Below confirm field |
| API error | Error from API response | Red | Above buttons |

### Button States
| Condition | State | Color | Action |
|-----------|-------|-------|--------|
| `!isValidPassword` | Disabled | Gray | None |
| `!passwordsMatch` | Disabled | Gray | None |
| `isResettingPassword` | Disabled | Blue | Shows spinner |
| All validations pass | Enabled | Blue | Submits form |

### Static Info
- Always visible blue info box with minimum password requirement
- Located below password fields (line 707-711)
- Not part of validation feedback, just informational

## Real-time Updates

Every keystroke in password fields triggers:
1. Update form data state
2. Recalculate validation states
3. Clear any existing errors
4. Re-render UI with new validation state
5. Update button enabled/disabled state

This ensures users get immediate feedback on their input.
