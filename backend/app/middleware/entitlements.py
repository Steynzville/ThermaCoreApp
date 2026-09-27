"""Premium entitlements are read from the current account, not client claims."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app import db
from app.models import User, AccountEntitlement

def has_scada(user):
    if not user or not user.is_active:
        return False
    if user.role and user.role.name.value == "admin":
        return True
    record = db.session.get(AccountEntitlement, user.id)
    return bool(record and record.premium_scada)

def premium_required(function):
    @wraps(function)
    def checked(*args, **kwargs):
        verify_jwt_in_request()
        if not has_scada(db.session.get(User, get_jwt_identity())):
            return jsonify({"error": "Premium SCADA entitlement required"}), 403
        return function(*args, **kwargs)
    return checked
