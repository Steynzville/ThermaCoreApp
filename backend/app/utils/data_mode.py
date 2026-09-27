"""Demo services require explicit opt-in; development mode never implies demo data."""

import os

from flask import current_app, has_app_context


def demo_enabled(app=None):
    app = app or (current_app if has_app_context() else None)
    value = (
        app.config.get("DEMO_DATA_ENABLED", os.getenv("DEMO_DATA_ENABLED", "false"))
        if app is not None
        else os.getenv("DEMO_DATA_ENABLED", "false")
    )
    return value is True or (isinstance(value, str) and value.lower() == "true")
