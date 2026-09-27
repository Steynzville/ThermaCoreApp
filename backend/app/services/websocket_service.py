"""Authenticated Socket.IO telemetry; every delivery is checked against current ownership."""

import logging
from datetime import datetime, timezone
from time import time

from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import SocketIO, emit, join_room, leave_room

from app import db
from app.models import Tenant, Unit, User

logger = logging.getLogger(__name__)


class WebSocketService:
    def __init__(self, app=None):
        self.socketio = None
        self._app = app
        self._connected_clients = {}
        if app:
            self.init_app(app)

    def init_app(self, app):
        self._app = app
        self.socketio = SocketIO(
            app,
            async_mode="threading",
            manage_session=False,
            cors_allowed_origins=app.config.get(
                "WEBSOCKET_CORS_ORIGINS",
                app.config.get("CORS_ORIGINS", []),
            ),
            ping_timeout=app.config.get("WEBSOCKET_PING_TIMEOUT", 60),
            ping_interval=app.config.get("WEBSOCKET_PING_INTERVAL", 25),
            logger=False,
            engineio_logger=False,
        )
        for event in (
            "connect",
            "disconnect",
            "subscribe_unit",
            "unsubscribe_unit",
            "get_status",
        ):
            self.socketio.on_event(event, getattr(self, f"_on_{event}"))

    def _get_client_id(self):
        return request.sid

    def _user(self, info):
        if info.get("expires_at", 0) <= time():
            return None
        user = db.session.get(User, info["user_id"])
        return (
            user
            if user and user.is_active and user.has_permission("read_units")
            else None
        )

    def _allowed_units(self, user, selected=None):
        query = Unit.query
        role = user.role.name.value if user.role else None
        if role == "client_admin" and user.client_id is not None:
            query = query.join(Tenant).filter(Tenant.client_id == user.client_id)
        elif role in ("operator", "viewer") and user.tenant_id is not None:
            query = query.filter(Unit.tenant_id == user.tenant_id)
        elif role != "admin":
            return []
        if selected is not None:
            query = query.filter(Unit.tenant_id == selected)
        return [unit.id for unit in query.all()]

    def _on_connect(self, auth=None):
        try:
            if not isinstance(auth, dict) or not auth.get("token"):
                return False
            payload = decode_token(auth["token"])
            if payload.get("type") != "access":
                return False
            selected = auth.get("tenant_id")
            if selected is not None:
                selected = int(selected)
            info = {
                "user_id": int(payload["sub"]),
                "expires_at": payload["exp"],
                "tenant_id": selected,
                "connected_at": datetime.now(timezone.utc),
                "subscribed_units": [],
            }
            user = self._user(info)
            if not user:
                return False
            if selected is not None:
                tenant = db.session.get(Tenant, selected)
                role = user.role.name.value
                if (
                    not tenant
                    or (role == "client_admin" and tenant.client_id != user.client_id)
                    or (
                        role not in ("admin", "client_admin")
                        and tenant.id != user.tenant_id
                    )
                ):
                    return False
            info["subscribed_units"] = self._allowed_units(user, selected)
            self._connected_clients[self._get_client_id()] = info
            for unit_id in info["subscribed_units"]:
                join_room(f"unit_{unit_id}")
            emit(
                "connection_confirmed",
                {
                    "status": "connected",
                    "server_time": datetime.now(timezone.utc).isoformat(),
                },
            )
        except Exception:
            logger.info("Rejected unauthenticated Socket.IO connection")
            return False
        return True

    def _on_disconnect(self, reason=None):
        self._connected_clients.pop(self._get_client_id(), None)

    def _on_subscribe_unit(self, data):
        info = self._connected_clients.get(self._get_client_id(), {})
        user = self._user(info)
        unit_id = data.get("unit_id") if isinstance(data, dict) else None
        if not user or unit_id not in self._allowed_units(user, info.get("tenant_id")):
            emit("error", {"message": "Unit unavailable in your portfolio."})
            return
        join_room(f"unit_{unit_id}")
        if unit_id not in info["subscribed_units"]:
            info["subscribed_units"].append(unit_id)
        emit("subscription_confirmed", {"unit_id": unit_id, "status": "subscribed"})

    def _on_unsubscribe_unit(self, data):
        unit_id = data.get("unit_id") if isinstance(data, dict) else None
        if not unit_id:
            return
        leave_room(f"unit_{unit_id}")
        info = self._connected_clients.get(self._get_client_id(), {})
        if unit_id in info.get("subscribed_units", []):
            info["subscribed_units"].remove(unit_id)
        emit("unsubscription_confirmed", {"unit_id": unit_id, "status": "unsubscribed"})

    def _on_get_status(self):
        info = self._connected_clients.get(self._get_client_id(), {})
        user = self._user(info)
        if not user:
            return
        allowed = self._allowed_units(user, info.get("tenant_id"))
        emit(
            "status_response",
            {
                "subscribed_units": [
                    uid for uid in info["subscribed_units"] if uid in allowed
                ],
                "server_time": datetime.now(timezone.utc).isoformat(),
            },
        )

    def _deliver(self, event, unit_id, message):
        if not self.socketio or not self._app:
            return
        with self._app.app_context():
            for sid, info in list(self._connected_clients.items()):
                user = self._user(info)
                if not user:
                    self.socketio.server.disconnect(sid)
                    self._connected_clients.pop(sid, None)
                    continue
                # Recheck role, ownership and active status on every broadcast.
                if unit_id in info[
                    "subscribed_units"
                ] and unit_id in self._allowed_units(user, info.get("tenant_id")):
                    self.socketio.emit(event, message, to=sid)

    @staticmethod
    def _timestamp(value=None):
        if isinstance(value, str):
            return value
        return (value or datetime.now(timezone.utc)).isoformat()

    def broadcast_sensor_data(self, unit_id, sensor_type, data):
        self._deliver(
            "sensor_data",
            unit_id,
            {
                "unit_id": unit_id,
                "sensor_type": sensor_type,
                "value": data.get("value"),
                "quality": data.get("quality", "GOOD"),
                "timestamp": self._timestamp(data.get("timestamp")),
            },
        )

    def broadcast_unit_status(self, unit_id, status_data):
        self._deliver(
            "unit_status",
            unit_id,
            {
                "unit_id": unit_id,
                "status": status_data.get("status"),
                "health_status": status_data.get("health_status"),
                "timestamp": self._timestamp(),
            },
        )

    def broadcast_system_alert(self, alert_data):
        # Unscoped infrastructure alerts must not expose one client's data to another.
        unit_id = alert_data.get("unit_id")
        if unit_id:
            self._deliver(
                "system_alert",
                unit_id,
                {**alert_data, "timestamp": self._timestamp()},
            )

    def broadcast_device_status(self, device_id, status_data):
        unit_id = status_data.get("unit_id", device_id)
        self._deliver(
            "device_status",
            unit_id,
            {
                "device_id": device_id,
                **status_data,
                "timestamp": self._timestamp(status_data.get("timestamp")),
            },
        )

    def get_connected_clients(self):
        return {
            sid: {
                "connected_at": info["connected_at"],
                "subscribed_units": list(info["subscribed_units"]),
            }
            for sid, info in self._connected_clients.items()
        }

    def get_status(self):
        return {
            "connected_clients": len(self._connected_clients),
            "clients": list(self._connected_clients),
            "service_status": "active" if self.socketio else "inactive",
        }


websocket_service = WebSocketService()
