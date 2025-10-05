"""Secure logging utilities for sensitive data protection."""
import re
import logging
from typing import Any


class SecureLogger:
    """Utility class for sanitizing log messages to prevent sensitive data leakage."""
    
    # Patterns to redact from logs
    SENSITIVE_PATTERNS = [
        # Authentication credentials
        (re.compile(r"password[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'password=***'),
        (re.compile(r"passwd[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'passwd=***'),
        (re.compile(r"\bpwd[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'pwd=***'),
        
        # Tokens and keys - these should come before 'authorization' to avoid conflicts
        (re.compile(r'Bearer\s+([a-zA-Z0-9\-._~+/]+=*)', re.IGNORECASE), 'Bearer ***'),
        (re.compile(r"token[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'token=***'),
        (re.compile(r"api[_-]?key[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'api_key=***'),
        (re.compile(r"secret[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'secret=***'),
        (re.compile(r"jwt[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'jwt=***'),
        (re.compile(r"access_token[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'access_token=***'),
        (re.compile(r"refresh_token[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'refresh_token=***'),
        (re.compile(r"\bsession[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'session=***'),
        (re.compile(r"csrf[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'csrf=***'),
        
        # Authorization header (should come after Bearer pattern)
        (re.compile(r"authorization[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'authorization=***'),
        
        # Personal Identifiable Information (PII)
        (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), '***-**-****'),  # SSN
        (re.compile(r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b'), '****-****-****-****'),  # Credit card
        (re.compile(r'\b\d{3}[- ]?\d{3}[- ]?\d{4}\b'), '***-***-****'),  # Phone number
        
        # Connection strings with passwords
        (re.compile(r'://([^:]+):([^@]+)@', re.IGNORECASE), r'://\1:***@'),  # Database URLs
        
        # Email addresses (partial redaction for privacy)
        (re.compile(r'\b([a-zA-Z0-9._%+-]{1,3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b'), r'\1***@\2'),
        
        # Private/secret keys
        (re.compile(r"private[_-]?key[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'private_key=***'),
        (re.compile(r"client[_-]?secret[\"']?\s*[:=]\s*[\"']?([^\"'\s,}]*)", re.IGNORECASE), 'client_secret=***'),
        
        # Certificates
        (re.compile(r'-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----.+?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----', re.DOTALL), '[PRIVATE_KEY_REDACTED]'),
    ]
    
    @classmethod
    def sanitize_log_message(cls, message: str) -> str:
        """Remove sensitive information from log messages.
        
        Args:
            message: The log message to sanitize
            
        Returns:
            Sanitized log message with sensitive data redacted
        """
        if not isinstance(message, str):
            message = str(message)
        
        for pattern, replacement in cls.SENSITIVE_PATTERNS:
            message = pattern.sub(replacement, message)
        
        return message
    
    @classmethod
    def sanitize_dict(cls, data: dict) -> dict:
        """Recursively sanitize a dictionary by redacting sensitive keys.
        
        Args:
            data: Dictionary to sanitize
            
        Returns:
            Sanitized copy of the dictionary
        """
        if not isinstance(data, dict):
            return data
        
        sensitive_keys = {
            'password', 'passwd', 'pwd', 'token', 'api_key', 'secret', 'jwt', 
            'refresh_token', 'access_token', 'authorization', 'secret_key', 
            'private_key', 'client_secret', 'api_secret', 'auth_token', 
            'session_token', 'csrf_token', 'x-api-key', 'x-auth-token',
            'session', 'session_id', 'sessionid', 'bearer', 'credentials',
            'cert', 'certificate', 'private_key_path', 'key_file',
            'ssn', 'social_security', 'credit_card', 'card_number', 'cvv',
            'pin', 'security_code', 'account_number', 'routing_number'
        }
        
        sanitized = {}
        for key, value in data.items():
            # Check if key should be redacted (case-insensitive)
            if key.lower() in sensitive_keys:
                sanitized[key] = '[REDACTED]'
            elif isinstance(value, dict):
                sanitized[key] = cls.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = [cls.sanitize_dict(item) if isinstance(item, dict) else item for item in value]
            else:
                # Also sanitize string values for patterns
                if isinstance(value, str):
                    sanitized[key] = cls.sanitize_log_message(value)
                else:
                    sanitized[key] = value
        
        return sanitized
    
    @classmethod
    def get_secure_logger(cls, name: str) -> 'SecureLoggerAdapter':
        """Get a logger adapter that automatically sanitizes messages.
        
        Args:
            name: Logger name
            
        Returns:
            SecureLoggerAdapter instance
        """
        logger = logging.getLogger(name)
        return SecureLoggerAdapter(logger, cls)


class SecureLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that automatically sanitizes sensitive data from log messages."""
    
    def __init__(self, logger: logging.Logger, secure_logger_cls: type):
        """Initialize the adapter.
        
        Args:
            logger: Base logger instance
            secure_logger_cls: SecureLogger class for sanitization
        """
        super().__init__(logger, {})
        self.secure_logger_cls = secure_logger_cls
    
    def process(self, msg: Any, kwargs: dict) -> tuple:
        """Process log message to sanitize sensitive data.
        
        Args:
            msg: Log message
            kwargs: Additional logging arguments
            
        Returns:
            Tuple of (sanitized_msg, kwargs)
        """
        # Sanitize the message
        if isinstance(msg, str):
            msg = self.secure_logger_cls.sanitize_log_message(msg)
        
        # Sanitize extra data if present
        if 'extra' in kwargs and isinstance(kwargs['extra'], dict):
            kwargs['extra'] = self.secure_logger_cls.sanitize_dict(kwargs['extra'])
        
        return msg, kwargs
    
    def error(self, msg: Any, *args, **kwargs):
        """Log error with sanitization."""
        msg, kwargs = self.process(msg, kwargs)
        self.logger.error(msg, *args, **kwargs)
    
    def warning(self, msg: Any, *args, **kwargs):
        """Log warning with sanitization."""
        msg, kwargs = self.process(msg, kwargs)
        self.logger.warning(msg, *args, **kwargs)
    
    def info(self, msg: Any, *args, **kwargs):
        """Log info with sanitization."""
        msg, kwargs = self.process(msg, kwargs)
        self.logger.info(msg, *args, **kwargs)
    
    def debug(self, msg: Any, *args, **kwargs):
        """Log debug with sanitization."""
        msg, kwargs = self.process(msg, kwargs)
        self.logger.debug(msg, *args, **kwargs)
    
    def critical(self, msg: Any, *args, **kwargs):
        """Log critical with sanitization."""
        msg, kwargs = self.process(msg, kwargs)
        self.logger.critical(msg, *args, **kwargs)
