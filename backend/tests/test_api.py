import os
from pathlib import Path
from fastapi.testclient import TestClient

# Keep tests isolated from a developer's local database.
test_db = Path(__file__).parent / "test_northstar.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db}"
os.environ["JWT_SECRET"] = "test-only-secret-that-must-never-be-used-in-production-123456"

# Reload modules after environment setup so engine uses the isolated test DB.
from app.main import app
from app.database import Base, engine
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_register_project_and_work_item_flow():
    response = client.post("/api/v1/auth/register", json={"email":"dev@example.com", "full_name":"Test Developer", "password":"long-test-password-123"})
    assert response.status_code == 201
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    project = client.post("/api/v1/projects", json={"name":"Website launch", "description":"First release"}, headers=headers)
    assert project.status_code == 201
    project_id = project.json()["id"]
    item = client.post(f"/api/v1/projects/{project_id}/work-items", json={"title":"Define MVP", "description":"Agree scope"}, headers=headers)
    assert item.status_code == 201
    item_id = item.json()["id"]
    completed = client.patch(f"/api/v1/work-items/{item_id}/complete", headers=headers)
    assert completed.status_code == 200 and completed.json()["is_done"] is True
    dashboard = client.get("/api/v1/dashboard", headers=headers).json()
    assert dashboard == {"projects": 1, "work_items": 1, "completed_items": 1}

def test_protected_endpoint_requires_auth():
    assert client.get("/api/v1/projects").status_code == 401

def test_duplicate_email_rejected():
    client.post("/api/v1/auth/register", json={"email":"duplicate@example.com", "full_name":"First User", "password":"long-test-password-123"})
    response = client.post("/api/v1/auth/register", json={"email":"duplicate@example.com", "full_name":"Second User", "password":"long-test-password-123"})
    assert response.status_code == 409
