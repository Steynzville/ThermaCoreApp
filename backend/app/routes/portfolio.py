"""Tenant-scoped portfolio history and acknowledged control history."""

from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required

from app.middleware.authorization import permission_required
from app.middleware.tenant import tenant_filter
from app.models import Unit, UnitCommand
from app.services.portfolio_history import get_history

portfolio_bp = Blueprint("portfolio", __name__)


@portfolio_bp.get("/portfolio/history")
@jwt_required()
@permission_required("read_units")
def history():
    now = datetime.now(timezone.utc)
    try:
        end = (
            datetime.strptime(request.args["to"], "%Y-%m-%d").replace(
                tzinfo=timezone.utc,
            )
            + timedelta(days=1)
            if "to" in request.args
            else now
        )
        start = (
            datetime.strptime(request.args["from"], "%Y-%m-%d").replace(
                tzinfo=timezone.utc,
            )
            if "from" in request.args
            else now.replace(hour=0, minute=0, second=0, microsecond=0)
            - timedelta(days=89)
        )
        end = min(end, now)
        if start >= end or end - start > timedelta(days=366):
            raise ValueError
    except ValueError:
        return jsonify(
            {"error": "Use a valid UTC date range of at most 366 days."},
        ), 400
    query = tenant_filter(Unit.query, Unit)
    if "unit_ids" in request.args:
        query = query.filter(Unit.id.in_(request.args["unit_ids"].split(",")))
    units = query.all()
    ids = [u.id for u in units]
    rows = get_history(
        ids,
        start,
        end,
        current_app.config.get("TELEMETRY_MAX_GAP_SECONDS", 900),
    )
    return jsonify(
        {
            "data": rows,
            "from": start.isoformat(),
            "to": end.isoformat(),
            "timezone": "UTC",
        },
    )


@portfolio_bp.get("/portfolio/events")
@jwt_required()
@permission_required("read_units")
def events():
    query = tenant_filter(Unit.query, Unit)
    if "unit_ids" in request.args:
        query = query.filter(Unit.id.in_(request.args["unit_ids"].split(",")))
    units = query.all()
    names = {u.id: u.name for u in units}
    query = UnitCommand.query.filter(UnitCommand.unit_id.in_(names))
    try:
        if "from" in request.args:
            query = query.filter(
                UnitCommand.created_at
                >= datetime.strptime(request.args["from"], "%Y-%m-%d"),
            )
        if "to" in request.args:
            query = query.filter(
                UnitCommand.created_at
                < datetime.strptime(request.args["to"], "%Y-%m-%d") + timedelta(days=1),
            )
    except ValueError:
        return jsonify({"error": "Use valid UTC dates."}), 400
    page = max(1, request.args.get("page", 1, type=int))
    result = query.order_by(UnitCommand.created_at.desc()).paginate(
        page=page,
        per_page=250,
        error_out=False,
    )
    return jsonify(
        {
            "data": [c.as_event(names[c.unit_id]) for c in result.items],
            "has_next": result.has_next,
        },
    )


@portfolio_bp.get("/units/<unit_id>/history")
@jwt_required()
@permission_required("read_units")
def unit_history(unit_id):
    from app.services.unit_history import daily_history

    unit = tenant_filter(Unit.query, Unit).filter(Unit.id == unit_id).first()
    if unit is None:
        return jsonify({"error": "Unit not found"}), 404
    now = datetime.now(timezone.utc)
    try:
        start = datetime.strptime(request.args["from"], "%Y-%m-%d").replace(
            tzinfo=timezone.utc
        )
        end = datetime.strptime(request.args["to"], "%Y-%m-%d").replace(
            tzinfo=timezone.utc
        ) + timedelta(days=1)
        if start >= end or end - start > timedelta(days=3660):
            raise ValueError
    except (KeyError, ValueError):
        return jsonify(
            {"error": "Choose valid UTC dates spanning at most ten years per query."}
        ), 400
    return jsonify(
        {
            "data": daily_history(unit.id, start, min(end, now)),
            "aggregation": "daily mean",
            "timezone": "UTC",
        }
    )


@portfolio_bp.get("/units/<unit_id>/maintenance")
@jwt_required()
@permission_required("read_units")
def list_maintenance(unit_id):
    from app.models import MaintenanceSchedule

    if tenant_filter(Unit.query, Unit).filter(Unit.id == unit_id).first() is None:
        return jsonify({"error": "Unit not found"}), 404
    records = (
        MaintenanceSchedule.query.filter_by(unit_id=unit_id)
        .order_by(MaintenanceSchedule.scheduled_at.desc())
        .all()
    )
    return jsonify({"data": [record.as_dict() for record in records]})


@portfolio_bp.post("/units/<unit_id>/maintenance")
@jwt_required()
@permission_required("remote_control")
def schedule_maintenance(unit_id):
    from app import db
    from app.models import MaintenanceSchedule
    from app.utils.helpers import get_current_user_id

    if tenant_filter(Unit.query, Unit).filter(Unit.id == unit_id).first() is None:
        return jsonify({"error": "Unit not found"}), 404
    body = request.get_json(silent=True)
    try:
        if not isinstance(body, dict) or set(body) - {"scheduledAt", "description"}:
            raise ValueError
        description = body.get("description", "").strip()
        scheduled = datetime.fromisoformat(body["scheduledAt"].replace("Z", "+00:00"))
        if (
            not 3 <= len(description) <= 2000
            or scheduled.tzinfo is None
            or scheduled <= datetime.now(timezone.utc)
        ):
            raise ValueError
    except (ValueError, TypeError, KeyError, AttributeError):
        return jsonify(
            {
                "error": "Provide a future date with timezone and a description of 3–2000 characters."
            }
        ), 400
    user_id, _ = get_current_user_id()
    record = MaintenanceSchedule(
        unit_id=unit_id,
        created_by=user_id,
        scheduled_at=scheduled.astimezone(timezone.utc),
        description=description,
    )
    db.session.add(record)
    db.session.commit()
    return jsonify(record.as_dict()), 201
