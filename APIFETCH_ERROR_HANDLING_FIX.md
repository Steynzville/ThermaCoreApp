# API Fetch Error Handling Improvement

## Summary

This document describes the implementation of robust error handling in `src/utils/apiFetch.js` to prevent runtime errors when processing error messages during network error detection.

## Problem Statement

The original implementation on line 159 called `error.message.toLowerCase()` directly:

```javascript
const isNetworkError = error instanceof TypeError && 
  NETWORK_ERROR_PATTERNS.some(pattern => 
    error.message.toLowerCase().includes(pattern)
  );
```

### Potential Issues

1. **`error.message` can be `undefined`**: Not all Error objects are guaranteed to have a `message` property
2. **`error.message` can be `null`**: Error objects can be created with null message
3. **`error.message` might not be a string**: While unlikely, JavaScript allows setting message to any type
4. **Calling `toLowerCase()` on non-string values**: Would throw a TypeError, causing the error handling itself to fail

## Solution

Implemented safe string conversion before calling `toLowerCase()`:

```javascript
// Safely convert error.message to string to handle edge cases where it might be undefined, null, or non-string
const errorMessage = String(error.message || '').toLowerCase();
const isNetworkError = error instanceof TypeError && 
  NETWORK_ERROR_PATTERNS.some(pattern => 
    errorMessage.includes(pattern)
  );
```

### How It Works

1. **`error.message || ''`**: If `error.message` is `undefined`, `null`, or any falsy value, use empty string
2. **`String(...)`**: Explicitly convert to string, handling edge cases like numbers or objects
3. **`.toLowerCase()`**: Now safe to call on the guaranteed string value
4. **Separate variable**: Extract to `errorMessage` for better readability and single responsibility

## Test Coverage

Added comprehensive test cases to verify the fix handles all edge cases:

1. **Undefined message**: Error with no message property
2. **Null message**: Error with null message
3. **Number message**: Error with numeric message
4. **Object message**: Error with object as message
5. **Empty string message**: Error with empty string message

All tests verify that:
- The code doesn't throw errors when processing edge cases
- Non-network errors are correctly identified and don't trigger retry logic
- The function fails gracefully without crashing

## Benefits

### Robustness
- **Prevents cascading failures**: Error handling code won't itself throw errors
- **Handles all JavaScript edge cases**: Works with any value type for error.message
- **Production-safe**: No risk of runtime crashes in error paths

### Maintainability
- **Clear intent**: Explicit string conversion makes behavior obvious
- **Self-documenting**: Comment explains why the conversion is needed
- **Single responsibility**: Error message processing separated from pattern matching

### Performance
- **Minimal overhead**: String conversion is very fast
- **No regex or complex operations**: Simple string operations only
- **Same patterns used**: No change to the network error detection logic

## Backward Compatibility

This change is 100% backward compatible:
- All valid error messages work exactly as before
- Network error detection patterns unchanged
- API and behavior remain identical for normal cases
- Only adds safety for edge cases that would have crashed

## Related Files

- **Implementation**: `src/utils/apiFetch.js` (line 157-162)
- **Tests**: `src/tests/apiFetch.test.js` (5 new edge case tests added)
- **Documentation**: This file

## Testing

Run the test suite to verify the fix:

```bash
npm test -- src/tests/apiFetch.test.js --run
```

Expected result: 15 tests pass (10 original + 5 new edge case tests)

## References

- Network error patterns are defined at the top of `apiFetch.js`
- Error handling follows the same security-aware patterns used in backend error handling
- Aligns with best practices from `backend/app/utils/error_handler.py`
