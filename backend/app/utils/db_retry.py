"""Database connection retry utilities."""
import time
import logging
from sqlalchemy.exc import OperationalError, DBAPIError

logger = logging.getLogger(__name__)


def init_db_with_retry(db, app, max_retries=5, retry_delay=2):
    """
    Initialize database connection with retry logic.
    
    Args:
        db: SQLAlchemy database instance
        app: Flask application instance
        max_retries: Maximum number of retry attempts
        retry_delay: Delay in seconds between retries
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    for attempt in range(1, max_retries + 1):
        try:
            with app.app_context():
                # Test database connection
                db.engine.connect()
                logger.info("Database connection established successfully")
                return True
        except (OperationalError, DBAPIError) as e:
            if attempt < max_retries:
                logger.warning(
                    f"Database connection attempt {attempt}/{max_retries} failed: {e}. "
                    f"Retrying in {retry_delay} seconds..."
                )
                time.sleep(retry_delay)
            else:
                logger.error(
                    f"Database connection failed after {max_retries} attempts: {e}"
                )
                return False
    
    return False


def verify_db_tables(db, app, required_tables=None):
    """
    Verify that required database tables exist.
    
    Args:
        db: SQLAlchemy database instance
        app: Flask application instance
        required_tables: List of required table names (optional)
    
    Returns:
        bool: True if all required tables exist, False otherwise
    """
    if required_tables is None:
        required_tables = ['users', 'roles', 'permissions', 'units', 'sensors']
    
    try:
        with app.app_context():
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            missing_tables = set(required_tables) - set(existing_tables)
            
            if missing_tables:
                logger.error(f"Missing required database tables: {missing_tables}")
                return False
            
            logger.info(f"All required database tables verified: {required_tables}")
            return True
    except Exception as e:
        logger.error(f"Error verifying database tables: {e}")
        return False
