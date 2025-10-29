"""Health check endpoint for infrastructure monitoring.

Provides a versioned API endpoint for monitoring backend API and database status.
"""

from datetime import datetime, timezone

from flask import Blueprint, jsonify

from app import db

health_bp = Blueprint("health", __name__, url_prefix="/api/v1")


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Check health of API and database.

    Returns:
        JSON response with API status, database status, and timestamp

    ---
    tags:
      - Health
    responses:
      200:
        description: Health check successful
        schema:
          type: object
          properties:
            status:
              type: string
              description: Overall API status
            database:
              type: object
              properties:
                status:
                  type: string
                  description: Database connection status
                connected:
                  type: boolean
                  description: Whether database is connected
            timestamp:
              type: string
              format: date-time
              description: Timestamp of the health check
      503:
        description: Service unavailable - database connection failed
    """
    # Check database connectivity
    db_status = "operational"
    db_connected = True
    status_code = 200

    try:
        # Attempt to execute a simple query to verify database connectivity
        db.session.execute(db.text("SELECT 1"))
        db.session.commit()
    except Exception:
        db_status = "degraded"
        db_connected = False
        status_code = 503

    return (
        jsonify(
            {
                "status": "operational" if db_connected else "degraded",
                "database": {
                    "status": db_status,
                    "connected": db_connected,
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ),
        status_code,
    )
