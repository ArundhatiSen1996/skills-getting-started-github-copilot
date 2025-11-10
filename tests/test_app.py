from fastapi.testclient import TestClient
from urllib.parse import quote
import uuid

from src.app import app


client = TestClient(app)


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    # basic smoke-check: known activity present
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    # use a unique email so tests can run repeatedly
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    activity = "Chess Club"

    # encode activity name for path
    signup_path = f"/activities/{quote(activity)}/signup"

    # Sign up the student
    resp = client.post(signup_path, params={"email": email})
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify participant is in activity
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    activities = resp2.json()
    assert email in activities[activity]["participants"]

    # Duplicate signup should fail with 400
    resp_dup = client.post(signup_path, params={"email": email})
    assert resp_dup.status_code == 400

    # Now unregister
    del_path = f"/activities/{quote(activity)}/participants"
    resp_del = client.delete(del_path, params={"email": email})
    assert resp_del.status_code == 200

    # Confirm removal
    resp3 = client.get("/activities")
    assert resp3.status_code == 200
    assert email not in resp3.json()[activity]["participants"]
