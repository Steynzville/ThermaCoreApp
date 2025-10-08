"""Logging filter for sanitizing log messages to prevent injection attacks."""
import logging

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
        # Sanitize the log message. It can be an object, so convert to string first.
        # This ensures objects with malicious __str__ methods are sanitized.
        try:
            if record.msg is not None:
                record.msg = sanitize(str(record.msg))
            else:
                record.msg = ""
        except Exception:
            # If conversion fails, use a safe placeholder to prevent logging failures
            record.msg = "[message conversion failed]"

        # Sanitize arguments passed to the logger.
        # The sanitize function handles dicts and lists recursively.
        # For other types (objects, numbers, etc.), we convert to string first
        # to handle objects with custom __str__ methods containing control characters.
        if record.args:
            try:
                if isinstance(record.args, dict):
                    # For dictionary-based arguments (used with %(name)s formatting),
                    # sanitize recursively but convert non-dict/list/str values to strings first
                    sanitized_dict = {}
                    for k, v in record.args.items():
                        # Convert value to string if it's not a type that sanitize handles recursively
                        if isinstance(v, (str, dict, list)):
                            sanitized_dict[k] = v
                        else:
                            # Convert objects/numbers/etc to strings to catch malicious __str__ methods
                            sanitized_dict[k] = str(v)
                    record.args = sanitize(sanitized_dict)
                elif isinstance(record.args, (list, tuple)):
                    # For tuple/list-based arguments (used with %s formatting),
                    # convert non-dict/list/str items to strings, then sanitize recursively
                    converted_args = []
                    for arg in record.args:
                        if isinstance(arg, (str, dict, list)):
                            converted_args.append(arg)
                        else:
                            # Convert objects/numbers/etc to strings to catch malicious __str__ methods
                            converted_args.append(str(arg))
                    # Sanitize returns a list, but record.args should be a tuple for %s formatting
                    sanitized = sanitize(converted_args)
                    record.args = tuple(sanitized) if isinstance(sanitized, list) else sanitized
            except Exception:
                # If sanitization fails, use empty tuple to prevent logging failures
                record.args = ()


        return True
