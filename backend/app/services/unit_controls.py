"""Configured HTTP device gateway. A command is successful only after acknowledgement."""

import json
import math
import os
import uuid
from urllib.parse import urlparse

import requests
from flask import current_app

from app import db
from app.models import UnitCommand, UnitStatusEnum


class ControlError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def acknowledged_controls(unit_id):
    commands = (
        UnitCommand.query.filter_by(unit_id=unit_id)
        .order_by(UnitCommand.created_at)
        .all()
    )
    state = {}
    for command in commands:
        state.update(command.controls)
    return state


def execute_control(unit, controls, user_id):
    balance_outputs = {
        "powerHeatBalance": unit.supports_heat,
        "powerChillBalance": unit.supports_chill,
        "powerWaterBalance": unit.supports_water,
    }
    allowed = {
        *balance_outputs,
        "operationMode",
        "machinePower",
        "waterProductionOn",
        "autoSwitchEnabled",
        "powerSetpoint",
        "waterSetpoint",
    }
    if not isinstance(controls, dict) or not controls or set(controls) - allowed:
        raise ControlError("Provide one or more supported control fields.")
    for key, value in controls.items():
        if key == "operationMode":
            if not isinstance(value, str) or len(value) > 80:
                raise ControlError("operationMode must be a supported mode name.")
        elif key in {"machinePower", "waterProductionOn", "autoSwitchEnabled"}:
            if type(value) is not bool:
                raise ControlError(f"{key} must be boolean.")
        elif type(value) not in (int, float) or not math.isfinite(value) or value < 0:
            raise ControlError(f"{key} must be a finite non-negative number.")
    state = {
        "machinePower": unit.status == UnitStatusEnum.ONLINE,
        "waterProductionOn": unit.water_generation,
        **acknowledged_controls(unit.id),
        **controls,
    }
    if controls.get("machinePower") is False:
        controls = {
            **controls,
            "waterProductionOn": False,
            "autoSwitchEnabled": False,
            "powerSetpoint": 0,
            "waterSetpoint": 0,
        }
    elif not state["machinePower"] and any(
        controls.get(k) for k in allowed - {"machinePower"}
    ):
        raise ControlError(
            "Cannot enable production on an offline unit. Turn on machine power first.",
        )
    if controls.get("waterSetpoint", 0) > 0 and not state["waterProductionOn"]:
        raise ControlError("Enable water production before setting its output.")
    gateways = current_app.config.get("UNIT_CONTROL_GATEWAYS")
    if gateways is None:
        try:
            gateways = json.loads(os.environ.get("UNIT_CONTROL_GATEWAYS", "{}"))
        except ValueError as exc:
            raise ControlError("Device gateway configuration is invalid.", 503) from exc
    gateway = gateways.get(unit.id, {})
    url = gateway.get("url", "")
    if urlparse(url).scheme != "https":
        raise ControlError(
            "No HTTPS device control gateway configured for this unit.",
            503,
        )
    if "operationMode" in controls and controls["operationMode"] not in gateway.get(
        "operation_modes",
        [],
    ):
        raise ControlError("Operation mode is not configured for this device.")
    for key in ("powerSetpoint", "waterSetpoint"):
        if controls.get(key, 0) > 0:
            limit = gateway.get("limits", {}).get(key)
            if limit is None or controls[key] > limit:
                raise ControlError(
                    f"{key} exceeds the configured device limit or no limit is configured.",
                )
    for key, capable in balance_outputs.items():
        if key in controls:
            if not capable or key not in gateway.get("balance_fields", []):
                raise ControlError("Operating balance is not configured for this output.")
            if controls[key] > 100:
                raise ControlError("Operating balance must be between 0 and 100.")
    command_id = str(uuid.uuid4())
    headers = {"Content-Type": "application/json", "Idempotency-Key": command_id}
    if gateway.get("token"):
        headers["Authorization"] = f"Bearer {gateway['token']}"
    try:
        response = requests.post(
            url,
            json={"command_id": command_id, "unit_id": unit.id, "controls": controls},
            headers=headers,
            timeout=10,
            allow_redirects=False,
        )
        response.raise_for_status()
        ack = response.json()
    except (requests.RequestException, ValueError) as exc:
        # A timeout may mean an unknown device outcome. Never silently retry.
        raise ControlError(
            "Gateway acknowledgement unavailable. Check device state before retrying.",
            502,
        ) from exc
    if (
        ack.get("command_id") != command_id
        or ack.get("acknowledged") is not True
        or ack.get("controls") != controls
    ):
        raise ControlError(
            "Device gateway did not acknowledge the requested controls.",
            502,
        )
    command = UnitCommand(
        id=command_id,
        unit_id=unit.id,
        user_id=int(user_id),
        controls=controls,
    )
    db.session.add(command)
    db.session.commit()
    return command


def public_control_configuration(unit_id):
    """Expose capabilities without revealing gateway URL or authorization token."""
    try:
        gateways = current_app.config.get("UNIT_CONTROL_GATEWAYS")
        if gateways is None:
            gateways = json.loads(os.environ.get("UNIT_CONTROL_GATEWAYS", "{}"))
        gateway = gateways.get(unit_id, {})
        return {
            "configured": urlparse(gateway.get("url", "")).scheme == "https",
            "balanceFields": gateway.get("balance_fields", []),
            "limits": gateway.get("limits", {}),
            "operationModes": gateway.get("operation_modes", []),
            "waterTriggerPercent": gateway.get("water_trigger_percent"),
        }
    except (TypeError, ValueError, AttributeError):
        return {"configured": False, "limits": {}, "operationModes": []}


def public_cameras(unit_id):
    try:
        cameras = current_app.config.get("UNIT_CAMERA_FEEDS")
        if cameras is None:
            cameras = json.loads(os.environ.get("UNIT_CAMERA_FEEDS", "{}"))
        return [
            {
                key: camera[key]
                for key in ("id", "name", "url", "resolution", "fps")
                if key in camera
            }
            for camera in cameras.get(unit_id, [])
            if urlparse(camera.get("url", "")).scheme == "https"
            and not urlparse(camera["url"]).username
            and not urlparse(camera["url"]).password
        ]
    except (TypeError, ValueError, AttributeError):
        return []
