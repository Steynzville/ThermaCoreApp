"""Tests for InputValidator utility class."""
from app.utils.input_validator import InputValidator


class TestSQLInjectionDetection:
    """Test SQL injection detection."""

    def test_detect_union_injection(self):
        """Test detection of UNION-based SQL injection."""
        malicious_input = "1' UNION SELECT * FROM users--"
        assert InputValidator.check_sql_injection(malicious_input) is True

    def test_detect_or_injection(self):
        """Test detection of OR-based SQL injection."""
        malicious_input = "admin' OR '1'='1"
        assert InputValidator.check_sql_injection(malicious_input) is True

    def test_detect_comment_injection(self):
        """Test detection of comment-based SQL injection."""
        malicious_input = "user'; DROP TABLE users--"
        assert InputValidator.check_sql_injection(malicious_input) is True

    def test_safe_input_passes(self):
        """Test that safe input passes SQL injection check."""
        safe_input = "john.doe@example.com"
        assert InputValidator.check_sql_injection(safe_input) is False

    def test_numeric_input_passes(self):
        """Test that numeric input passes."""
        safe_input = "12345"
        assert InputValidator.check_sql_injection(safe_input) is False


class TestXSSDetection:
    """Test XSS detection."""

    def test_detect_script_tag(self):
        """Test detection of script tag."""
        malicious_input = "<script>alert('XSS')</script>"
        assert InputValidator.check_xss(malicious_input) is True

    def test_detect_javascript_protocol(self):
        """Test detection of javascript: protocol."""
        malicious_input = "javascript:alert('XSS')"
        assert InputValidator.check_xss(malicious_input) is True

    def test_detect_event_handler(self):
        """Test detection of event handlers."""
        malicious_input = "<img src=x onerror=alert('XSS')>"
        assert InputValidator.check_xss(malicious_input) is True

    def test_detect_iframe(self):
        """Test detection of iframe tag."""
        malicious_input = "<iframe src='http://evil.com'></iframe>"
        assert InputValidator.check_xss(malicious_input) is True

    def test_safe_html_passes(self):
        """Test that safe text passes XSS check."""
        safe_input = "Hello, this is a normal message"
        assert InputValidator.check_xss(safe_input) is False


class TestPathTraversalDetection:
    """Test path traversal detection."""

    def test_detect_parent_directory(self):
        """Test detection of parent directory traversal."""
        malicious_input = "../../etc/passwd"
        assert InputValidator.check_path_traversal(malicious_input) is True

    def test_detect_windows_path(self):
        """Test detection of Windows path traversal."""
        malicious_input = "..\\..\\windows\\system32"
        assert InputValidator.check_path_traversal(malicious_input) is True

    def test_detect_etc_passwd(self):
        """Test detection of /etc/passwd access."""
        malicious_input = "/etc/passwd"
        assert InputValidator.check_path_traversal(malicious_input) is True

    def test_safe_path_passes(self):
        """Test that safe path passes."""
        safe_input = "files/document.pdf"
        assert InputValidator.check_path_traversal(safe_input) is False


class TestCommandInjectionDetection:
    """Test command injection detection."""

    def test_detect_semicolon(self):
        """Test detection of command chaining with semicolon."""
        malicious_input = "file.txt; rm -rf /"
        assert InputValidator.check_command_injection(malicious_input) is True

    def test_detect_pipe(self):
        """Test detection of command piping."""
        malicious_input = "file.txt | cat /etc/passwd"
        assert InputValidator.check_command_injection(malicious_input) is True

    def test_detect_command_substitution(self):
        """Test detection of command substitution."""
        malicious_input = "file.txt $(whoami)"
        assert InputValidator.check_command_injection(malicious_input) is True

    def test_safe_filename_passes(self):
        """Test that safe filename passes."""
        safe_input = "document.pdf"
        assert InputValidator.check_command_injection(safe_input) is False


class TestComprehensiveValidation:
    """Test comprehensive input validation."""

    def test_validate_safe_input(self):
        """Test validation of safe input."""
        safe_input = "john.doe"
        is_valid, error_msg = InputValidator.validate_input(safe_input)

        assert is_valid is True
        assert error_msg is None

    def test_validate_sql_injection(self):
        """Test validation catches SQL injection."""
        malicious_input = "1' OR '1'='1"
        is_valid, error_msg = InputValidator.validate_input(malicious_input, 'username')

        assert is_valid is False
        assert 'SQL injection' in error_msg
        assert 'username' in error_msg

    def test_validate_xss(self):
        """Test validation catches XSS."""
        malicious_input = "<script>alert('XSS')</script>"
        is_valid, error_msg = InputValidator.validate_input(malicious_input, 'comment')

        assert is_valid is False
        assert 'XSS' in error_msg
        assert 'comment' in error_msg

    def test_validate_path_traversal(self):
        """Test validation catches path traversal."""
        malicious_input = "../../etc/passwd"
        is_valid, error_msg = InputValidator.validate_input(malicious_input, 'filepath')

        assert is_valid is False
        assert 'path traversal' in error_msg
        assert 'filepath' in error_msg

    def test_validate_none_input(self):
        """Test validation handles None input."""
        is_valid, error_msg = InputValidator.validate_input(None)

        assert is_valid is True
        assert error_msg is None


class TestSanitizeForLogging:
    """Test input sanitization for logging."""

    def test_sanitize_script_tag(self):
        """Test sanitization of script tag."""
        input_value = "<script>alert('test')</script>"
        sanitized = InputValidator.sanitize_for_logging(input_value)

        assert '<script>' not in sanitized
        assert '&amp;lt;script&amp;gt;' in sanitized or '&lt;script&gt;' in sanitized

    def test_sanitize_quotes(self):
        """Test sanitization of quotes."""
        input_value = 'He said "Hello" and \'Goodbye\''
        sanitized = InputValidator.sanitize_for_logging(input_value)

        assert '"' not in sanitized
        assert "'" not in sanitized
        assert '&quot;' in sanitized
        assert '&#x27;' in sanitized

    def test_sanitize_newlines(self):
        """Test sanitization of newlines."""
        input_value = "Line 1\nLine 2\rLine 3"
        sanitized = InputValidator.sanitize_for_logging(input_value)

        assert '\n' not in sanitized
        assert '\r' not in sanitized
        assert ' ' in sanitized

    def test_sanitize_long_input(self):
        """Test sanitization truncates long input."""
        input_value = "A" * 1000
        sanitized = InputValidator.sanitize_for_logging(input_value)

        assert len(sanitized) <= 520  # 500 + truncation message
        assert '[truncated]' in sanitized

    def test_sanitize_none(self):
        """Test sanitization of None."""
        sanitized = InputValidator.sanitize_for_logging(None)
        assert sanitized == 'None'


class TestIdentifierValidation:
    """Test identifier validation."""

    def test_valid_identifier(self):
        """Test validation of valid identifier."""
        is_valid, error_msg = InputValidator.validate_identifier("user_123")

        assert is_valid is True
        assert error_msg is None

    def test_identifier_with_dash(self):
        """Test validation of identifier with dash."""
        is_valid, error_msg = InputValidator.validate_identifier("user-id-123")

        assert is_valid is True
        assert error_msg is None

    def test_identifier_with_dot(self):
        """Test validation of identifier with dot."""
        is_valid, error_msg = InputValidator.validate_identifier("user.name")

        assert is_valid is True
        assert error_msg is None

    def test_empty_identifier(self):
        """Test rejection of empty identifier."""
        is_valid, error_msg = InputValidator.validate_identifier("")

        assert is_valid is False
        assert 'empty' in error_msg.lower()

    def test_identifier_with_special_chars(self):
        """Test rejection of identifier with special characters."""
        is_valid, error_msg = InputValidator.validate_identifier("user@123")

        assert is_valid is False
        assert 'invalid characters' in error_msg.lower()

    def test_long_identifier(self):
        """Test rejection of excessively long identifier."""
        is_valid, error_msg = InputValidator.validate_identifier("a" * 256)

        assert is_valid is False
        assert 'too long' in error_msg.lower()

    def test_non_string_identifier(self):
        """Test rejection of non-string identifier."""
        is_valid, error_msg = InputValidator.validate_identifier(12345)

        assert is_valid is False
        assert 'must be a string' in error_msg.lower()


class TestEmailValidation:
    """Test email validation."""

    def test_valid_email(self):
        """Test validation of valid email."""
        is_valid, error_msg = InputValidator.validate_email("user@example.com")

        assert is_valid is True
        assert error_msg is None

    def test_email_with_subdomain(self):
        """Test validation of email with subdomain."""
        is_valid, error_msg = InputValidator.validate_email("user@mail.example.com")

        assert is_valid is True
        assert error_msg is None

    def test_email_with_plus(self):
        """Test validation of email with plus sign."""
        is_valid, error_msg = InputValidator.validate_email("user+tag@example.com")

        assert is_valid is True
        assert error_msg is None

    def test_invalid_email_no_at(self):
        """Test rejection of email without @ sign."""
        is_valid, error_msg = InputValidator.validate_email("userexample.com")

        assert is_valid is False
        assert 'invalid' in error_msg.lower()

    def test_invalid_email_no_domain(self):
        """Test rejection of email without domain."""
        is_valid, error_msg = InputValidator.validate_email("user@")

        assert is_valid is False
        assert 'invalid' in error_msg.lower()

    def test_long_email(self):
        """Test rejection of excessively long email."""
        long_email = "a" * 250 + "@example.com"
        is_valid, error_msg = InputValidator.validate_email(long_email)

        assert is_valid is False
        assert 'too long' in error_msg.lower()

    def test_non_string_email(self):
        """Test rejection of non-string email."""
        is_valid, error_msg = InputValidator.validate_email(12345)

        assert is_valid is False
        assert 'must be a string' in error_msg.lower()


class TestNumericRangeValidation:
    """Test numeric range validation."""

    def test_valid_number_in_range(self):
        """Test validation of valid number in range."""
        is_valid, error_msg = InputValidator.validate_numeric_range(50, 0, 100)

        assert is_valid is True
        assert error_msg is None

    def test_number_at_min_boundary(self):
        """Test validation at minimum boundary."""
        is_valid, error_msg = InputValidator.validate_numeric_range(0, 0, 100)

        assert is_valid is True
        assert error_msg is None

    def test_number_at_max_boundary(self):
        """Test validation at maximum boundary."""
        is_valid, error_msg = InputValidator.validate_numeric_range(100, 0, 100)

        assert is_valid is True
        assert error_msg is None

    def test_number_below_min(self):
        """Test rejection of number below minimum."""
        is_valid, error_msg = InputValidator.validate_numeric_range(-1, 0, 100)

        assert is_valid is False
        assert 'at least' in error_msg.lower()

    def test_number_above_max(self):
        """Test rejection of number above maximum."""
        is_valid, error_msg = InputValidator.validate_numeric_range(101, 0, 100)

        assert is_valid is False
        assert 'at most' in error_msg.lower()

    def test_float_number(self):
        """Test validation of float number."""
        is_valid, error_msg = InputValidator.validate_numeric_range(50.5, 0.0, 100.0)

        assert is_valid is True
        assert error_msg is None

    def test_string_number(self):
        """Test validation of string representation of number."""
        is_valid, error_msg = InputValidator.validate_numeric_range("50", 0, 100)

        assert is_valid is True
        assert error_msg is None

    def test_invalid_number(self):
        """Test rejection of invalid number."""
        is_valid, error_msg = InputValidator.validate_numeric_range("abc", 0, 100)

        assert is_valid is False
        assert 'valid number' in error_msg.lower()

    def test_no_min_constraint(self):
        """Test validation without minimum constraint."""
        is_valid, error_msg = InputValidator.validate_numeric_range(-100, max_val=100)

        assert is_valid is True
        assert error_msg is None

    def test_no_max_constraint(self):
        """Test validation without maximum constraint."""
        is_valid, error_msg = InputValidator.validate_numeric_range(1000, min_val=0)

        assert is_valid is True
        assert error_msg is None
