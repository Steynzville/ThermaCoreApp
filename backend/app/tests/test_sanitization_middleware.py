"""Tests for centralized sanitization middleware."""
import pytest
from flask import Flask, request, jsonify
from werkzeug.datastructures import ImmutableMultiDict

from app.middleware.validation import sanitize


class TestSanitizeFunction:
    """Test the sanitize() function."""
    
    def test_sanitize_string_with_control_chars(self):
        """Test sanitizing string with control characters."""
        input_str = "test\nvalue\rwith\ttabs"
        expected = "testvaluewithttabs"
        assert sanitize(input_str) == expected
    
    def test_sanitize_clean_string(self):
        """Test sanitizing string without control characters."""
        input_str = "clean string"
        assert sanitize(input_str) == input_str
    
    def test_sanitize_dict(self):
        """Test sanitizing dictionary values."""
        input_dict = {
            'key1': 'value\nwith\nnewlines',
            'key2': 'clean',
            'key3': 'tabs\there'
        }
        expected = {
            'key1': 'valuewithnewlines',
            'key2': 'clean',
            'key3': 'tabshere'
        }
        assert sanitize(input_dict) == expected
    
    def test_sanitize_nested_dict(self):
        """Test sanitizing nested dictionary."""
        input_dict = {
            'outer': {
                'inner': 'value\nwith\nnewlines',
                'clean': 'no issues'
            }
        }
        expected = {
            'outer': {
                'inner': 'valuewithnewlines',
                'clean': 'no issues'
            }
        }
        assert sanitize(input_dict) == expected
    
    def test_sanitize_list(self):
        """Test sanitizing list items."""
        input_list = ['clean', 'with\nnewline', 'and\ttab']
        expected = ['clean', 'withnewline', 'andtab']
        assert sanitize(input_list) == expected
    
    def test_sanitize_list_of_dicts(self):
        """Test sanitizing list containing dictionaries."""
        input_list = [
            {'key': 'value\n'},
            {'key': 'clean'}
        ]
        expected = [
            {'key': 'value'},
            {'key': 'clean'}
        ]
        assert sanitize(input_list) == expected
    
    def test_sanitize_non_string_types(self):
        """Test that non-string types are returned unchanged."""
        assert sanitize(123) == 123
        assert sanitize(45.67) == 45.67
        assert sanitize(True) is True
        assert sanitize(None) is None
    
    def test_sanitize_log_injection_attempt(self):
        """Test sanitizing potential log injection payload."""
        # Simulate log injection attempt
        malicious = "user123\n[ERROR] Fake error message\nmalicious content"
        sanitized = sanitize(malicious)
        # All newlines should be removed
        assert '\n' not in sanitized
        assert '\r' not in sanitized
        assert sanitized == "user123[ERROR] Fake error messagemalicious content"
    
    def test_sanitize_removes_all_control_chars(self):
        """Test that all ASCII control characters are removed."""
        # Test various control characters
        input_str = "test\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0fvalue"
        sanitized = sanitize(input_str)
        # All control chars (0-31) should be removed
        for i in range(32):
            assert chr(i) not in sanitized
        assert sanitized == "testvalue"
    
    def test_sanitize_dict_keys(self):
        """Test that dictionary string keys are also sanitized."""
        input_dict = {'key\nwith\nnewlines': 'value', 'clean': 'test\ttabs'}
        sanitized = sanitize(input_dict)
        # Keys should be sanitized
        assert 'key\nwith\nnewlines' not in sanitized
        assert 'keywithnewlines' in sanitized
        # Values should be sanitized
        assert sanitized['keywithnewlines'] == 'value'
        assert sanitized['clean'] == 'testtabs'
    
    def test_sanitize_dict_with_non_string_keys(self):
        """Test that dictionaries with non-string keys work correctly."""
        input_dict = {0: 'value\nwith\nnewlines', 1: 'clean', 'str_key\n': 'test\ttabs'}
        sanitized = sanitize(input_dict)
        # Non-string keys should be preserved
        assert 0 in sanitized
        assert 1 in sanitized
        # String keys should be sanitized
        assert 'str_key\n' not in sanitized
        assert 'str_key' in sanitized
        # All values should be sanitized
        assert sanitized[0] == 'valuewithnewlines'
        assert sanitized[1] == 'clean'
        assert sanitized['str_key'] == 'testtabs'
    
    def test_sanitize_unicode_separators(self):
        """Test that Unicode line and paragraph separators are removed."""
        # U+2028 is Line Separator, U+2029 is Paragraph Separator
        input_str = "line1\u2028line2\u2029line3"
        sanitized = sanitize(input_str)
        assert '\u2028' not in sanitized
        assert '\u2029' not in sanitized
        assert sanitized == "line1line2line3"
    
    def test_sanitize_depth_limit(self):
        """Test that deeply nested structures are handled safely."""
        # Create a deeply nested structure
        nested = {
            'level1': {
                'level2': {
                    'level3': {
                        'level4': {
                            'level5': {
                                'level6': {
                                    'level7': {
                                        'level8': {
                                            'level9': {
                                                'level10': {
                                                    'level11': 'value\nwith\nnewlines'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        # Should sanitize up to max_depth (default 10)
        # Beyond max_depth, items are replaced with placeholder string
        sanitized = sanitize(nested)
        # Should not crash or cause issues
        assert isinstance(sanitized, dict)
        # Navigate to depth 9 - should still have nested dict structure
        result = sanitized
        for i in range(1, 10):
            result = result[f'level{i}']
            assert isinstance(result, dict)
        # At depth 9, the value for key 'level10' was sanitized at depth 10
        # which is still within limit, so it's a dict
        assert isinstance(result['level10'], dict)
        # But that dict's items were sanitized at depth 11 (> max_depth=10)
        # So both key and value became placeholders
        assert result['level10'] == {'[deeply nested structure]': '[deeply nested structure]'}
        
        # Test with lower max_depth
        sanitized_shallow = sanitize(nested, max_depth=3)
        assert isinstance(sanitized_shallow, dict)
        # Navigate to depth 2
        result_shallow = sanitized_shallow['level1']['level2']
        # At depth 2, the value for 'level3' was sanitized at depth 3
        # which is still within limit, so it's a dict
        assert isinstance(result_shallow['level3'], dict)
        # But that dict's items were sanitized at depth 4 (> max_depth=3)
        assert result_shallow['level3'] == {'[deeply nested structure]': '[deeply nested structure]'}


class TestLoggingFilter:
    """Test the SanitizingFilter for logging."""
    
    def test_logging_filter_sanitizes_message(self):
        """Test that the logging filter sanitizes log messages."""
        import logging
        from app.utils.logging_filter import SanitizingFilter
        
        # Create a logger with the sanitizing filter
        logger = logging.getLogger('test_logger')
        logger.setLevel(logging.INFO)
        
        # Add a handler with our filter
        handler = logging.StreamHandler()
        handler.addFilter(SanitizingFilter())
        logger.addHandler(handler)
        
        # Create a log record with malicious content
        record = logging.LogRecord(
            name='test', level=logging.INFO, pathname='', lineno=0,
            msg='User login: user123\n[ERROR] Fake error',
            args=(), exc_info=None
        )
        
        # Apply the filter
        sanitizing_filter = SanitizingFilter()
        sanitizing_filter.filter(record)
        
        # Message should be sanitized
        assert '\n' not in record.msg
        assert record.msg == 'User login: user123[ERROR] Fake error'
    
    def test_logging_filter_sanitizes_object_message(self):
        """Test that the logging filter sanitizes object messages with malicious __str__."""
        import logging
        from app.utils.logging_filter import SanitizingFilter
        
        # Create an object with malicious __str__ method
        class MaliciousObject:
            def __str__(self):
                return 'Normal message\nMALICIOUS INJECTION\rFAKE LOG ENTRY'
        
        # Create a log record with object as message
        record = logging.LogRecord(
            name='test', level=logging.INFO, pathname='', lineno=0,
            msg=MaliciousObject(),
            args=(), exc_info=None
        )
        
        # Apply the filter
        sanitizing_filter = SanitizingFilter()
        sanitizing_filter.filter(record)
        
        # Message should be sanitized (object converted to string and sanitized)
        assert '\n' not in record.msg
        assert '\r' not in record.msg
        assert record.msg == 'Normal messageMALICIOUS INJECTIONFAKE LOG ENTRY'
    
    def test_logging_filter_sanitizes_args(self):
        """Test that the logging filter sanitizes log arguments."""
        import logging
        from app.utils.logging_filter import SanitizingFilter
        
        # Create a log record with malicious arguments
        record = logging.LogRecord(
            name='test', level=logging.INFO, pathname='', lineno=0,
            msg='Unit: %s, Sensor: %s',
            args=('unit\n123', 'temp\rsensor'),
            exc_info=None
        )
        
        # Apply the filter
        sanitizing_filter = SanitizingFilter()
        sanitizing_filter.filter(record)
        
        # Arguments should be sanitized
        assert record.args[0] == 'unit123'
        assert record.args[1] == 'tempsensor'
    
    def test_logging_filter_sanitizes_all_arg_types(self):
        """Test that the logging filter converts all arguments to strings and sanitizes them."""
        import logging
        from app.utils.logging_filter import SanitizingFilter
        
        # Create a log record with mixed type arguments
        # Note: Arguments are converted to strings to ensure objects with __str__ are sanitized
        record = logging.LogRecord(
            name='test', level=logging.INFO, pathname='', lineno=0,
            msg='Data: %s %s %s',
            args=('string\nvalue', 123, True),
            exc_info=None
        )
        
        # Apply the filter
        sanitizing_filter = SanitizingFilter()
        sanitizing_filter.filter(record)
        
        # All arguments should be converted to strings and sanitized
        assert record.args[0] == 'stringvalue'
        assert record.args[1] == '123'  # Number converted to string
        assert record.args[2] == 'True'  # Boolean converted to string
    
    def test_logging_filter_sanitizes_objects_with_str(self):
        """Test that the logging filter sanitizes objects with custom __str__ methods."""
        import logging
        from app.utils.logging_filter import SanitizingFilter
        
        # Create a class with __str__ that contains control characters
        class MaliciousObject:
            def __str__(self):
                return "object\nwith\ncontrol\nchars"
        
        record = logging.LogRecord(
            name='test', level=logging.INFO, pathname='', lineno=0,
            msg='Object: %s',
            args=(MaliciousObject(),),
            exc_info=None
        )
        
        # Apply the filter
        sanitizing_filter = SanitizingFilter()
        sanitizing_filter.filter(record)
        
        # Object should be converted to string via __str__ and then sanitized
        assert '\n' not in record.args[0]
        assert record.args[0] == 'objectwithcontrolchars'
    
    def test_logging_filter_sanitizes_dict_args(self):
        """Test that the logging filter sanitizes dictionary-style arguments."""
        import logging
        from app.utils.logging_filter import SanitizingFilter
        
        # Create a log record with dict-style arguments (used with %(name)s formatting)
        record = logging.LogRecord(
            name='test', level=logging.INFO, pathname='', lineno=0,
            msg='User: %(username)s, ID: %(user_id)s',
            args={'username': 'admin\n123', 'user_id': 'id\rwith\rcarriage'},
            exc_info=None
        )
        
        # Apply the filter
        sanitizing_filter = SanitizingFilter()
        sanitizing_filter.filter(record)
        
        # Dict values should be converted to strings and sanitized
        assert record.args['username'] == 'admin123'
        assert record.args['user_id'] == 'idwithcarriage'
    
    def test_logging_filter_sanitizes_unicode_separators(self):
        """Test that the logging filter sanitizes Unicode separators."""
        import logging
        from app.utils.logging_filter import SanitizingFilter
        
        # Create a log record with Unicode line/paragraph separators
        record = logging.LogRecord(
            name='test', level=logging.INFO, pathname='', lineno=0,
            msg='Message: %s',
            args=('line1\u2028line2\u2029line3',),
            exc_info=None
        )
        
        # Apply the filter
        sanitizing_filter = SanitizingFilter()
        sanitizing_filter.filter(record)
        
        # Unicode separators should be removed
        assert '\u2028' not in record.args[0]
        assert '\u2029' not in record.args[0]
        assert record.args[0] == 'line1line2line3'
    
    def test_logging_filter_with_flask_app(self):
        """Test that logging filter works with Flask app."""
        from flask import Flask
        from app.utils.logging_filter import SanitizingFilter
        
        app = Flask(__name__)
        app.config['TESTING'] = True
        
        # Add sanitizing filter to app logger
        for handler in app.logger.handlers:
            handler.addFilter(SanitizingFilter())
        
        # Test that logging with malicious data works
        with app.app_context():
            # This should not raise an error
            app.logger.info("Test message with unit_id=%s", "unit\n123")


class TestIntegrationWithoutRequestMutation:
    """Test that the application works without mutating request objects."""
    
    def test_request_data_remains_intact(self):
        """Test that original request data is not modified."""
        from flask import Flask, request, jsonify
        from app.utils.logging_filter import SanitizingFilter
        
        app = Flask(__name__)
        app.config['TESTING'] = True
        
        # Add logging filter
        for handler in app.logger.handlers:
            handler.addFilter(SanitizingFilter())
        
        @app.route('/test/<unit_id>')
        def test_route(unit_id):
            # Log with potentially malicious data - filter will sanitize at logging layer
            app.logger.info("Processing unit: %s", unit_id)
            # But the actual unit_id parameter should remain unchanged
            return jsonify({'unit_id': unit_id, 'original': True})
        
        with app.test_client() as client:
            # Send request with newlines in path
            response = client.get('/test/unit123%0Amalicious')
            data = response.get_json()
            
            # The route receives the original data (URL-decoded)
            # Flask handles URL decoding, so %0A becomes \n
            assert 'unit123\nmalicious' == data['unit_id']
            assert data['original'] is True


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret'
    return app
