"""Service status monitoring endpoints.

Provides endpoints for monitoring the health and status of backend services.
"""

from flask import Blueprint, jsonify

from app.utils.service_manager import service_manager

services_bp = Blueprint("services", __name__)

@services_bp.route("/services/status", methods=["GET"])
def get_services_status():
    """Get the status of all registered services.

    Returns a detailed status of all services including their type (required/optional),
    enabled state, availability, and any errors.

    ---
    tags:
      - Services
    responses:
      200:
        description: Service status information
        schema:
          type: object
          properties:
            overall_health:
              type: string
              enum: [healthy, degraded, critical]
              description: Overall system health status
            services:
              type: object
              description: Detailed status for each service
              additionalProperties:
                type: object
                properties:
                  status:
                    type: string
                    description: Current service status
                  type:
                    type: string
                    enum: [required, optional]
                    description: Service classification
                  enabled:
                    type: boolean
                    description: Whether service is enabled
                  available:
                    type: boolean
                    description: Whether service instance is available
                  error:
                    type: string
                    description: Error message if service failed
    """
    overall_health = service_manager.get_overall_health()
    services_status = service_manager.get_all_services_status()

    return jsonify({"overall_health": overall_health, "services": services_status}), 200
