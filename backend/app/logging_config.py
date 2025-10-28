"""Structured logging configuration for security and audit events.

This module provides centralized logging configuration with proper
error handling and security considerations.
"""

import logging
import sys
from typing import Any

def configure_logging(
    level: str = "INFO",
    log_file: str | None = None,
    log_format: str | None = None,
) -> None:
    """Configure application-wide logging with security considerations.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional file path for log output
        log_format: Optional custom log format string
    """
    if log_format is None:
        log_format = (
            "%(asctime)s - %(name)s - %(levelname)s - "
            "%(filename)s:%(lineno)d - %(message)s"
        )

    handlers = [logging.StreamHandler(sys.stdout)]

    if log_file:
        handlers.append(logging.FileHandler(log_file))

    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format=log_format,
        handlers=handlers,
    )

def log_exception_with_context(
    logger: logging.Logger,
    exception: Exception,
    context: dict[str, Any] | None = None,
    level: str = "ERROR",
) -> None:
    """Log an exception with additional context information.

    Args:
        logger: Logger instance to use
        exception: The exception to log
        context: Optional dictionary with additional context
        level: Logging level to use (default: ERROR)
    """
    log_method = getattr(logger, level.lower())

    message = f"Exception occurred: {exception.__class__.__name__}: {exception}"

    if context:
        context_str = ", ".join(f"{k}={v}" for k, v in context.items())
        message = f"{message} | Context: {context_str}"

    log_method(message, exc_info=True)

def create_logger(name: str, level: str = "INFO") -> logging.Logger:
    """Create a configured logger instance.

    Args:
        name: Logger name (typically __name__ from calling module)
        level: Logging level

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    return logger
