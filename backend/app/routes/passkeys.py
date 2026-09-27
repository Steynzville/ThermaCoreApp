"""Resident passkeys: actual browser ceremonies, mandatory UV and signature checks."""

import hmac
import json
import secrets
from datetime import timedelta
from urllib.parse import urlparse

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy.exc import IntegrityError
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app import db
from app.middleware.rate_limit import auth_rate_limit
from app.models import PasskeyChallenge, PasskeyCredential, User
from app.routes.auth_helpers import (
    audit_successful_login,
    create_jwt_tokens,
    update_last_login,
)
from app.routes.external_auth import digest, now, setting
from app.utils.schemas import UserSchema

passkeys_bp = Blueprint("passkeys", __name__)


def config():
    rp, origin = setting("WEBAUTHN_RP_ID"), setting("WEBAUTHN_ORIGIN")
    if not rp or not origin:
        raise ValueError(
            "Missing authentication configuration: WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN",
        )
    parsed = urlparse(origin)
    if (
        (
            parsed.scheme != "https"
            and not (parsed.scheme == "http" and parsed.hostname == "localhost")
        )
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
        or parsed.username
        or not (parsed.hostname == rp or (parsed.hostname or "").endswith("." + rp))
    ):
        raise ValueError(
            "Configure an HTTPS WebAuthn origin and matching relying-party domain",
        )
    return rp, origin.rstrip("/")


def current_user():
    verify_jwt_in_request()
    user = db.session.get(User, get_jwt_identity())
    return user if user and user.can_login() else None


def create_challenge(purpose, value, user=None, handle=None):
    secret = secrets.token_urlsafe(32)
    PasskeyChallenge.query.filter(PasskeyChallenge.expires_at < now()).delete()
    db.session.add(
        PasskeyChallenge(
            id=digest(secret),
            challenge=bytes_to_base64url(value),
            purpose=purpose,
            user_id=user.id if user else None,
            user_handle=handle,
            expires_at=now() + timedelta(minutes=5),
        ),
    )
    db.session.commit()
    return secret


def consume_challenge(secret, purpose, user_id=None):
    if not isinstance(secret, str):
        return None
    row = db.session.get(PasskeyChallenge, digest(secret))
    if (
        not row
        or row.used
        or row.purpose != purpose
        or row.expires_at <= now()
        or row.user_id != user_id
    ):
        return None
    claimed = PasskeyChallenge.query.filter_by(id=row.id, used=False).update(
        {"used": True},
    )
    db.session.commit()
    return row if claimed == 1 else None


@passkeys_bp.post("/auth/passkeys/register/options")
@auth_rate_limit
def registration_options():
    user = current_user()
    body = request.get_json(silent=True) or {}
    if (
        not user
        or not isinstance(body, dict)
        or not isinstance(body.get("password"), str)
        or not user.check_password(body["password"])
    ):
        return jsonify(
            {"error": "Confirm your current password to register a passkey"},
        ), 403
    try:
        rp, _ = config()
    except ValueError as error:
        return jsonify({"error": str(error)}), 503
    credentials = PasskeyCredential.query.filter_by(user_id=user.id).all()
    if len(credentials) >= 10:
        return jsonify({"error": "Remove an old passkey before adding another"}), 400
    handle = credentials[0].user_handle if credentials else secrets.token_urlsafe(32)
    options = generate_registration_options(
        rp_id=rp,
        rp_name="ThermaCore",
        user_name=user.username,
        user_id=base64url_to_bytes(handle),
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        exclude_credentials=[
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(row.credential_id))
            for row in credentials
        ],
    )
    return jsonify(
        {
            "transaction": create_challenge(
                "register", options.challenge, user, handle,
            ),
            "options": json.loads(options_to_json(options)),
        },
    )


@passkeys_bp.post("/auth/passkeys/register/verify")
@auth_rate_limit
def registration_verify():
    user = current_user()
    if not user:
        return jsonify({"error": "Account unavailable"}), 403
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return jsonify({"error": "Invalid passkey response"}), 400
    row = consume_challenge(body.get("transaction"), "register", user.id)
    if not row:
        return jsonify({"error": "Invalid or expired passkey challenge"}), 400
    try:
        rp, origin = config()
        verified = verify_registration_response(
            credential=body.get("credential", {}),
            expected_challenge=base64url_to_bytes(row.challenge),
            expected_rp_id=rp,
            expected_origin=origin,
            require_user_verification=True,
        )
        name = body.get("name", "Passkey")
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 100:
            raise ValueError("Invalid passkey name")
        db.session.add(
            PasskeyCredential(
                credential_id=bytes_to_base64url(verified.credential_id),
                user_id=user.id,
                public_key=bytes_to_base64url(verified.credential_public_key),
                user_handle=row.user_handle,
                sign_count=verified.sign_count,
                name=name.strip(),
            ),
        )
        db.session.commit()
        return jsonify({"registered": True}), 201
    except (WebAuthnException, ValueError, TypeError, KeyError, IntegrityError):
        db.session.rollback()
        return jsonify({"error": "Passkey registration could not be verified"}), 400


@passkeys_bp.post("/auth/passkeys/login/options")
@auth_rate_limit
def authentication_options():
    try:
        rp, _ = config()
    except ValueError as error:
        return jsonify({"error": str(error)}), 503
    options = generate_authentication_options(
        rp_id=rp, user_verification=UserVerificationRequirement.REQUIRED,
    )
    return jsonify(
        {
            "transaction": create_challenge("login", options.challenge),
            "options": json.loads(options_to_json(options)),
        },
    )


@passkeys_bp.post("/auth/passkeys/login/verify")
@auth_rate_limit
def authentication_verify():
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return jsonify({"error": "Invalid passkey response"}), 400
    challenge_row = consume_challenge(body.get("transaction"), "login")
    if not challenge_row:
        return jsonify({"error": "Invalid or expired passkey challenge"}), 400
    try:
        rp, origin = config()
        credential = body.get("credential", {})
        row = (
            PasskeyCredential.query.filter_by(credential_id=credential.get("id"))
            .with_for_update()
            .first()
        )
        if not row:
            raise ValueError("Unknown credential")
        handle = credential.get("response", {}).get("userHandle")
        if not isinstance(handle, str) or not hmac.compare_digest(
            base64url_to_bytes(handle), base64url_to_bytes(row.user_handle),
        ):
            raise ValueError("Account handle mismatch")
        verified = verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge_row.challenge),
            expected_rp_id=rp,
            expected_origin=origin,
            credential_public_key=base64url_to_bytes(row.public_key),
            credential_current_sign_count=row.sign_count,
            require_user_verification=True,
        )
        user = db.session.get(User, row.user_id)
        if not user or not user.can_login():
            raise ValueError("Account unavailable")
        row.sign_count = verified.new_sign_count
        db.session.commit()
        access, refresh, error = create_jwt_tokens(user, False)
        if error:
            return error
        update_last_login(user)
        audit_successful_login(user)
        result = jsonify(
            {
                "access_token": access,
                "refresh_token": refresh,
                "user": UserSchema().dump(user),
            },
        )
        result.headers["Cache-Control"] = "no-store"
        return result
    except (WebAuthnException, ValueError, TypeError, KeyError, AttributeError):
        db.session.rollback()
        return jsonify({"error": "Passkey sign-in could not be verified"}), 401


@passkeys_bp.get("/auth/passkeys")
def list_passkeys():
    user = current_user()
    if not user:
        return jsonify({"error": "Account unavailable"}), 403
    return jsonify(
        {
            "data": [
                {
                    "id": row.credential_id,
                    "name": row.name,
                    "createdAt": row.created_at.isoformat() + "Z",
                }
                for row in PasskeyCredential.query.filter_by(user_id=user.id).all()
            ],
        },
    )


@passkeys_bp.delete("/auth/passkeys/<credential_id>")
@auth_rate_limit
def delete_passkey(credential_id):
    user = current_user()
    body = request.get_json(silent=True) or {}
    if (
        not user
        or not isinstance(body, dict)
        or not isinstance(body.get("password"), str)
        or not user.check_password(body["password"])
    ):
        return jsonify(
            {"error": "Confirm your current password to remove a passkey"},
        ), 403
    row = PasskeyCredential.query.filter_by(
        credential_id=credential_id, user_id=user.id,
    ).first()
    if not row:
        return jsonify({"error": "Passkey not found"}), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify({"removed": True})
