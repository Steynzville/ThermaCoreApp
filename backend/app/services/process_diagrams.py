"""Public, explicitly configured topology; never infer internal plumbing."""
import json
import math
import os
from flask import current_app

FIELDS = {"tempIn", "tempOutHot", "tempOutChill", "ambientTemp", "ambientHumidity", "flowRateInlet", "flowRateOutHot", "flowRateOutChill", "currentPower", "usefulHeat", "usefulChill", "waterRate", "awgWaterLevel", "differentialPressure", "batteryVoltage"}


def public_process_diagram(unit_id):
    config = current_app.config.get("UNIT_PROCESS_DIAGRAMS", os.getenv("UNIT_PROCESS_DIAGRAMS", "{}"))
    try:
        config = json.loads(config) if isinstance(config, str) else config
        diagram = config.get(str(unit_id), {})
        nodes, connections = [], []
        for node in diagram.get("nodes", [])[:100]:
            if (not isinstance(node.get("id"), str) or node.get("field") not in FIELDS
                    or any(type(node.get(axis)) not in (int, float) or not math.isfinite(node[axis]) or not 0 <= node[axis] <= 2000 for axis in ("x", "y"))):
                continue
            nodes.append({key: node.get(key) for key in ("id", "label", "icon", "x", "y", "field", "unit")})
        ids = {node["id"] for node in nodes}
        for edge in diagram.get("connections", [])[:200]:
            if edge.get("from") in ids and edge.get("to") in ids:
                connections.append({key: edge.get(key) for key in ("id", "from", "to")})
        return {"nodes": nodes, "connections": connections}
    except (TypeError, ValueError, AttributeError):
        return {"nodes": [], "connections": []}
