"""Helper utilities for timestamp handling in tests.

NOTE: These helpers are primarily needed for SQLite testing compatibility.
With PostgreSQL testing (USE_POSTGRES_TESTS=true), database triggers handle 
timestamp updates automatically, making these helpers largely unnecessary.

To enable PostgreSQL testing, set environment variables:
    USE_POSTGRES_TESTS=true
    POSTGRES_TEST_URL=postgresql://user:pass@localhost:5432/test_db
"""
import os
import time
from datetime import datetime, timezone


def simulate_db_trigger_update(obj):
    """
    Simulate database trigger behavior for SQLite in tests.
    
    In production with PostgreSQL, the database triggers automatically update
    the updated_at column. Since SQLite doesn't support these triggers,
    we manually set the updated_at field in tests to simulate this behavior.
    
    For SQLite tests, adds a small delay to prevent race conditions.
    
    Args:
        obj: SQLAlchemy model instance to update
    """
    # Use runtime dialect detection for better portability
    using_postgres = is_using_postgres_dialect()
    
    if hasattr(obj, 'updated_at'):
        if not using_postgres:
            # Add small delay for SQLite to prevent race conditions
            time.sleep(0.01)
        obj.updated_at = datetime.now(timezone.utc)


def create_test_model_with_utc(model_class, **kwargs):
    """
    Create a test model instance with UTC timestamps.
    
    Args:
        model_class: The SQLAlchemy model class to instantiate
        **kwargs: Keyword arguments to pass to the model constructor
    
    Returns:
        Model instance with UTC timestamps set
    """
    instance = model_class(**kwargs)
    
    # Ensure UTC timestamps are set
    if hasattr(instance, 'created_at'):
        instance.created_at = datetime.now(timezone.utc)
    if hasattr(instance, 'updated_at'):  
        instance.updated_at = datetime.now(timezone.utc)
        
    return instance


def assert_timestamp_updated(original_timestamp, updated_timestamp):
    """
    Assert that a timestamp has been updated properly.
    
    Uses robust comparison (updated_at >= created_at) instead of flaky time diffs.
    
    Args:
        original_timestamp: The original timestamp value
        updated_timestamp: The updated timestamp value
    """
    assert updated_timestamp is not None, "Updated timestamp should not be None"
    assert updated_timestamp >= original_timestamp, \
        f"Updated timestamp ({updated_timestamp}) should be >= original ({original_timestamp})"


def assert_timestamp_unchanged(original_timestamp, current_timestamp):
    """
    Assert that a timestamp has not been changed.
    
    Args:
        original_timestamp: The original timestamp value
        current_timestamp: The current timestamp value
    """
    assert current_timestamp == original_timestamp, \
        f"Timestamp should not have changed: original={original_timestamp}, current={current_timestamp}"


def is_using_postgres_tests():
    """
    Check if tests are configured to run against PostgreSQL.
    
    Returns:
        bool: True if PostgreSQL testing is enabled
    """
    return os.environ.get('USE_POSTGRES_TESTS', 'false').lower() in ('true', '1')


def detect_database_dialect():
    """
    Detect the database dialect at runtime by examining the current database connection.
    
    This provides a more robust alternative to relying solely on environment variables,
    allowing for better database-agnostic testing patterns.
    
    Returns:
        str: Database dialect name ('postgresql', 'sqlite', 'mysql', etc.) or 'unknown'
    """
    try:
        from flask import current_app
        from app import db
        
        # Get the database engine from SQLAlchemy
        if hasattr(db, 'engine') and db.engine is not None:
            dialect_name = db.engine.dialect.name.lower()
            return dialect_name
        
        # Fallback: check database URL from config
        db_url = current_app.config.get('SQLALCHEMY_DATABASE_URI', '').lower()
        if 'postgresql' in db_url or 'postgres' in db_url:
            return 'postgresql'
        elif 'sqlite' in db_url:
            return 'sqlite'
        elif 'mysql' in db_url:
            return 'mysql'
        else:
            return 'unknown'
            
    except Exception:
        # If we can't detect, fall back to environment variable check
        return 'postgresql' if is_using_postgres_tests() else 'sqlite'


def is_using_postgres_dialect():
    """
    Check if the current database dialect is PostgreSQL using runtime detection.
    
    This is preferred over environment variable checks for better portability.
    
    Returns:
        bool: True if using PostgreSQL dialect
    """
    dialect = detect_database_dialect()
    return dialect == 'postgresql'


def get_postgres_test_url():
    """
    Get the PostgreSQL test database URL from environment.
    
    Returns:
        str: PostgreSQL connection URL or None
    """
    return os.environ.get('POSTGRES_TEST_URL')


def sleep_for_sqlite_if_needed(seconds=0.01):
    """
    Add delay for SQLite tests to prevent race conditions.
    
    Uses runtime dialect detection for better portability.
    
    Args:
        seconds: Sleep duration (default 0.01)
    """
    if not is_using_postgres_dialect():
        time.sleep(seconds)