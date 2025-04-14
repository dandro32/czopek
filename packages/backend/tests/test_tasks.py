import pytest
from httpx import AsyncClient

test_task = {
    "title": "Test Task",
    "description": "Test Description",
    "priority": "high"
}

@pytest.mark.asyncio
async def test_create_task(async_client: AsyncClient, auth_headers):
    response = await async_client.post("/tasks/", json=test_task, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == test_task["title"]
    assert data["description"] == test_task["description"]
    return data["id"]

@pytest.mark.asyncio
async def test_get_tasks(async_client: AsyncClient, auth_headers):
    response = await async_client.get("/tasks/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_task(async_client: AsyncClient, auth_headers):
    task_id = await test_create_task(async_client, auth_headers)
    response = await async_client.get(f"/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task_id

@pytest.mark.asyncio
async def test_update_task(async_client: AsyncClient, auth_headers):
    task_id = await test_create_task(async_client, auth_headers)
    update_data = {
        "title": "Updated Task",
        "description": "Updated Description",
        "priority": "low"
    }
    response = await async_client.put(f"/tasks/{task_id}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]

@pytest.mark.asyncio
async def test_delete_task(async_client: AsyncClient, auth_headers):
    task_id = await test_create_task(async_client, auth_headers)
    response = await async_client.delete(f"/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 204 