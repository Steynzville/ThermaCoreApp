import io

from PIL import Image

from app.models import AccountProfile


def test_own_profile_preferences_and_authorization(client, portfolio_data, db_session):
    p = portfolio_data
    for user in p["users"].values():
        user.registration_status = "approved"
    db_session.commit()
    headers = p["headers"]["viewer"]
    response = client.put(
        "/api/v1/account/settings",
        headers=headers,
        json={
            "profile": {"username": "viewer-renamed", "displayName": "My portfolio"},
            "preferences": {
                "theme": "light",
                "refreshInterval": 60000,
                "soundEnabled": False,
            },
        },
    )
    assert response.status_code == 200
    assert response.json["profile"]["username"] == "viewer-renamed"
    assert (
        client.get("/api/v1/account/settings", headers=headers).json["preferences"][
            "refreshInterval"
        ]
        == 60000
    )
    assert (
        client.get("/api/v1/account/settings", headers=p["headers"]["operator"]).json[
            "preferences"
        ]["refreshInterval"]
        == 30000
    )
    for body in [
        {"user_id": p["users"]["admin"].id},
        {"profile": {"role": "admin"}},
        {"preferences": {"maintenanceMode": True}},
        {"preferences": {"volume": 9}},
        {"profile": {"username": "a"}},
        {"preferences": {"refreshInterval": 1}},
    ]:
        assert (
            client.put(
                "/api/v1/account/settings", headers=headers, json=body,
            ).status_code
            == 400
        )
    assert client.get("/api/v1/account/settings").status_code == 401


def test_avatar_decode_reencode_limits_and_own_account(
    client, portfolio_data, db_session,
):
    p = portfolio_data
    user = p["users"]["viewer"]
    user.registration_status = "approved"
    db_session.commit()
    headers = p["headers"]["viewer"]

    def upload(content, name):
        return client.post(
            "/api/v1/account/avatar",
            headers=headers,
            data={"avatar": (io.BytesIO(content), name)},
            content_type="multipart/form-data",
        )

    assert upload(b'<svg onload="alert(1)"/>', "fake.png").status_code == 400
    assert upload(b"X" * (2 * 1024 * 1024 + 1), "too-large.png").status_code == 413
    image = io.BytesIO()
    Image.new("RGB", (600, 400), "blue").save(image, "JPEG")
    response = upload(image.getvalue(), "../../avatar.jpg")
    assert response.status_code == 200
    saved = db_session.get(AccountProfile, user.id)
    with Image.open(io.BytesIO(saved.avatar_png)) as result:
        assert result.format == "PNG"
        assert max(result.size) == 256
        assert not result.getexif()
    assert response.json["profile"]["avatarDataUrl"].startswith(
        "data:image/png;base64,",
    )
    assert client.delete("/api/v1/account/avatar", headers=headers).status_code == 200
    assert (
        client.get("/api/v1/account/settings", headers=headers).json["profile"][
            "avatarDataUrl"
        ]
        is None
    )
