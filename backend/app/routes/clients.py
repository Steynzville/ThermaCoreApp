"""Client management routes for ThermaCore SCADA API."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Client
from app.utils.schemas import ClientSchema, ClientCreateSchema, ClientUpdateSchema
from app.middleware.authorization import permission_required
from app.middleware.audit import audit_operation


clients_bp = Blueprint("clients", __name__)


@clients_bp.route("/clients", methods=["GET"])
@jwt_required()
@permission_required("read_users")  # Only admins typically have read_users permission
@audit_operation("READ", "clients")
def get_clients():
    """
    Get all clients with optional filtering and pagination.
    ---
    tags:
      - Clients
    parameters:
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 50
      - in: query
        name: active
        type: boolean
      - in: query
        name: search
        type: string
    responses:
      200:
        description: List of clients
      400:
        description: Invalid parameters
    security:
      - JWT: []
    """
    # Parse query parameters
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    active = request.args.get("active", type=bool)
    search = request.args.get("search", "").strip()

    # Build query
    query = Client.query

    # Apply filters
    if active is not None:
        query = query.filter(Client.is_active == active)

    if search:
        query = query.filter(Client.name.ilike(f"%{search}%"))

    # Apply pagination
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    clients_schema = ClientSchema(many=True)

    return jsonify(
        {
            "data": clients_schema.dump(pagination.items),
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        }
    ), 200


@clients_bp.route("/clients/<int:client_id>", methods=["GET"])
@jwt_required()
@permission_required("read_users")
def get_client(client_id):
    """
    Get a specific client by ID.
    ---
    tags:
      - Clients
    parameters:
      - in: path
        name: client_id
        type: integer
        required: true
    responses:
      200:
        description: Client details
      404:
        description: Client not found
    security:
      - JWT: []
    """
    client = Client.query.get_or_404(client_id)
    client_schema = ClientSchema()
    return jsonify(client_schema.dump(client)), 200


@clients_bp.route("/clients", methods=["POST"])
@jwt_required()
@permission_required("write_users")  # Only admins can create clients
@audit_operation(
    "CREATE", "client", include_request_data=True, include_response_data=True
)
def create_client():
    """
    Create a new client.
    ---
    tags:
      - Clients
    parameters:
      - in: body
        name: client_data
        schema:
          $ref: '#/definitions/ClientCreateSchema'
    responses:
      201:
        description: Client created successfully
      400:
        description: Validation error
      409:
        description: Client name already exists
    security:
      - JWT: []
    """
    schema = ClientCreateSchema()

    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    # Create new client
    client = Client(**data)

    try:
        db.session.add(client)
        db.session.commit()

        # Refresh to get database-generated timestamp
        db.session.refresh(client)

        client_schema = ClientSchema()
        return jsonify(client_schema.dump(client)), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Client name already exists"}), 409


@clients_bp.route("/clients/<int:client_id>", methods=["PUT"])
@jwt_required()
@permission_required("write_users")
@audit_operation(
    "UPDATE", "client", include_request_data=True, include_response_data=True
)
def update_client(client_id):
    """
    Update an existing client.
    ---
    tags:
      - Clients
    parameters:
      - in: path
        name: client_id
        type: integer
        required: true
      - in: body
        name: client_data
        schema:
          $ref: '#/definitions/ClientUpdateSchema'
    responses:
      200:
        description: Client updated successfully
      400:
        description: Validation error
      404:
        description: Client not found
    security:
      - JWT: []
    """
    client = Client.query.get_or_404(client_id)
    schema = ClientUpdateSchema()

    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    # Update client attributes
    for key, value in data.items():
        if hasattr(client, key):
            setattr(client, key, value)

    try:
        db.session.commit()

        # Refresh to get database-generated timestamp
        db.session.refresh(client)

        client_schema = ClientSchema()
        return jsonify(client_schema.dump(client)), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Client name already exists"}), 409


@clients_bp.route("/clients/<int:client_id>", methods=["DELETE"])
@jwt_required()
@permission_required("delete_users")  # Only admins can delete clients
@audit_operation("DELETE", "client")
def delete_client(client_id):
    """
    Delete a client (soft delete by deactivating).
    ---
    tags:
      - Clients
    parameters:
      - in: path
        name: client_id
        type: integer
        required: true
    responses:
      204:
        description: Client deleted successfully
      404:
        description: Client not found
    security:
      - JWT: []
    """
    client = Client.query.get_or_404(client_id)

    # Soft delete by deactivating the client
    client.is_active = False
    db.session.commit()

    return "", 204
