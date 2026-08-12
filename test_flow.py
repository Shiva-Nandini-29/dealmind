import os
import sys
import shutil
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Adjust python path to find app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app, get_db
from app.database.models import Base

# Setup isolated test database
TEST_DB_FILE = "./test_dealmind.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def safe_str(val):
    """
    Encodes a string to ASCII, replacing non-ASCII characters like Rupee (₹) with '?'
    to prevent terminal encoding crashes on Windows.
    """
    if not val:
        return ""
    if isinstance(val, str):
        return val.encode('ascii', errors='replace').decode('ascii')
    return str(val)

# Dependency override
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def setup_module():
    # Remove test DB if exists
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    Base.metadata.create_all(bind=engine)

def teardown_module():
    # Close connections
    engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception as e:
            print(f"Warning: Could not remove test database file: {safe_str(e)}")

def test_full_application_flow():
    setup_module()
    print("\n--- Starting DealMind AI Integration Test ---")

    # 1. Test Authentication - Register User
    print("Test 1: User Registration...")
    reg_response = client.post(
        "/api/auth/register",
        json={"email": "test@dealmind.ai", "password": "password123", "full_name": "Test Salesperson"}
    )
    assert reg_response.status_code == 201, f"Failed registration: {reg_response.text}"
    user_data = reg_response.json()
    assert user_data["email"] == "test@dealmind.ai"
    assert "id" in user_data
    print("[OK] User registered successfully.")

    # 2. Test Authentication - Login User
    print("Test 2: User Login...")
    login_response = client.post(
        "/api/auth/login",
        data={"username": "test@dealmind.ai", "password": "password123"}
    )
    assert login_response.status_code == 200, f"Failed login: {login_response.text}"
    token_data = login_response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] User logged in and retrieved JWT token.")

    # Verify /api/auth/me
    me_response = client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["full_name"] == "Test Salesperson"

    # 3. Test Customer Management - Create Customer
    print("Test 3: Creating Customer profile...")
    cust_response = client.post(
        "/api/customers",
        json={
            "name": "Zenith Analytics",
            "company": "Zenith Corp",
            "role": "VP Operations",
            "email": "cfo@zenith.com",
            "phone": "+1 555-900-1100",
            "industry": "Analytics",
            "requirements": "Automated reporting system for multi-tenant users",
            "pain_points": "Reports take over 5 minutes to generate",
            "budget": "$15,000",
            "decision_maker": "Marcus Aurelius (CFO)"
        },
        headers=headers
    )
    assert cust_response.status_code == 201, f"Failed customer creation: {cust_response.text}"
    customer = cust_response.json()
    assert customer["name"] == "Zenith Analytics"
    assert customer["company"] == "Zenith Corp"
    customer_id = customer["id"]
    print(f"[OK] Customer created with ID: {customer_id}")

    # Verify listing customers
    list_cust = client.get("/api/customers", headers=headers)
    assert list_cust.status_code == 200
    assert len(list_cust.json()) >= 1

    # 4. Test Deal Management - Create Deal
    print("Test 4: Creating Deal Opportunity...")
    deal_response = client.post(
        "/api/deals",
        json={
            "customer_id": customer_id,
            "name": "Zenith Enterprise Analytics Platform",
            "value": 15000.0,
            "stage": "Lead",
            "probability": 10.0
        },
        headers=headers
    )
    assert deal_response.status_code == 201, f"Failed deal creation: {deal_response.text}"
    deal = deal_response.json()
    assert deal["name"] == "Zenith Enterprise Analytics Platform"
    deal_id = deal["id"]
    print(f"[OK] Deal created with ID: {deal_id}")

    # 5. Test Conversation Intelligence & Memory Extraction
    print("Test 5: Posting Conversation & Simulating Memory Extraction...")
    conv_response = client.post(
        f"/api/deals/{deal_id}/conversations",
        json={
            "title": "Zenith Intro & Objection Review",
            "transcript": "Salesperson: Hi Marcus, how is the reporting speed affecting your team?\nMarcus: It slows down client check-ins. We have a budget of $15,000 but need a 10% discount to sign this month. Also, security reviews are required by our board."
        },
        headers=headers
    )
    assert conv_response.status_code == 201, f"Failed logging conversation: {conv_response.text}"
    conv = conv_response.json()
    assert conv["title"] == "Zenith Intro & Objection Review"
    assert "summary" in conv
    assert conv["summary"] is not None
    print(f"[OK] Conversation logged. AI Summary: '{safe_str(conv['summary'])}'")

    # 6. Verify Hindsight Fallback & Database Memory Storage
    print("Test 6: Verifying Memory Storage...")
    deal_details = client.get(f"/api/deals/{deal_id}", headers=headers)
    assert deal_details.status_code == 200
    deal_data = deal_details.json()
    # Risk and action should be auto-populated
    assert deal_data["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert deal_data["next_action"] is not None
    print(f"[OK] Deal risk set to: {safe_str(deal_data['risk_level'])}")
    print(f"[OK] Next action plan: {safe_str(deal_data['next_action'])}")

    # 7. Test Grounded AI Chat Assistant
    print("Test 7: Querying AI Chat Assistant...")
    chat_response = client.post(
        "/api/ai/chat",
        json={
            "message": "What budget and discount requests does Zenith Corp have?",
            "deal_id": deal_id
        },
        headers=headers
    )
    assert chat_response.status_code == 200, f"Chat failed: {chat_response.text}"
    chat_data = chat_response.json()
    assert "response" in chat_data
    assert len(chat_data["sources"]) > 0
    print(f"[OK] AI Chat grounded response: '{safe_str(chat_data['response'][:120])}...'")
    print(f"[OK] AI Chat cited sources: {safe_str(chat_data['sources'])}")

    # 8. Verify Dashboard Metrics
    print("Test 8: Verifying Dashboard Stats...")
    stats_response = client.get("/api/dashboard/stats", headers=headers)
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total_customers"] >= 1
    assert stats["active_deals"] >= 1
    assert stats["total_pipeline_value"] >= 15000.0
    print("[OK] Dashboard stats verified correctly.")

    teardown_module()
    print("\n--- All DealMind AI Integration Tests Passed Successfully! ---")

if __name__ == "__main__":
    try:
        test_full_application_flow()
    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {safe_str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Unexpected error running tests: {safe_str(e)}")
        sys.exit(1)
    sys.exit(0)
