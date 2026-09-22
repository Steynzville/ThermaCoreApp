"""Authenticated, tenant-scoped device commands and acknowledgement history."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from app import db
from app.middleware.authorization import permission_required
from app.middleware.tenant import tenant_filter
from app.models import Unit, User
from app.services.unit_controls import (
    ControlError,
    acknowledged_controls,
    execute_control,
)
from app.utils.schemas import UnitSchema

remote_control_bp = Blueprint("remote_control", __name__)


def _execute(unit_id, controls):
    unit = tenant_filter(Unit.query, Unit).filter(Unit.id == unit_id).first()
    if not unit:
        return jsonify({"error": "Unit not found in your portfolio."}), 404
    try:
        command = execute_control(unit, controls, get_jwt_identity())
        snapshot = UnitSchema().dump(unit)
        snapshot.update(acknowledged_controls(unit.id))
        return jsonify(
            {
                "success": True,
                "unit": snapshot,
                "action": command.as_event(unit.name),
                "unit_id": unit.id,
                "power_on": snapshot.get("machinePower", unit.status.value == "online"),
                "water_production_on": snapshot.get(
                    "waterProductionOn", unit.water_generation
                ),
                "water_generation": unit.water_generation,
                "status": unit.status.value,
            }
        )
    except ControlError as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), exc.status
    except Exception:
        db.session.rollback()
        return jsonify(
            {
                "error": "Could not record device acknowledgement. Check device state before retrying."
            }
        ), 500


@remote_control_bp.post("/remote-control/units/<string:unit_id>/controls")
@jwt_required()
@permission_required("remote_control")
def control_unit(unit_id):
    return _execute(unit_id, request.get_json(silent=True))


@remote_control_bp.post("/remote-control/units/<string:unit_id>/power")
@jwt_required()
@permission_required("remote_control")
def control_unit_power(unit_id):
    data = request.get_json(silent=True) or {}
    return _execute(unit_id, {"machinePower": data.get("power_on")})


@remote_control_bp.post("/remote-control/units/<string:unit_id>/water-production")
@jwt_required()
@permission_required("remote_control")
def control_water_production(unit_id):
    data = request.get_json(silent=True) or {}
    return _execute(unit_id, {"waterProductionOn": data.get("water_production_on")})


@remote_control_bp.get("/remote-control/units/<string:unit_id>/status")
@jwt_required()
@permission_required("read_units")
def get_remote_control_status(unit_id):
    unit = tenant_filter(Unit.query, Unit).filter(Unit.id == unit_id).first()
    if not unit:
        return jsonify({"error": "Unit not found in your portfolio."}), 404
    return jsonify(
        {
            "unit_id": unit.id,
            "status": unit.status.value,
            "water_generation": unit.water_generation,
            "power_on": unit.status.value == "online",
            "controls": acknowledged_controls(unit.id),
            "last_updated": unit.updated_at.isoformat() if unit.updated_at else None,
        }
    )


@remote_control_bp.get("/remote-control/permissions")
@jwt_required()
def get_remote_control_permissions():
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.is_active:
        return jsonify({"error": "User not found"}), 404
    return jsonify(
        {
            "has_remote_control": user.has_permission("remote_control"),
            "role": user.role.name.value,
            "permissions": {
                name: user.has_permission(name)
                for name in ("read_units", "write_units", "remote_control")
            },
        }
    )
