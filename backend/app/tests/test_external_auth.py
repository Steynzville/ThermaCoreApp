from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.models import ExternalIdentity, User
from app.routes.external_auth import challenge, verify_identity


@pytest.mark.parametrize("provider", ["google", "apple"])
def test_oidc_link_login_pkce_and_replay(
    app,
    client,
    admin_token,
    db_session,
    provider,
    monkeypatch,
):
    monkeypatch.setitem(app.config, "AUTH_FRONTEND_URL", "https://app.example.test")
    for suffix, value in {
        "CLIENT_ID": "test-client",
        "CLIENT_SECRET": "test-secret",
        "REDIRECT_URI": f"https://api.example.test/api/v1/auth/oauth/{provider}/callback",
    }.items():
        monkeypatch.setitem(app.config, f"OAUTH_{provider.upper()}_{suffix}", value)
    user = User.query.filter_by(username="admin").one()
    user.registration_status = "approved"
    db_session.commit()
    headers = {"Authorization": f"Bearer {admin_token}"}
    verifier = "A" * 43
    payload = {"challenge": challenge(verifier), "link": True, "password": "wrong"}
    assert (
        client.post(
            f"/api/v1/auth/oauth/{provider}/start",
            headers=headers,
            json=payload,
        ).status_code
        == 403
    )
    payload["password"] = "admin123"
    for linking in (True, False):
        payload["link"] = linking
        response = client.post(
            f"/api/v1/auth/oauth/{provider}/start",
            headers=headers,
            json=payload,
        )
        assert response.status_code == 200
        params = parse_qs(urlparse(response.json["url"]).query)
        state = params["state"][0]
        if provider == "google":
            assert params["code_challenge_method"] == ["S256"]
        else:
            assert params["response_mode"] == ["form_post"]
        token = Mock()
        token.json.return_value = {"id_token": "signed-provider-token"}
        with (
            patch("app.routes.external_auth.requests.post", return_value=token),
            patch(
                "app.routes.external_auth.verify_identity",
                return_value="stable-subject",
            ) as verify,
        ):
            callback = client.get(
                f"/api/v1/auth/oauth/{provider}/callback",
                query_string={"state": state, "code": "provider-code"},
            )
            assert callback.status_code == 303
            verify.assert_called_once_with(
                provider,
                "signed-provider-token",
                "test-client",
                params["nonce"][0],
            )
            assert (
                client.get(
                    f"/api/v1/auth/oauth/{provider}/callback",
                    query_string={"state": state, "code": "provider-code"},
                ).status_code
                == 400
            )
        ticket = parse_qs(urlparse(callback.location).fragment)["auth_code"][0]
        assert "access_token" not in callback.location
        assert (
            client.post(
                "/api/v1/auth/oauth/exchange",
                json={"code": ticket, "verifier": "B" * 43},
            ).status_code
            == 400
        )
        result = client.post(
            "/api/v1/auth/oauth/exchange",
            json={"code": ticket, "verifier": verifier},
        )
        assert result.status_code == 200
        if linking:
            assert result.json["linked"] is True
        else:
            assert result.json["user"]["id"] == user.id
        assert (
            client.post(
                "/api/v1/auth/oauth/exchange",
                json={"code": ticket, "verifier": verifier},
            ).status_code
            == 400
        )
    assert (
        db_session.get(ExternalIdentity, (provider, "stable-subject")).user_id
        == user.id
    )


def test_provider_configuration_is_explicit_and_states_fail_closed(client):
    response = client.post(
        "/api/v1/auth/oauth/google/start",
        json={"challenge": "A" * 43},
    )
    assert response.status_code == 503
    assert "OAUTH_GOOGLE_CLIENT_ID" in response.json["error"]
    assert (
        client.post(
            "/api/v1/auth/oauth/exchange",
            json={"code": "unknown", "verifier": "A" * 43},
        ).status_code
        == 400
    )


def test_identity_signature_audience_issuer_nonce_and_expiry_are_validated():
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    client = Mock()
    client.get_signing_key_from_jwt.return_value = SimpleNamespace(
        key=private.public_key(),
    )
    now = datetime.now(timezone.utc)
    claims = {
        "sub": "subject",
        "iss": "https://accounts.google.com",
        "aud": "client",
        "nonce": "nonce",
        "iat": now,
        "exp": now + timedelta(minutes=5),
    }
    with patch("app.routes.external_auth.key_client", return_value=client):
        assert (
            verify_identity(
                "google",
                jwt.encode(claims, private, algorithm="RS256"),
                "client",
                "nonce",
            )
            == "subject"
        )
        for change in (
            {"aud": "attacker"},
            {"iss": "https://attacker.test"},
            {"nonce": "wrong"},
            {"exp": now - timedelta(minutes=1)},
        ):
            with pytest.raises((ValueError, jwt.PyJWTError)):
                verify_identity(
                    "google",
                    jwt.encode({**claims, **change}, private, algorithm="RS256"),
                    "client",
                    "nonce",
                )
        with pytest.raises(jwt.PyJWTError):
            verify_identity(
                "google",
                jwt.encode(claims, "attacker-secret", algorithm="HS256"),
                "client",
                "nonce",
            )
