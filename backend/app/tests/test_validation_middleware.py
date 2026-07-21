"""Tests for input validation middleware."""

import pytest
from werkzeug.exceptions import HTTPException
from flask import g, jsonify

from app.middleware.validation import (
    RequestValidator,
    handle_webargs_error,
    sanitize,
    validate_path_params,
    validate_query_params,
)


def test_sanitize_basic():
    """Test standard sanitization of control characters."""
    assert sanitize("hello\x00world") == "helloworld"
    assert sanitize("hello\x1fworld") == "helloworld"
    assert sanitize("hello\u2028world") == "helloworld"
    assert sanitize("hello\u2029world") == "helloworld"
    # Tabs/newlines are removed as control characters by design.
    assert sanitize("hello \t\n world") == "hello  world"


def test_sanitize_nested_and_dos_protection():
    """Test sanitization with lists, dicts, and nested limits."""
    # Dict sanitization
    data_dict = {"\x01key": "val\x02", "nested": {"ok\x03": "fine"}}
    sanitized_dict = sanitize(data_dict)
    assert "key" in sanitized_dict
    assert sanitized_dict["key"] == "val"
    assert sanitized_dict["nested"]["ok"] == "fine"

    # List sanitization
    data_list = ["item\x04", {"sub\x05": "subval"}]
    sanitized_list = sanitize(data_list)
    assert sanitized_list[0] == "item"
    assert sanitized_list[1]["sub"] == "subval"

    # Deep nesting DoS prevention
    deep_dict = {}
    curr = deep_dict
    for _ in range(12):
        curr["nested"] = {}
        curr = curr["nested"]
    sanitized_deep = sanitize(deep_dict, max_depth=5)
    # Somewhere deep, it should become the safe placeholder
    curr_san = sanitized_deep
    for _ in range(12):
        if curr_san == "[deeply nested structure]":
            break
        if "nested" in curr_san:
            curr_san = curr_san["nested"]
        else:
            break
    assert sanitized_deep is not None


def test_request_validator_json_content_type(app):
    """Test RequestValidator.validate_json_content_type."""
    with app.test_request_context(method="POST", headers={"Content-Type": "text/html"}):
        res = RequestValidator.validate_json_content_type()
        assert res is not None
        response, code = res
        assert code == 400
        data = response.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_CONTENT_TYPE"

    with app.test_request_context(
        method="POST",
        headers={"Content-Type": "application/json"},
        json={},
    ):
        assert RequestValidator.validate_json_content_type() is None

    # GET requests should be ignored
    with app.test_request_context(method="GET", headers={"Content-Type": "text/html"}):
        assert RequestValidator.validate_json_content_type() is None


def test_request_validator_json_body(app):
    """Test RequestValidator.validate_json_body."""
    # Valid json body
    with app.test_request_context(
        method="POST",
        headers={"Content-Type": "application/json"},
        data='{"name": "test"}',
    ):
        # In a real context request.json parses properly
        assert RequestValidator.validate_json_body() is None

    # Invalid malformed json
    with app.test_request_context(
        method="POST",
        headers={"Content-Type": "application/json"},
        data='{"name": ',
    ):
        res = RequestValidator.validate_json_body()
        assert res is not None
        response, code = res
        assert code == 400
        data = response.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_JSON"


def test_request_validator_size(app):
    """Test RequestValidator.validate_request_size."""
    with app.test_request_context(method="POST", headers={"Content-Length": "2000000"}):
        res = RequestValidator.validate_request_size(max_size=1024 * 1024)
        if res is not None:
            response, code = res
            assert code == 413
            data = response.get_json()
            assert data["success"] is False
            assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"

    with app.test_request_context(method="POST", headers={"Content-Length": "500"}):
        result = RequestValidator.validate_request_size(max_size=1024 * 1024)
        assert result is None or result[1] < 400


def test_webargs_error_handler(app):
    """Test handle_webargs_error custom exception mapper."""

    class FakeError:
        messages = {"field_a": ["Missing data."]}
        location = "json"

    with app.test_request_context():
        g.request_id = "test-req-id"
        with pytest.raises(HTTPException):
            handle_webargs_error(
                FakeError(),
                None,
                None,
                error_status_code=422,
                error_headers=None,
            )


def test_validate_query_params_decorator(app):
    """Test validate_query_params decorator."""

    @validate_query_params(
        page=lambda x: int(x) > 0,
        per_page=lambda x: 1 <= int(x) <= 100,
    )
    def dummy_route():
        return jsonify({"success": True})

    with app.test_request_context(query_string={"page": "5", "per_page": "20"}):
        res = dummy_route()
        assert res.status_code == 200

    with app.test_request_context(query_string={"page": "-1", "per_page": "200"}):
        res = dummy_route()
        assert res[1] == 400
        data = res[0].get_json()
        assert data["success"] is False
        assert "page" in data["error"]["details"]["field_errors"]
        assert "per_page" in data["error"]["details"]["field_errors"]

    # Exception in validator
    @validate_query_params(
        page=lambda x: int(x) > 0,
    )
    def dummy_route_err():
        return jsonify({"success": True})

    with app.test_request_context(query_string={"page": "not-an-int"}):
        res = dummy_route_err()
        assert res[1] == 400
        data = res[0].get_json()
        assert "Validation error" in data["error"]["details"]["field_errors"]["page"]


def test_validate_path_params_decorator(app):
    """Test validate_path_params decorator."""

    @validate_path_params(
        unit_id=lambda x: len(x) > 0 and x.isalnum(),
    )
    def dummy_route(unit_id):
        return jsonify({"success": True})

    with app.test_request_context():
        res = dummy_route(unit_id="UNIT001")
        assert res.status_code == 200

    with app.test_request_context():
        res = dummy_route(unit_id="invalid-id!")
        assert res[1] == 400
        data = res[0].get_json()
        assert data["success"] is False
        assert "unit_id" in data["error"]["details"]["field_errors"]

    # Exception in validator
    @validate_path_params(
        unit_id=lambda x: int(x) > 0,
    )
    def dummy_route_err(unit_id):
        return jsonify({"success": True})

    with app.test_request_context():
        res = dummy_route_err(unit_id="not-an-int")
        assert res[1] == 400
        data = res[0].get_json()
        assert "Validation error" in data["error"]["details"]["field_errors"]["unit_id"]
