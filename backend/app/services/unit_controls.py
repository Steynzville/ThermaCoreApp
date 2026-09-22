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
    allowed = {
        "machinePower",
        "waterProductionOn",
        "autoSwitchEnabled",
        "powerSetpoint",
        "waterSetpoint",
    }
    if not isinstance(controls, dict) or not controls or set(controls) - allowed:
        raise ControlError("Provide one or more supported control fields.")
    for key, value in controls.items():
        if key in {"machinePower", "waterProductionOn", "autoSwitchEnabled"}:
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
            "Cannot enable production on an offline unit. Turn on machine power first."
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
            "No HTTPS device control gateway configured for this unit.", 503
        )
    for key in ("powerSetpoint", "waterSetpoint"):
        if controls.get(key, 0) > 0:
            limit = gateway.get("limits", {}).get(key)
            if limit is None or controls[key] > limit:
                raise ControlError(
                    f"{key} exceeds the configured device limit or no limit is configured."
                )
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
            "Device gateway did not acknowledge the requested controls.", 502
        )
    command = UnitCommand(
        id=command_id, unit_id=unit.id, user_id=int(user_id), controls=controls
    )
    db.session.add(command)
    db.session.commit()
    return command
