import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, engine
from sqlalchemy import text

client = TestClient(app)

def setup_module(module):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS listings"))
        conn.execute(text("DROP TABLE IF EXISTS books"))
        conn.execute(text("DROP TABLE IF EXISTS users"))

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_signup_and_login():
    r = client.post("/auth/signup", json={"email": "a@b.com", "password": "secret12"})
    assert r.status_code == 201
    r = client.post("/auth/login", json={"email": "a@b.com", "password": "secret12"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

def test_book_and_listing_flow():
    r = client.post("/auth/login", json={"email": "a@b.com", "password": "secret12"})
    token = r.json()["access_token"]
    r = client.post("/books", json={"title": "Dune", "author": "Frank Herbert", "language": "en", "isbn": "9780441172719", "description": "Sci-fi"})
    assert r.status_code == 201
    book_id = r.json()["id"]
    r = client.get("/books")
    assert r.status_code == 200
    assert len(r.json()) >= 1
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post("/listings", json={"book_id": book_id, "price": 9.99, "condition": "Good", "is_active": True}, headers=headers)
    assert r.status_code == 201
    r = client.get("/listings")
    assert r.status_code == 200
    assert len(r.json()) == 1
