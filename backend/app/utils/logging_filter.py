"""Logging filter for sanitizing log messages to prevent injection attacks."""
import logging
from typing import Any

from app.middleware.validation import sanitize


class SanitizingFilter(logging.Filter):
    """Logging filter that sanitizes messages and arguments before logging.
    
    This filter prevents log injection attacks by removing control characters
    from log messages and arguments. It operates at the logging layer, ensuring
    that the original request data remains intact for application logic while
    preventing malicious data from corrupting log files.
    """
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Sanitize the log record before it's logged.
        
        Args:
            record: The log record to sanitize
            
        Returns:
            True to allow the log record to be logged
        """
        # Sanitize the log message
        if isinstance(record.msg, str):
            record.msg = sanitize(record.msg)
        
        # Sanitize arguments passed to the logger
        if record.args:
            if isinstance(record.args, dict):
                record.args = sanitize(record.args)
            elif isinstance(record.args, (list, tuple)):
                sanitized_args = tuple(
                    sanitize(arg) if isinstance(arg, str) else arg
                    for arg in record.args
                )
                record.args = sanitized_args
        
        # Sanitize extra data if present
        if hasattr(record, 'extra'):
            record.extra = sanitize(record.extra)
        
        return True
