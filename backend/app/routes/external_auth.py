"""OIDC code flow with nonce, one-use state and browser-bound PKCE handoff."""

import base64
import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from urllib.parse import urlencode, urlparse

import jwt
import requests
from flask import Blueprint, current_app, jsonify, redirect, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy.exc import IntegrityError

from app import db
from app.middleware.rate_limit import auth_rate_limit
from app.models import ExternalIdentity, OAuthTransaction, User
from app.routes.auth_helpers import (
    audit_successful_login,
    check_user_can_login,
    create_jwt_tokens,
    update_last_login,
)
from app.utils.schemas import UserSchema

external_auth_bp = Blueprint("external_auth", __name__)
PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "jwks": "https://www.googleapis.com/oauth2/v3/certs",
        "issuer": ["https://accounts.google.com", "accounts.google.com"],
    },
    "apple": {
        "authorize": "https://appleid.apple.com/auth/authorize",
        "token": "https://appleid.apple.com/auth/token",
        "jwks": "https://appleid.apple.com/auth/keys",
        "issuer": "https://appleid.apple.com",
    },
}


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def challenge(value):
    return (
        base64.urlsafe_b64encode(hashlib.sha256(value.encode()).digest())
        .decode()
        .rstrip("=")
    )


def setting(name):
    return current_app.config.get(name) or os.getenv(name)


def configuration(provider):
    if provider not in PROVIDERS:
        raise ValueError("Unsupported sign-in provider")
    keys = [
        f"OAUTH_{provider.upper()}_{suffix}"
        for suffix in ("CLIENT_ID", "CLIENT_SECRET", "REDIRECT_URI")
    ]
    missing = [key for key in [*keys, "AUTH_FRONTEND_URL"] if not setting(key)]
    if missing:
        raise ValueError("Missing authentication configuration: " + ", ".join(missing))
    values = [setting(key) for key in keys]
    for url in [values[2], setting("AUTH_FRONTEND_URL")]:
        parsed = urlparse(url)
        if (
            (
                parsed.scheme != "https"
                and not (
                    parsed.scheme == "http"
                    and parsed.hostname in {"localhost", "127.0.0.1"}
                )
            )
            or parsed.username
            or parsed.password
            or parsed.fragment
            or parsed.query
        ):
            raise ValueError(
                "Authentication URLs must use HTTPS (HTTP only for localhost) without credentials, query or fragment.",
            )
    return values


@lru_cache(maxsize=2)
def key_client(provider):
    return jwt.PyJWKClient(PROVIDERS[provider]["jwks"], timeout=5)


def verify_identity(provider, encoded, audience, nonce):
    key = key_client(provider).get_signing_key_from_jwt(encoded)
    claims = jwt.decode(
        encoded,
        key.key,
        algorithms=["RS256"],
        audience=audience,
        issuer=PROVIDERS[provider]["issuer"],
        options={"require": ["exp", "iat", "iss", "aud", "sub", "nonce"]},
    )
    if not isinstance(claims["nonce"], str) or not hmac.compare_digest(
        claims["nonce"],
        nonce,
    ):
        raise ValueError("Identity nonce mismatch")
    if not isinstance(claims["sub"], str) or not 1 <= len(claims["sub"]) <= 255:
        raise ValueError("Invalid identity subject")
    if claims.get("azp", audience) != audience:
        raise ValueError("Identity authorized party mismatch")
    return claims["sub"]


@external_auth_bp.post("/auth/oauth/<provider>/start")
@auth_rate_limit
def start(provider):
    try:
        client_id, _, callback = configuration(provider)
    except ValueError as error:
        return jsonify({"error": str(error)}), 503
    body = request.get_json(silent=True) or {}
    if (
        not isinstance(body, dict)
        or not isinstance(body.get("challenge"), str)
        or not re.fullmatch(r"[A-Za-z0-9_-]{43}", body["challenge"])
    ):
        return jsonify({"error": "A SHA-256 browser challenge is required"}), 400
    link_user_id = None
    if body.get("link"):
        verify_jwt_in_request()
        user = db.session.get(User, get_jwt_identity())
        if (
            not user
            or not user.can_login()
            or not isinstance(body.get("password"), str)
            or not user.check_password(body["password"])
        ):
            return jsonify(
                {"error": "Confirm your current account password to link sign-in"},
            ), 403
        link_user_id = user.id
    state, nonce, verifier = (
        secrets.token_urlsafe(32),
        secrets.token_urlsafe(32),
        secrets.token_urlsafe(32),
    )
    OAuthTransaction.query.filter(OAuthTransaction.expires_at < now()).delete()
    db.session.add(
        OAuthTransaction(
            state_hash=digest(state),
            provider=provider,
            challenge=body["challenge"],
            nonce=nonce,
            verifier=verifier,
            expires_at=now() + timedelta(minutes=5),
            link_user_id=link_user_id,
        ),
    )
    db.session.commit()
    params = {
        "client_id": client_id,
        "redirect_uri": callback,
        "response_type": "code",
        "scope": "openid email" if provider == "google" else "email",
        "state": state,
        "nonce": nonce,
    }
    if provider == "google":
        params.update(code_challenge=challenge(verifier), code_challenge_method="S256")
    else:
        params["response_mode"] = "form_post"
    return jsonify({"url": PROVIDERS[provider]["authorize"] + "?" + urlencode(params)})


@external_auth_bp.route("/auth/oauth/<provider>/callback", methods=["GET", "POST"])
@auth_rate_limit
def callback(provider):
    try:
        client_id, client_secret, callback_url = configuration(provider)
    except ValueError as error:
        return jsonify({"error": str(error)}), 503
    values = request.form if request.method == "POST" else request.args
    state = values.get("state", "")
    transaction = db.session.get(OAuthTransaction, digest(state))
    if (
        not transaction
        or transaction.provider != provider
        or transaction.status != "pending"
        or transaction.expires_at <= now()
    ):
        return jsonify({"error": "Invalid or expired authentication state"}), 400
    claimed = OAuthTransaction.query.filter_by(
        state_hash=transaction.state_hash,
        status="pending",
    ).update({"status": "processing"})
    db.session.commit()
    if claimed != 1:
        return jsonify({"error": "Authentication state already used"}), 400
    frontend = setting("AUTH_FRONTEND_URL").rstrip("/") + "/login"
    try:
        if values.get("error") or not values.get("code"):
            raise ValueError("Provider authorization was not completed")
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": values["code"],
            "redirect_uri": callback_url,
            "grant_type": "authorization_code",
        }
        if provider == "google":
            payload["code_verifier"] = transaction.verifier
        response = requests.post(
            PROVIDERS[provider]["token"],
            data=payload,
            timeout=10,
            allow_redirects=False,
        )
        response.raise_for_status()
        transaction.subject = verify_identity(
            provider,
            response.json()["id_token"],
            client_id,
            transaction.nonce,
        )
        ticket = secrets.token_urlsafe(32)
        transaction.ticket_hash, transaction.status = digest(ticket), "authorized"
        transaction.expires_at = now() + timedelta(seconds=60)
        db.session.commit()
        result = redirect(frontend + "#" + urlencode({"auth_code": ticket}), code=303)
    except (ValueError, KeyError, requests.RequestException, jwt.PyJWTError):
        db.session.rollback()
        result = redirect(
            frontend
            + "#"
            + urlencode(
                {
                    "auth_error": "Provider authentication failed or was cancelled. Please try again.",
                },
            ),
            code=303,
        )
    result.headers["Cache-Control"] = "no-store"
    result.headers["Referrer-Policy"] = "no-referrer"
    return result


@external_auth_bp.post("/auth/oauth/exchange")
@auth_rate_limit
def exchange():
    body = request.get_json(silent=True) or {}
    if (
        not isinstance(body, dict)
        or not isinstance(body.get("code"), str)
        or not isinstance(body.get("verifier"), str)
        or not re.fullmatch(r"[A-Za-z0-9_-]{43,128}", body["verifier"])
    ):
        return jsonify({"error": "Invalid authentication handoff"}), 400
    transaction = OAuthTransaction.query.filter_by(
        ticket_hash=digest(body["code"]),
        status="authorized",
    ).first()
    if (
        not transaction
        or transaction.expires_at <= now()
        or not hmac.compare_digest(challenge(body["verifier"]), transaction.challenge)
    ):
        return jsonify({"error": "Invalid or expired authentication handoff"}), 400
    claimed = OAuthTransaction.query.filter_by(
        state_hash=transaction.state_hash,
        status="authorized",
    ).update({"status": "used"})
    db.session.commit()
    if claimed != 1:
        return jsonify({"error": "Authentication handoff already used"}), 400
    identity = db.session.get(
        ExternalIdentity,
        (transaction.provider, transaction.subject),
    )
    if transaction.link_user_id:
        user = db.session.get(User, transaction.link_user_id)
        if (
            not user
            or not user.can_login()
            or (identity and identity.user_id != user.id)
        ):
            return jsonify({"error": "This provider account cannot be linked"}), 403
        if not identity:
            db.session.add(
                ExternalIdentity(
                    provider=transaction.provider,
                    subject=transaction.subject,
                    user_id=user.id,
                ),
            )
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return jsonify({"error": "Provider account is already linked"}), 409
        return jsonify({"linked": True})
    user = db.session.get(User, identity.user_id) if identity else None
    if not user:
        return jsonify(
            {
                "error": "Sign in with your password and link this provider in Settings first.",
            },
        ), 403
    error = check_user_can_login(user)
    if error:
        return error
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


@external_auth_bp.get("/auth/oauth/identities")
def identities():
    verify_jwt_in_request()
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.can_login():
        return jsonify({"error": "Account unavailable"}), 403
    return jsonify(
        {
            "providers": sorted(
                {
                    row.provider
                    for row in ExternalIdentity.query.filter_by(user_id=user.id).all()
                },
            ),
        },
    )
