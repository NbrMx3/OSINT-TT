def test_register_and_read_profile(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "analyst@example.com", "full_name": "Amina Analyst", "password": "strong-password-123"},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    assert response.json()["user"]["role"] == "analyst"

    profile = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 200
    assert profile.json()["email"] == "analyst@example.com"


def test_login_rejects_invalid_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "another@example.com", "full_name": "Another Analyst", "password": "strong-password-123"},
    )
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "another@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401

