# Role Dropdown Fix - Decision Flow

## Before Fix

```
User clicks "Add User" button
        ↓
fetchRoles() is called
        ↓
API GET /api/v1/roles
        ↓
    ┌───────────────┐
    │  response.ok? │
    └───────┬───────┘
            │
    ┌───────┴───────┐
    │               │
   YES             NO
    │               │
    ↓               ↓
Set roles      Do nothing ❌
from API       (no fallback)
    │
    ↓
Show dropdown
```

**Problem**: If API returned non-OK status or empty array, no fallback was applied!

---

## After Fix

```
User clicks "Add User" button
        ↓
fetchRoles() is called
        ↓
API GET /api/v1/roles
        ↓
    ┌───────────────┐
    │  response.ok? │
    └───────┬───────┘
            │
    ┌───────┴───────┐
    │               │
   YES             NO
    │               │
    ↓               ↓
Parse JSON      Set fallback ✅
    │           (admin, operator, viewer)
    ↓
┌────────────────┐
│ Array.length>0?│
└────────┬───────┘
         │
  ┌──────┴──────┐
  │             │
 YES           NO
  │             │
  ↓             ↓
Use API     Set fallback ✅
roles       (admin, operator, viewer)
  │
  ↓
Show dropdown
```

**Exception Handling**: If any error occurs (network, parsing, etc.), fallback is applied ✅

---

## Result

The role dropdown **always** shows all three options:

```
┌─────────────────────────────────────┐
│ Role *                              │
├─────────────────────────────────────┤
│ Select a role                    ▼  │
├─────────────────────────────────────┤
│ Admin                               │
│ Operator                            │
│ Viewer                              │
└─────────────────────────────────────┘
```

## Test Coverage

✅ API returns valid roles → Use API roles  
✅ API returns empty array → Use fallback  
✅ API returns non-OK status → Use fallback  
✅ Network error occurs → Use fallback  
✅ Operator can be selected → Verified  
✅ Viewer can be selected → Verified  

**Total: 6 comprehensive tests, all passing**
