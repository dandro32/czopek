import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session
from database import Base, engine

@pytest.fixture(autouse=True)
def setup_test():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

test_user_data = {
    "email": "test@example.com",
    "username": "testuser",
    "password": "test123"
}

@pytest.mark.asyncio
async def test_register_user(async_client: AsyncClient):
    response = await async_client.post("/auth/register", json=test_user_data)
    assert response.status_code == 200, f"Response: {response.json()}"
    data = response.json()
    assert "id" in data
    assert data["email"] == test_user_data["email"]
    assert data["username"] == test_user_data["username"]

@pytest.mark.asyncio
async def test_register_duplicate_user(async_client: AsyncClient):
    # Pierwszy rejestr powinien się udać
    response = await async_client.post("/auth/register", json=test_user_data)
    assert response.status_code == 200

    # Drugi rejestr powinien się nie udać
    response = await async_client.post("/auth/register", json=test_user_data)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_login_user(async_client: AsyncClient):
    # Najpierw zarejestruj użytkownika
    await async_client.post("/auth/register", json=test_user_data)
    
    login_data = {
        "username": test_user_data["username"],
        "password": test_user_data["password"]
    }
    response = await async_client.post("/auth/login", json=login_data)
    assert response.status_code == 200, f"Response: {response.json()}"
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client: AsyncClient):
    # Najpierw zarejestruj użytkownika
    await async_client.post("/auth/register", json=test_user_data)
    
    login_data = {
        "username": test_user_data["username"],
        "password": "wrongpassword"
    }
    response = await async_client.post("/auth/login", json=login_data)
    assert response.status_code == 401 