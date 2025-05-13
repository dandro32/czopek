from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database
from database import async_get_db
from app.auth.routes import get_current_user
from app.auth.models import UserInDB
from .models import Task, TaskCreate, TaskList, TaskUpdate
from .service import (
    create_task, get_user_tasks, get_task, update_task, delete_task,
)
from app.shared.models import ErrorResponse, SuccessResponse
from typing import List, Dict, Annotated
from datetime import datetime
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("", response_model=Task)
async def create_new_task(
    task: TaskCreate, 
    db: Annotated[Database, Depends(async_get_db)], 
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    print(f"[TASKS] Autoryzowano użytkownika: id={current_user.id}, username={current_user.username}")
    try:
        task_data = await create_task(db, task, current_user)
        # Dodaj id jako string z _id
        task_data["id"] = str(task_data["_id"])
        # Zwróć Task model Pydantic
        return Task(**task_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Nie udało się utworzyć zadania: {e}")

@router.get("", response_model=TaskList)
async def read_tasks(
    db: Annotated[Database, Depends(async_get_db)],
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    print(f"[TASKS] Pobieranie zadań dla: id={current_user.id}, username={current_user.username}")
    try:
        return await get_user_tasks(db, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Nie udało się pobrać zadań: {e}")

@router.get("/{task_id}", response_model=Task)
async def read_task(
    task_id: str,
    db: Annotated[Database, Depends(async_get_db)], 
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    try:
        task_data = await get_task(db, task_id, current_user.id)
        if task_data is None:
            raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
        # Upewnijmy się, że dane są zgodne z modelem Task
        return Task(**task_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Nie udało się pobrać zadania: {e}")

@router.put("/{task_id}", response_model=Task)
async def update_task_endpoint(
    task_id: str,
    task_update: TaskUpdate,
    db: Annotated[Database, Depends(async_get_db)], 
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    try:
        print(f"[TASKS] Aktualizacja zadania: {task_id}, dane: {task_update.dict()}")
        task_data = await update_task(db, task_id, task_update, current_user.id)
        if task_data is None:
            raise HTTPException(status_code=404, detail="Zadanie nie znalezione lub brak uprawnień")
        # Upewnijmy się, że dane są zgodne z modelem Task
        return Task(**task_data)
    except ValueError as e:
        # Błędy walidacji
        print(f"[TASKS] Błąd walidacji podczas aktualizacji zadania: {e}")
        raise HTTPException(status_code=422, detail=f"Błąd walidacji danych: {str(e)}")
    except Exception as e:
        print(f"[TASKS] Błąd podczas aktualizacji zadania: {e}")
        raise HTTPException(status_code=500, detail=f"Nie udało się zaktualizować zadania: {e}")

@router.delete("/{task_id}", response_model=SuccessResponse)
async def delete_task_endpoint(
    task_id: str,
    db: Annotated[Database, Depends(async_get_db)], 
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    try:
        deleted = await delete_task(db, task_id, current_user.id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Zadanie nie znalezione lub brak uprawnień")
        return SuccessResponse(message="Zadanie usunięte pomyślnie")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Nie udało się usunąć zadania: {e}") 