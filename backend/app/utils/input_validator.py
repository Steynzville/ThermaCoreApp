"""Input validation utilities to prevent injection attacks and ensure data integrity."""
import re
from typing import Any, Optional


class InputValidator:
    """Provides methods to validate and sanitize user input."""

    # Dangerous patterns that could indicate injection attacks
    SQL_INJECTION_PATTERNS = [
        re.compile(r"(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)", re.IGNORECASE),
        re.compile(r"(--|\#|\/\*|\*\/|;)", re.IGNORECASE),
        re.compile(r"(\bOR\b|\bAND\b)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?", re.IGNORECASE),
        re.compile(r"['\"][^'\"]*['\"]?\s*(OR|AND)\s+['\"]?[^'\"]*['\"]?\s*=\s*['\"]?", re.IGNORECASE),
    ]

    XSS_PATTERNS = [
        re.compile(r"<script[^>]*>.*?</script(?:\s[^>]*)?>", re.IGNORECASE | re.DOTALL),
        re.compile(r"javascript:", re.IGNORECASE),
        re.compile(r"on\w+\s*=", re.IGNORECASE),  # Event handlers like onclick, onload
        re.compile(r"<iframe", re.IGNORECASE),
        re.compile(r"<object", re.IGNORECASE),
        re.compile(r"<embed", re.IGNORECASE),
    ]

    PATH_TRAVERSAL_PATTERNS = [
        re.compile(r"\.\.[/\\]"),  # Directory traversal
        re.compile(r"[/\\]etc[/\\]passwd", re.IGNORECASE),
        re.compile(r"[/\\]windows[/\\]", re.IGNORECASE),
    ]

    COMMAND_INJECTION_PATTERNS = [
        re.compile(r"[;&|`$()]"),  # Shell metacharacters
        re.compile(r"\$\{[^}]*\}"),  # Variable expansion
        re.compile(r"\$\([^)]*\)"),  # Command substitution
    ]

    @classmethod
    def check_sql_injection(cls, value: str) -> bool:
        """Check if input contains potential SQL injection patterns.

        Args:
            value: Input string to check

        Returns:
            True if suspicious patterns found, False otherwise
        """
        if not isinstance(value, str):
            return False

        for pattern in cls.SQL_INJECTION_PATTERNS:
            if pattern.search(value):
                return True
        return False

    @classmethod
    def check_xss(cls, value: str) -> bool:
        """Check if input contains potential XSS attack patterns.

        Args:
            value: Input string to check

        Returns:
            True if suspicious patterns found, False otherwise
        """
        if not isinstance(value, str):
            return False

        for pattern in cls.XSS_PATTERNS:
            if pattern.search(value):
                return True
        return False

    @classmethod
    def check_path_traversal(cls, value: str) -> bool:
        """Check if input contains path traversal patterns.

        Args:
            value: Input string to check

        Returns:
            True if suspicious patterns found, False otherwise
        """
        if not isinstance(value, str):
            return False

        for pattern in cls.PATH_TRAVERSAL_PATTERNS:
            if pattern.search(value):
                return True
        return False

    @classmethod
    def check_command_injection(cls, value: str) -> bool:
        """Check if input contains command injection patterns.

        Args:
            value: Input string to check

        Returns:
            True if suspicious patterns found, False otherwise
        """
        if not isinstance(value, str):
            return False

        for pattern in cls.COMMAND_INJECTION_PATTERNS:
            if pattern.search(value):
                return True
        return False

    @classmethod
    def validate_input(cls, value: Any, context: str = 'input') -> tuple[bool, Optional[str]]:
        """Comprehensive input validation against common injection attacks.

        Args:
            value: Input value to validate
            context: Context description for error messages

        Returns:
            Tuple of (is_valid, error_message)
            - is_valid: True if input passes all checks
            - error_message: Description of validation failure, or None if valid
        """
        if value is None:
            return True, None

        # Convert to string for pattern matching
        str_value = str(value)

        # Check for SQL injection
        if cls.check_sql_injection(str_value):
            return False, f"Potential SQL injection detected in {context}"

        # Check for XSS
        if cls.check_xss(str_value):
            return False, f"Potential XSS attack detected in {context}"

        # Check for path traversal
        if cls.check_path_traversal(str_value):
            return False, f"Potential path traversal detected in {context}"

        # Check for command injection
        if cls.check_command_injection(str_value):
            return False, f"Potential command injection detected in {context}"

        return True, None

    @classmethod
    def sanitize_for_logging(cls, value: Any) -> str:
        """Sanitize input value for safe logging.

        This removes or escapes potentially dangerous characters while
        preserving readability for logging purposes.

        Args:
            value: Input value to sanitize

        Returns:
            Sanitized string safe for logging
        """
        if value is None:
            return 'None'

        str_value = str(value)

        # Replace dangerous characters with safe alternatives
        replacements = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#x27;',
            '\r': '',
            '\n': ' ',
            '\0': '',
        }

        for char, replacement in replacements.items():
            str_value = str_value.replace(char, replacement)

        # Limit length to prevent log flooding
        max_length = 500
        if len(str_value) > max_length:
            str_value = str_value[:max_length] + '...[truncated]'

        return str_value

    @classmethod
    def validate_identifier(cls, value: str, context: str = 'identifier') -> tuple[bool, Optional[str]]:
        """Validate that input is a safe identifier (alphanumeric, underscore, dash).

        Useful for validating IDs, usernames, resource names, etc.

        Args:
            value: Input string to validate
            context: Context description for error messages

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not isinstance(value, str):
            return False, f"{context} must be a string"

        if not value:
            return False, f"{context} cannot be empty"

        # Allow only alphanumeric, underscore, dash, and dot
        if not re.match(r'^[a-zA-Z0-9_.-]+$', value):
            return False, f"{context} contains invalid characters"

        # Prevent excessively long identifiers
        if len(value) > 255:
            return False, f"{context} is too long (max 255 characters)"

        return True, None

    @classmethod
    def validate_email(cls, email: str) -> tuple[bool, Optional[str]]:
        """Validate email format.

        Args:
            email: Email address to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not isinstance(email, str):
            return False, "Email must be a string"

        # Basic email validation pattern
        email_pattern = re.compile(
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        )

        if not email_pattern.match(email):
            return False, "Invalid email format"

        if len(email) > 254:  # RFC 5321
            return False, "Email address is too long"

        return True, None

    @classmethod
    def validate_numeric_range(cls, value: Any, min_val: Optional[float] = None, 
                              max_val: Optional[float] = None, 
                              context: str = 'value') -> tuple[bool, Optional[str]]:
        """Validate that a numeric value is within specified range.

        Args:
            value: Value to validate
            min_val: Minimum allowed value (inclusive)
            max_val: Maximum allowed value (inclusive)
            context: Context description for error messages

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            num_value = float(value)
        except (ValueError, TypeError):
            return False, f"{context} must be a valid number"

        if min_val is not None and num_value < min_val:
            return False, f"{context} must be at least {min_val}"

        if max_val is not None and num_value > max_val:
            return False, f"{context} must be at most {max_val}"

        return True, None
