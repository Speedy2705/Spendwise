import os
import tempfile
from fastapi.testclient import TestClient


def build_client():
    fd, db_file = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"

    from app.main import app

    return TestClient(app), db_file


def signup_and_get_token(client: TestClient, email: str = "john@example.com") -> str:
    signup = client.post(
        "/auth/signup",
        json={"email": email, "full_name": "John", "password": "strongpass1"},
    )
    assert signup.status_code == 201
    return signup.json()["access_token"]


def test_signup_login_and_expense_idempotency():
    client, db_file = build_client()

    token = signup_and_get_token(client)

    payload = {
        "amount": "100.50",
        "category": "Food",
        "description": "Dinner",
        "date": "2026-01-01",
    }

    headers = {"Authorization": f"Bearer {token}", "Idempotency-Key": "abc123"}

    first = client.post("/expenses", json=payload, headers=headers)
    second = client.post("/expenses", json=payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]

    listing = client.get("/expenses?sort=date_desc", headers={"Authorization": f"Bearer {token}"})
    assert listing.status_code == 200
    data = listing.json()
    assert data["total"] == "100.50"
    assert len(data["expenses"]) == 1

    os.remove(db_file)


def test_expense_category_filter_case_insensitive_exact_match():
    client, db_file = build_client()

    token = signup_and_get_token(client, email="casecheck@example.com")

    headers = {"Authorization": f"Bearer {token}", "Idempotency-Key": "case-1"}
    first_payload = {
        "amount": "200.00",
        "category": "Food & Dining",
        "description": "Lunch",
        "date": "2026-01-01",
    }
    first = client.post("/expenses", json=first_payload, headers=headers)
    assert first.status_code == 201

    headers_second = {"Authorization": f"Bearer {token}", "Idempotency-Key": "case-2"}
    second_payload = {
        "amount": "90.00",
        "category": "Food",
        "description": "Snacks",
        "date": "2026-01-02",
    }
    second = client.post("/expenses", json=second_payload, headers=headers_second)
    assert second.status_code == 201

    filtered = client.get(
        "/expenses?category=food%20%26%20dining",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert filtered.status_code == 200
    payload = filtered.json()
    assert payload["total"] == "200.00"
    assert len(payload["expenses"]) == 1
    assert payload["expenses"][0]["category"] == "Food & Dining"

    os.remove(db_file)


def test_login_invalid_password_returns_401():
    client, db_file = build_client()

    signup_and_get_token(client, email="wrongpass@example.com")

    login = client.post(
        "/auth/login",
        json={"email": "wrongpass@example.com", "password": "incorrect-pass"},
    )
    assert login.status_code == 401
    assert login.json()["detail"] == "Invalid email or password"

    os.remove(db_file)


def test_create_expense_requires_idempotency_key_header():
    client, db_file = build_client()
    token = signup_and_get_token(client, email="noidem@example.com")

    payload = {
        "amount": "300.00",
        "category": "Transport",
        "description": "Cab",
        "date": "2026-01-03",
    }

    response = client.post(
        "/expenses",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Idempotency-Key header is required for safe retries"

    os.remove(db_file)


def test_idempotency_key_reuse_with_different_payload_returns_409():
    client, db_file = build_client()
    token = signup_and_get_token(client, email="idemconflict@example.com")

    headers = {"Authorization": f"Bearer {token}", "Idempotency-Key": "same-key"}
    first_payload = {
        "amount": "250.00",
        "category": "Utilities",
        "description": "Water bill",
        "date": "2026-01-05",
    }
    second_payload = {
        "amount": "251.00",
        "category": "Utilities",
        "description": "Water bill adjusted",
        "date": "2026-01-05",
    }

    first = client.post("/expenses", json=first_payload, headers=headers)
    second = client.post("/expenses", json=second_payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "Idempotency key already used for a different request"

    os.remove(db_file)


def test_create_expense_trims_category_text():
    client, db_file = build_client()
    token = signup_and_get_token(client, email="trimcat@example.com")

    payload = {
        "amount": "420.00",
        "category": "  Custom Local Category  ",
        "description": "Local purchase",
        "date": "2026-01-04",
    }

    created = client.post(
        "/expenses",
        json=payload,
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "trim-1"},
    )

    assert created.status_code == 201
    assert created.json()["category"] == "Custom Local Category"

    filtered = client.get(
        "/expenses?category=custom%20local%20category",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert filtered.status_code == 200
    data = filtered.json()
    assert len(data["expenses"]) == 1
    assert data["expenses"][0]["category"] == "Custom Local Category"

    os.remove(db_file)


def test_list_expenses_requires_authentication():
    client, db_file = build_client()

    response = client.get("/expenses")
    assert response.status_code == 403

    os.remove(db_file)
