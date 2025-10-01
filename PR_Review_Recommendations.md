## PR Review Recommendations

### 1. Potential Open Redirect/Loop
**Issue:** `apiFetch` redirects to `/login` and uses `history.pushState` based on `window.location` checks. This could interfere with redirect logic if `/login` or `/auth` segments are present in the URL. `localStorage.redirectAfterLogin` cannot be abused for redirect to external origins (it currently stores path only); keep it constrained to same-origin paths. No other clear vulnerabilities found.

### 2. Recommended Focus Areas for Review: Timeout/Retry Scope
**Issue:** The timeout controller and its timer are created outside the retry loop; if a retry is performed, the previous `AbortController` and timeout may not cover subsequent fetch attempts, leading to uncontrolled retries or premature aborts. Consider creating a new `AbortController` and timeout per attempt inside the retry function.

**Proposed Code:**
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), fetchOptions.timeout || 30000);

// Retry logic wrapper
const attemptFetch = async (attemptsLeft) => {
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
    // ... (rest of the code)
    clearTimeout(timeoutId);
  }
  // ... (catch block)
};
```

### 3. Error Heuristics
**Issue:** Network error detection relies on string matching of `error.message`, which can be brittle across browsers and environments. Prefer checking `error.name` (e.g., `TypeError` for network errors) or using a standardized error wrapper to avoid false negatives/positives.

**Proposed Code (partial, from screenshot):**
```javascript
// Network errors with retry logic
if (error.message.includes('fetch') && attemptsLeft > 0) {
  if (optionsToast) {
    toast.warning(`Network error. Retrying in ${retryDelay / 1000} seconds... (${attemptsLeft} attempts left)`);
  }
  await new Promise(resolve => setTimeout(resolve, retryDelay));
  return attemptFetch(attemptsLeft - 1);
}
```

### 4. TZ Awareness Assumption
**Issue:** `utc_now()` returns timezone-aware UTC, but functions compare it directly with provided datetimes; if callers pass naive datetimes, subtraction will raise `TypeError`. Validate/normalize inputs or document strict requirement for aware datetimes to prevent runtime errors in mixed inputs.

**Proposed Code (is_heartbeat_stale function):**
```python
def is_heartbeat_stale(last_heartbeat: Optional[datetime], heartbeat_timeout_seconds: int = 300) -> bool:
    """Check if heartbeat is stale based on timeout threshold.

    Args:
        last_heartbeat: The last heartbeat timestamp (can be None)
        heartbeat_timeout_seconds: Timeout threshold in seconds (default: 300/5 minutes)

    Returns:
        fresh: bool: True if heartbeat is stale, False if fresh
    """
    if not last_heartbeat:
        return True

    time_diff = utc_now() - last_heartbeat
    return time_diff.total_seconds() > heartbeat_timeout_seconds
```

**Proposed Code (get_time_since_last_heartbeat function):**
```python
def get_time_since_last_heartbeat(last_heartbeat: Optional[datetime]) -> Optional[float]:
    """Get time in seconds since last heartbeat.

    Args:
        last_heartbeat: The last heartbeat timestamp (can be None)

    Returns:
        Optional[float]: Time in seconds since last heartbeat, None if no heartbeat
    """
    if not last_heartbeat:
        return None

    time_diff = utc_now() - last_heartbeat
    return time_diff.total_seconds()
```

### 5. Consolidate duplicated `utc_now` utility functions
**Issue:** The `utc_now` function is defined in `backend/app/utils/status_utils.py` but is also imported from `app.models` in other files. To maintain a single source of truth, `status_utils.py` should import `utc_now` from `app.models` instead of redefining it.

**Before:**
`backend/app/utils/status_utils.py`
```python
from datetime import datetime, timezone

def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)

def is_heartbeat_stale(last_heartbeat, ...):
    time_diff = utc_now() - last_heartbeat
    # ...
```
`backend/app/routes/analytics.py`
```python
from app.models import Unit, Sensor, SensorReading, db, utc_now # Use timezone-aware datetime
# ...
def some_route():
    now = utc_now()
    # ...
```

**After:**
`backend/app/utils/status_utils.py`
```python
from datetime import datetime, timezone
from app.models import utc_now # Import from the central location

# The local utc_now function is removed.

def is_heartbeat_stale(last_heartbeat, ...):
    time_diff = utc_now() - last_heartbeat # Use the imported function
    # ...
```
`backend/app/routes/analytics.py`
```python
from app.models import Unit, Sensor, SensorReading, db, utc_now
# ...
def some_route():
    now = utc_now()
    # ...
```

### 6. Prevent TypeError in datetime subtraction
**Issue:** In `is_heartbeat_stale`, add a check to ensure `last_heartbeat` is timezone-aware before comparing it with `utc_now()`, preventing potential `TypeError` exceptions by assuming naive datetimes are UTC.

**Proposed Code:**
`backend/app/utils/status_utils.py`
```python
def is_heartbeat_stale(last_heartbeat: Optional[datetime], heartbeat_timeout_seconds: int = 300) -> bool:
    # ...
    if not last_heartbeat:
        return True

    # Ensure last_heartbeat is timezone-aware to prevent TypeError
    if last_heartbeat.tzinfo is None:
        last_heartbeat = last_heartbeat.replace(tzinfo=timezone.utc)

    time_diff = utc_now() - last_heartbeat
    return time_diff.total_seconds() > heartbeat_timeout_seconds
```

### 7. Refine network error retry condition
**Issue:** Refine the network error retry condition in `apiFetch` to specifically check for `error instanceof TypeError && error.message === 'Failed to fetch'`, avoiding retries on non-transient fetch errors.

**Proposed Code:**
`src/utils/apiFetch.js`
```javascript
// Network errors with retry logic
- if (error.message.includes('fetch') && attemptsLeft > 0) {
+ if (error instanceof TypeError && error.message === 'Failed to fetch' && attemptsLeft > 0) {
  if (optionsToast) {
    toast.warning(`Network error. Medium Retrying in ${retryDelay / 1000} seconds... (${attemptsLeft} attempts left)`);
  }
  await new Promise(resolve => setTimeout(resolve, retryDelay));
  return attemptFetch(attemptsLeft - 1);
}
```

### 8. Avoid redundant timestamp creation
**Issue:** Avoid creating two different timestamps for a single error event by generating the timestamp once in `ProtocolStatus.record_error` and passing it to the `record_error` utility function.

**Proposed Code:**
`backend/app/protocols/base.py`
```python
def record_error(self, error_code: str, error_message: str = None, context: Dict[str, Any] = None) -> None:
    """Record an error with enhanced context and timestamp."""
    self.error = record_error(error_code, error_message, context)
-   self.last_error_time = utc_now()
+   now = utc_now()
+   self.error = record_error(error_code, error_message, context, timestamp=now)
+   self.last_error_time = now
    self.status = "error"
    self.update_availability_level()
```
