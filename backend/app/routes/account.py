"""Current-account settings; never accepts target user IDs or administrative fields."""

import base64
import io
import math
import re
import warnings

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.exc import IntegrityError

from app import db
from app.middleware.rate_limit import standard_rate_limit
from app.models import AccountProfile, User

account_bp = Blueprint("account", __name__)
DEFAULTS = {
    "soundEnabled": True,
    "volume": 0.35,
    "refreshInterval": 30000,
    "temperatureUnit": "celsius",
    "theme": "auto",
}


def account():
    user = db.session.get(User, get_jwt_identity())
    return user if user and user.can_login() else None


def profile_for(user):
    return db.session.get(AccountProfile, user.id) or AccountProfile(
        user_id=user.id,
        preferences={},
    )


def response_for(user, profile):
    return {
        "profile": {
            "username": user.username,
            "email": user.email,
            "firstName": user.first_name or "",
            "lastName": user.last_name or "",
            "displayName": profile.display_name or "",
            "avatarDataUrl": "data:image/png;base64,"
            + base64.b64encode(profile.avatar_png).decode()
            if profile.avatar_png
            else None,
        },
        "preferences": {**DEFAULTS, **(profile.preferences or {})},
    }


@account_bp.get("/account/settings")
@jwt_required()
def get_settings():
    user = account()
    if not user:
        return jsonify({"error": "Account unavailable"}), 403
    return jsonify(response_for(user, profile_for(user)))


@account_bp.put("/account/settings")
@jwt_required()
@standard_rate_limit
def save_settings():
    user = account()
    if not user:
        return jsonify({"error": "Account unavailable"}), 403
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or set(body) - {"profile", "preferences"}:
        return jsonify(
            {"error": "Only own profile and application preferences may be changed"},
        ), 400
    profile = profile_for(user)
    try:
        changes = body.get("profile", {})
        if not isinstance(changes, dict) or set(changes) - {
            "username",
            "firstName",
            "lastName",
            "displayName",
        }:
            raise ValueError("Unsupported profile field")
        for key, value in changes.items():
            if (
                not isinstance(value, str)
                or len(value.strip()) > 100
                or any(ord(char) < 32 for char in value)
            ):
                raise ValueError(
                    "Profile fields must contain up to 100 printable characters",
                )
            value = value.strip()
            if key == "username":
                if not re.fullmatch(r"[A-Za-z0-9_.-]{3,80}", value):
                    raise ValueError(
                        "Username must be 3–80 letters, numbers, dots, hyphens or underscores",
                    )
                user.username = value
            elif key == "displayName":
                profile.display_name = value
            else:
                setattr(
                    user,
                    "first_name" if key == "firstName" else "last_name",
                    value,
                )
        prefs = body.get("preferences", {})
        if not isinstance(prefs, dict) or set(prefs) - set(DEFAULTS):
            raise ValueError("Unsupported application preference")
        for key, value in prefs.items():
            if key == "soundEnabled" and type(value) is not bool:
                raise ValueError("Sound must be enabled or disabled")
            if key == "volume" and (
                type(value) not in (int, float)
                or not math.isfinite(value)
                or not 0 <= value <= 1
            ):
                raise ValueError("Volume must be between 0 and 1")
            if key == "refreshInterval" and (
                type(value) is not int or value not in {5000, 15000, 30000, 60000}
            ):
                raise ValueError("Choose a supported refresh interval")
            if key == "temperatureUnit" and value not in ("celsius", "fahrenheit"):
                raise ValueError("Choose Celsius or Fahrenheit")
            if key == "theme" and value not in ("light", "dark", "auto"):
                raise ValueError("Choose light, dark or system theme")
        profile.preferences = {**(profile.preferences or {}), **prefs}
        db.session.add(profile)
        db.session.commit()
    except ValueError as error:
        db.session.rollback()
        return jsonify({"error": str(error)}), 400
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "That username is already in use"}), 409
    return jsonify(response_for(user, profile))


@account_bp.route("/account/avatar", methods=["POST", "DELETE"])
@jwt_required()
@standard_rate_limit
def avatar():
    user = account()
    if not user:
        return jsonify({"error": "Account unavailable"}), 403
    profile = profile_for(user)
    if request.method == "DELETE":
        profile.avatar_png = None
    else:
        upload = request.files.get("avatar")
        if not upload:
            return jsonify({"error": "Choose a PNG, JPEG or WebP image"}), 400
        content = upload.stream.read(2 * 1024 * 1024 + 1)
        if len(content) > 2 * 1024 * 1024:
            return jsonify({"error": "Profile images must be at most 2 MB"}), 413
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(content)) as image:
                    if (
                        image.format not in {"PNG", "JPEG", "WEBP"}
                        or image.width * image.height > 4_000_000
                    ):
                        raise ValueError
                    image.load()
                    clean = ImageOps.exif_transpose(image).convert("RGB")
                    clean.thumbnail((256, 256))
                    clean.info.clear()
                    output = io.BytesIO()
                    clean.save(output, format="PNG")
                    profile.avatar_png = output.getvalue()
        except (
            ValueError,
            OSError,
            UnidentifiedImageError,
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
        ):
            return jsonify(
                {"error": "Use a valid PNG, JPEG or WebP image up to four megapixels"},
            ), 400
    db.session.add(profile)
    db.session.commit()
    return jsonify(response_for(user, profile))
