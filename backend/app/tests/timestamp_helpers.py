"""Helper utilities for timestamp handling in tests.

NOTE: These helpers are primarily needed for SQLite testing compatibility.
With PostgreSQL testing (USE_POSTGRES_TESTS=true), database triggers handle 
timestamp updates automatically, making these helpers largely unnecessary.

To enable PostgreSQL testing, set environment variables:
    USE_POSTGRES_TESTS=true
    POSTGRES_TEST_URL=postgresql://user:pass@localhost:5432/test_db
"""
from datetime import datetime, timezone


def simulate_db_trigger_update(obj):
    """
    Simulate database trigger behavior for SQLite in tests.
    
    In production with PostgreSQL, the database triggers automatically update
    the updated_at column. Since SQLite doesn't support these triggers,
    we manually set the updated_at field in tests to simulate this behavior.
    
    Args:
        obj: SQLAlchemy model instance to update
    """
    if hasattr(obj, 'updated_at'):
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
    
    Args:
        original_timestamp: The original timestamp value
        updated_timestamp: The updated timestamp value
    """
    assert updated_timestamp is not None, "Updated timestamp should not be None"
    assert updated_timestamp > original_timestamp, \
        f"Updated timestamp ({updated_timestamp}) should be greater than original ({original_timestamp})"


def assert_timestamp_unchanged(original_timestamp, current_timestamp):
    """
    Assert that a timestamp has not been changed.
    
    Args:
        original_timestamp: The original timestamp value
        current_timestamp: The current timestamp value
    """
    assert current_timestamp == original_timestamp, \
        f"Timestamp should not have changed: original={original_timestamp}, current={current_timestamp}"