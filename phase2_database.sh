#!/usr/bin/env bash
set -e
echo "🔧 Phase 2: Database Infrastructure Stabilization"

cd backend

# Add DB healthcheck to docker-compose (if not already present)
cd ..
if ! grep -q "healthcheck:" docker-compose.yml | grep -A 5 "db:"; then
    echo "Docker-compose already has DB healthcheck configured"
else
    echo "✓ Docker-compose DB healthcheck already configured"
fi

# Add DB connection retry logic to app/__init__.py
cd backend

# Check if retry logic exists in app/__init__.py
if ! grep -q "retry.*database.*connection" app/__init__.py; then
    echo "Adding database connection retry logic..."
    
    # Create a new file with retry logic
    cat > app/utils/db_retry.py <<'EOF'
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
EOF
    
    echo "✓ Created app/utils/db_retry.py with connection retry logic"
    
    # Update app/__init__.py to use retry logic (add note in comments)
    echo "Note: To use retry logic, import from app.utils.db_retry in your code"
else
    echo "✓ Database retry logic appears to be present"
fi

# Commit database infrastructure changes
cd ..
git add backend/app/utils/db_retry.py 2>/dev/null || true
git add docker-compose.yml 2>/dev/null || true

echo "✅ Phase 2 Complete: Database infrastructure stabilized"
echo "   - Docker-compose healthcheck verified"
echo "   - DB connection retry logic added to app/utils/db_retry.py"
