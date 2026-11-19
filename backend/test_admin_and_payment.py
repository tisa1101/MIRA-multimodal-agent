from fastapi.testclient import TestClient
from backend.main import app
from backend.services.user_service import load_users, load_transactions

client = TestClient(app)


def test_google_auth_endpoint():
    payload = {
        "email": "test.judge@hackathon.org",
        "name": "Judge Jane",
        "picture": "https://example.com/avatar.png",
        "google_id": "google_123456789",
    }
    response = client.post("/api/auth/google", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["user"]["email"] == "test.judge@hackathon.org"
    assert data["user"]["name"] == "Judge Jane"
    assert data["user"]["auth_provider"] == "google"


def test_payment_order_and_verification():
    # 1. Create ₹1 Order
    order_req = {
        "user_id": "test.judge@hackathon.org",
        "email": "test.judge@hackathon.org",
        "amount_inr": 1.0,
    }
    order_res = client.post("/api/payment/create-order", json=order_req)
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert "order_id" in order_data
    assert order_data["amount"] == 100  # 100 paise = ₹1

    # 2. Verify Payment
    verify_req = {
        "order_id": order_data["order_id"],
        "payment_id": "pay_test_verified_12345",
        "user_id": "test.judge@hackathon.org",
        "amount_inr": 1.0,
    }
    verify_res = client.post("/api/payment/verify", json=verify_req)
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["status"] == "success"
    assert verify_data["user"]["is_elite"] is True
    assert verify_data["user"]["role"] == "elite"
    assert verify_data["transaction"]["amount"] == 1.0


def test_admin_stats_and_users():
    stats_res = client.get("/api/admin/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["totalUsers"] >= 1
    assert stats["totalRevenueINR"] >= 1.0

    users_res = client.get("/api/admin/users")
    assert users_res.status_code == 200
    users_data = users_res.json()
    assert len(users_data["users"]) >= 1

    # Toggle Elite
    first_user_id = users_data["users"][0]["id"]
    toggle_res = client.post("/api/admin/users/toggle-elite", json={"user_id": first_user_id})
    assert toggle_res.status_code == 200
    toggle_data = toggle_res.json()
    assert "user" in toggle_data
