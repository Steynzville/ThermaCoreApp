"""Additional coverage tests for example routes."""

from flask import Flask

from app.routes.examples import register_example_routes


def _payload(response):
    if isinstance(response, tuple):
        return response[0].get_json()
    return response.get_json()


def test_metrics_demo_fallback_method_branch(app):
    """Directly execute metrics view with an unlisted method to cover fallback branch."""
    view = app.view_functions["example.metrics_demo"]

    with app.test_request_context("/api/v1/examples/metrics-demo", method="DELETE"):
        response = view()

    data = _payload(response)
    assert data["data"]["message"] == "Method processed"


def test_register_example_routes_registers_blueprint():
    """Registering blueprint should return app instance with example blueprint attached."""
    flask_app = Flask(__name__)
    returned_app = register_example_routes(flask_app)

    assert returned_app is flask_app
    assert "example" in flask_app.blueprints
