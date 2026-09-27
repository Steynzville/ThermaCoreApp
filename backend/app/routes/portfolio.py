"""Tenant-scoped portfolio history and acknowledged control history."""

from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required

from app.middleware.authorization import permission_required, role_required
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
            tzinfo=timezone.utc,
        )
        end = datetime.strptime(request.args["to"], "%Y-%m-%d").replace(
            tzinfo=timezone.utc,
        ) + timedelta(days=1)
        if start >= end or end - start > timedelta(days=3660):
            raise ValueError
    except (KeyError, ValueError):
        return jsonify(
            {"error": "Choose valid UTC dates spanning at most ten years per query."},
        ), 400
    return jsonify(
        {
            "data": daily_history(unit.id, start, min(end, now)),
            "aggregation": "daily mean",
            "timezone": "UTC",
        },
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
                "error": "Provide a future date with timezone and a description of 3–2000 characters.",
            },
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


@portfolio_bp.route("/portfolio/report-schedules", methods=["GET", "POST"])
@jwt_required()
@permission_required("read_units")
def report_schedules():
    from app import db
    from app.models import ReportSchedule
    from app.utils.helpers import get_current_user_id

    user_id, _ = get_current_user_id()
    if request.method == "GET":
        ReportSchedule.query.filter(
            ReportSchedule.user_id == user_id,
            ReportSchedule.status == "processing",
            ReportSchedule.claimed_at
            < datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=10),
        ).update({"status": "failed"})
        db.session.commit()
        rows = (
            ReportSchedule.query.filter_by(user_id=user_id)
            .order_by(ReportSchedule.scheduled_at)
            .all()
        )
        return jsonify({"data": [row.as_dict() for row in rows]})
    body = request.get_json(silent=True)
    try:
        if not isinstance(body, dict):
            raise ValueError
        config = body["config"]
        ids = config["selectedUnits"]
        permitted = {unit.id for unit in tenant_filter(Unit.query, Unit).all()}
        if (
            not isinstance(ids, list)
            or not ids
            or not set(ids) <= permitted
            or config.get("outputFormat") not in ("pdf", "xlsx", "docx")
        ):
            raise ValueError
        time = datetime.fromisoformat(body["scheduledAt"].replace("Z", "+00:00"))
        if time.tzinfo is None or time <= datetime.now(timezone.utc):
            raise ValueError
    except (TypeError, KeyError, ValueError, AttributeError):
        return jsonify(
            {
                "error": "Select permitted units, a report format and a future schedule date.",
            },
        ), 400
    row = ReportSchedule(
        user_id=user_id,
        scheduled_at=time.astimezone(timezone.utc).replace(tzinfo=None),
        config=config,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(row.as_dict()), 201


@portfolio_bp.patch("/portfolio/report-schedules/<int:schedule_id>")
@jwt_required()
@permission_required("read_units")
def update_report_schedule(schedule_id):
    from app import db
    from app.models import ReportSchedule
    from app.utils.helpers import get_current_user_id

    user_id, _ = get_current_user_id()
    row = ReportSchedule.query.filter_by(id=schedule_id, user_id=user_id).first()
    if row is None:
        return jsonify({"error": "Schedule not found"}), 404
    body = request.get_json(silent=True)
    status = body.get("status") if isinstance(body, dict) else None
    allowed = {
        "scheduled": {"paused", "processing"},
        "paused": {"scheduled"},
        "processing": {"completed", "failed"},
        "failed": {"scheduled"},
        "completed": set(),
    }
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if status not in allowed.get(row.status, set()) or (
        status == "processing" and row.scheduled_at > now
    ):
        return jsonify({"error": "Invalid schedule transition"}), 409
    previous = row.status
    changed = ReportSchedule.query.filter_by(
        id=row.id,
        user_id=user_id,
        status=previous,
    ).update({"status": status, "claimed_at": now if status == "processing" else None})
    if changed != 1:
        db.session.rollback()
        return jsonify({"error": "Schedule already claimed"}), 409
    db.session.commit()
    return jsonify(row.as_dict())


@portfolio_bp.get("/portfolio/sales")
@jwt_required()
@role_required("admin", "client_admin")
def sales_records():
    from app.models import SaleRecord

    units = tenant_filter(Unit.query, Unit)
    if "unit_ids" in request.args:
        units = units.filter(Unit.id.in_(request.args["unit_ids"].split(",")))
    rows = (
        SaleRecord.query.filter(
            SaleRecord.unit_id.in_([unit.id for unit in units.all()]),
        )
        .order_by(SaleRecord.sale_date)
        .all()
    )
    return jsonify({"data": [row.as_dict() for row in rows]})


@portfolio_bp.post("/portfolio/sales")
@jwt_required()
@role_required("admin")
def create_sale():
    import math

    from app import db
    from app.models import SaleRecord

    body = request.get_json(silent=True)
    try:
        if not isinstance(body, dict) or set(body) != {
            "unitId",
            "date",
            "revenue",
            "productLine",
            "reference",
        }:
            raise ValueError
        if (
            not tenant_filter(Unit.query, Unit)
            .filter(Unit.id == body["unitId"])
            .first()
        ):
            return jsonify({"error": "Unit not found"}), 404
        if (
            type(body["revenue"]) not in (int, float)
            or not math.isfinite(body["revenue"])
            or body["revenue"] < 0
        ):
            raise ValueError
        date = datetime.strptime(body["date"], "%Y-%m-%d")
        if (
            date > datetime.now()
            or not 1 <= len(body["productLine"].strip()) <= 100
            or not 1 <= len(body["reference"].strip()) <= 120
        ):
            raise ValueError
    except (ValueError, TypeError, KeyError, AttributeError):
        return jsonify(
            {
                "error": "Provide a valid unit, date, non-negative AUD revenue, product line and unique reference.",
            },
        ), 400
    if SaleRecord.query.filter_by(reference=body["reference"].strip()).first():
        return jsonify({"error": "Sale reference already exists"}), 409
    row = SaleRecord(
        unit_id=body["unitId"],
        sale_date=date,
        revenue_aud=body["revenue"],
        product_line=body["productLine"].strip(),
        reference=body["reference"].strip(),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(row.as_dict()), 201


@portfolio_bp.put("/users/<int:user_id>/entitlements/premium-scada")
@jwt_required()
@role_required("admin")
def set_scada_entitlement(user_id):
    from app import db
    from app.models import AccountEntitlement, User

    if db.session.get(User, user_id) is None:
        return jsonify({"error": "User not found"}), 404
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or type(body.get("enabled")) is not bool:
        return jsonify({"error": "Provide enabled boolean"}), 400
    record = db.session.get(AccountEntitlement, user_id) or AccountEntitlement(
        user_id=user_id,
    )
    record.premium_scada = body["enabled"]
    db.session.add(record)
    db.session.commit()
    return jsonify({"premium_scada": record.premium_scada})


@portfolio_bp.get("/units/<unit_id>/scada-history")
@jwt_required()
@permission_required("read_units")
def scada_history(unit_id):
    from app.middleware.entitlements import premium_required
    from app.services.unit_history import daily_history

    @premium_required
    def query():
        unit = tenant_filter(Unit.query, Unit).filter(Unit.id == unit_id).first()
        if unit is None:
            return jsonify({"error": "Unit not found"}), 404
        resolution = request.args.get("resolution", "hour")
        try:
            start = datetime.fromisoformat(request.args["from"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(request.args["to"].replace("Z", "+00:00"))
            limits = {"minute": 2, "hour": 366, "day": 3660}
            if (
                resolution not in limits
                or start.tzinfo is None
                or end.tzinfo is None
                or start >= end
                or end - start > timedelta(days=limits[resolution])
            ):
                raise ValueError
            start, end = start.astimezone(timezone.utc), end.astimezone(timezone.utc)
        except (KeyError, ValueError, TypeError):
            return jsonify(
                {
                    "error": "Use UTC timestamps: minute queries up to 2 days, hourly up to 366 days, daily up to ten years.",
                },
            ), 400
        return jsonify(
            {
                "data": daily_history(
                    unit.id,
                    start,
                    min(end, datetime.now(timezone.utc)),
                    resolution,
                ),
                "aggregation": resolution + " mean",
                "timezone": "UTC",
            },
        )

    return query()


@portfolio_bp.get("/portfolio/conditions")
@jwt_required()
@permission_required("read_units")
def condition_history():
    from app.models import UnitCondition

    units = tenant_filter(Unit.query, Unit)
    if "unit_ids" in request.args:
        units = units.filter(Unit.id.in_(request.args["unit_ids"].split(",")))
    names = {unit.id: unit.name for unit in units.all()}
    query = UnitCondition.query.filter(UnitCondition.unit_id.in_(names))
    try:
        if "from" in request.args:
            query = query.filter(
                UnitCondition.opened_at
                >= datetime.strptime(request.args["from"], "%Y-%m-%d"),
            )
        if "to" in request.args:
            query = query.filter(
                UnitCondition.opened_at
                < datetime.strptime(request.args["to"], "%Y-%m-%d") + timedelta(days=1),
            )
    except ValueError:
        return jsonify({"error": "Use valid UTC dates."}), 400
    rows = query.order_by(
        UnitCondition.opened_at.desc(),
        UnitCondition.id.desc(),
    ).paginate(
        page=max(1, request.args.get("page", 1, type=int)),
        per_page=250,
        error_out=False,
    )
    return jsonify(
        {
            "data": [row.as_event(names[row.unit_id]) for row in rows.items],
            "has_next": rows.has_next,
        },
    )


@portfolio_bp.post("/units/<unit_id>/conditions/<int:condition_id>/acknowledge")
@jwt_required()
@permission_required("remote_control")
def acknowledge_condition(unit_id, condition_id):
    from app import db
    from app.models import UnitCondition
    from app.utils.helpers import get_current_user_id

    if tenant_filter(Unit.query, Unit).filter(Unit.id == unit_id).first() is None:
        return jsonify({"error": "Unit not found"}), 404
    row = (
        UnitCondition.query.filter_by(unit_id=unit_id, id=condition_id)
        .with_for_update()
        .first()
    )
    if row is None:
        return jsonify({"error": "Condition not found"}), 404
    body = request.get_json(silent=True)
    if (
        not isinstance(body, dict)
        or not isinstance(body.get("notes", ""), str)
        or len(body.get("notes", "")) > 2000
    ):
        return jsonify({"error": "Notes must be text of at most 2000 characters."}), 400
    if not row.acknowledged_at:
        row.acknowledged_at = datetime.now(timezone.utc)
        row.acknowledged_by, _ = get_current_user_id()
        row.notes = body.get("notes", "").strip()
        db.session.commit()
    return jsonify(row.as_event())
