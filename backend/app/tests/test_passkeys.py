"""Exercise real WebAuthn parsing and ECDSA signatures without physical hardware."""

import hashlib
import json
import secrets

import cbor2
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from webauthn.helpers import bytes_to_base64url as encode

from app.models import User


def test_real_passkey_registration_authentication_and_replay(
    app, client, admin_token, db_session, monkeypatch,
):
    monkeypatch.setitem(app.config, "WEBAUTHN_RP_ID", "example.test")
    monkeypatch.setitem(app.config, "WEBAUTHN_ORIGIN", "https://app.example.test")
    user = User.query.filter_by(username="admin").one()
    user.registration_status = "approved"
    db_session.commit()
    headers = {"Authorization": f"Bearer {admin_token}"}
    assert (
        client.post(
            "/api/v1/auth/passkeys/register/options",
            headers=headers,
            json={"password": "wrong"},
        ).status_code
        == 403
    )
    options = client.post(
        "/api/v1/auth/passkeys/register/options",
        headers=headers,
        json={"password": "admin123"},
    ).json
    private = ec.generate_private_key(ec.SECP256R1())
    numbers = private.public_key().public_numbers()
    credential_id = secrets.token_bytes(32)
    cose = cbor2.dumps(
        {
            1: 2,
            3: -7,
            -1: 1,
            -2: numbers.x.to_bytes(32, "big"),
            -3: numbers.y.to_bytes(32, "big"),
        },
    )
    rp_hash = hashlib.sha256(b"example.test").digest()
    auth_data = (
        rp_hash
        + bytes([0x45])
        + bytes(4)
        + bytes(16)
        + len(credential_id).to_bytes(2, "big")
        + credential_id
        + cose
    )
    client_data = json.dumps(
        {
            "type": "webauthn.create",
            "challenge": options["options"]["challenge"],
            "origin": "https://app.example.test",
        },
    ).encode()
    credential = {
        "id": encode(credential_id),
        "rawId": encode(credential_id),
        "type": "public-key",
        "response": {
            "clientDataJSON": encode(client_data),
            "attestationObject": encode(
                cbor2.dumps({"fmt": "none", "attStmt": {}, "authData": auth_data}),
            ),
        },
    }
    body = {
        "transaction": options["transaction"],
        "credential": credential,
        "name": "Test authenticator",
    }
    assert (
        client.post(
            "/api/v1/auth/passkeys/register/verify", headers=headers, json=body,
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/api/v1/auth/passkeys/register/verify", headers=headers, json=body,
        ).status_code
        == 400
    )
    assert (
        client.get("/api/v1/auth/passkeys", headers=headers).json["data"][0]["name"]
        == "Test authenticator"
    )

    def assertion(origin="https://app.example.test", flags=5, count=1):
        login = client.post("/api/v1/auth/passkeys/login/options", json={}).json
        data = json.dumps(
            {
                "type": "webauthn.get",
                "challenge": login["options"]["challenge"],
                "origin": origin,
            },
        ).encode()
        auth = rp_hash + bytes([flags]) + count.to_bytes(4, "big")
        signature = private.sign(
            auth + hashlib.sha256(data).digest(), ec.ECDSA(hashes.SHA256()),
        )
        return {
            "transaction": login["transaction"],
            "credential": {
                "id": encode(credential_id),
                "rawId": encode(credential_id),
                "type": "public-key",
                "response": {
                    "clientDataJSON": encode(data),
                    "authenticatorData": encode(auth),
                    "signature": encode(signature),
                    "userHandle": options["options"]["user"]["id"],
                },
            },
        }

    assert (
        client.post(
            "/api/v1/auth/passkeys/login/verify",
            json=assertion(origin="https://attacker.test"),
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/passkeys/login/verify", json=assertion(flags=1),
        ).status_code
        == 401
    )
    valid = assertion()
    response = client.post("/api/v1/auth/passkeys/login/verify", json=valid)
    assert response.status_code == 200
    assert response.json["user"]["id"] == user.id and response.json["access_token"]
    assert (
        client.post("/api/v1/auth/passkeys/login/verify", json=valid).status_code == 400
    )
    assert (
        client.post(
            "/api/v1/auth/passkeys/login/verify", json=assertion(count=1),
        ).status_code
        == 401
    )
    assert (
        client.delete(
            f"/api/v1/auth/passkeys/{encode(credential_id)}",
            headers=headers,
            json={"password": "wrong"},
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/api/v1/auth/passkeys/{encode(credential_id)}",
            headers=headers,
            json={"password": "admin123"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/auth/passkeys/login/verify", json=assertion(count=2),
        ).status_code
        == 401
    )


def test_passkeys_require_explicit_origin_configuration(client):
    response = client.post("/api/v1/auth/passkeys/login/options", json={})
    assert response.status_code == 503
    assert "WEBAUTHN_RP_ID" in response.json["error"]
