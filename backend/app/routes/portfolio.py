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
    units = tenant_filter(Unit.query, Unit).all()
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
    units = tenant_filter(Unit.query, Unit).all()
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
