from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from app.auth.routes import get_current_user
from app.auth.models import DBUser
from .models import Task, TaskCreate, TaskList
from .service import (
    create_task, get_user_tasks, get_task, update_task, delete_task,
    import_calendar_events, group_tasks_by_date, get_tasks_with_stats
)
from app.shared.models import ErrorResponse, SuccessResponse
from typing import List, Dict
from datetime import datetime
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("", response_model=Task)
async def create_new_task(task: TaskCreate, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    print(f"[TASKS] Autoryzowano użytkownika: id={current_user.id}, email={current_user.email}, username={current_user.username}")
    try:
        return create_task(db, task, current_user)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="Nie udało się utworzyć zadania",
                error_code="CREATE_TASK_ERROR",
                status_code=500,
                data={"error": str(e)}
            ).dict()
        )

@router.get("", response_model=TaskList)
async def read_tasks(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    print(f"[TASKS] Próba pobrania zadań: id={current_user.id}, email={current_user.email}, username={current_user.username}")
    try:
        tasks = get_tasks_with_stats(db, current_user)
        if not tasks.tasks:
            return JSONResponse(
                status_code=404,
                content=ErrorResponse(
                    detail="Brak zadań. Dodaj nowe zadanie lub połącz kalendarz Google, aby zaimportować wydarzenia.",
                    error_code="NO_TASKS",
                    status_code=404,
                    data={"calendar_imported": tasks.calendar_imported}
                ).dict()
            )
        return tasks
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="Nie udało się pobrać zadań",
                error_code="GET_TASKS_ERROR",
                status_code=500,
                data={"error": str(e)}
            ).dict()
        )

@router.get("/grouped", response_model=Dict[str, List[Task]])
async def read_grouped_tasks(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    try:
        tasks, calendar_imported = import_calendar_events(db, current_user)
        grouped = group_tasks_by_date(tasks)
        if not any(grouped.values()):
            return JSONResponse(
                status_code=404,
                content=ErrorResponse(
                    detail="Brak zadań. Dodaj nowe zadanie lub połącz kalendarz Google, aby zaimportować wydarzenia.",
                    error_code="NO_TASKS",
                    status_code=404,
                    data={"calendar_imported": calendar_imported}
                ).dict()
            )
        return grouped
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="Nie udało się pobrać pogrupowanych zadań",
                error_code="GET_GROUPED_TASKS_ERROR",
                status_code=500,
                data={"error": str(e)}
            ).dict()
        )

@router.get("/{task_id}", response_model=Task)
async def read_task(task_id: int, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    try:
        task = get_task(db, task_id, current_user)
        if task is None:
            return JSONResponse(
                status_code=404,
                content=ErrorResponse(
                    detail="Zadanie nie znalezione",
                    error_code="TASK_NOT_FOUND",
                    status_code=404,
                    data={"task_id": task_id}
                ).dict()
            )
        return task
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="Nie udało się pobrać zadania",
                error_code="GET_TASK_ERROR",
                status_code=500,
                data={"error": str(e), "task_id": task_id}
            ).dict()
        )

@router.put("/{task_id}", response_model=Task)
async def update_task_endpoint(task_id: int, task: TaskCreate, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    try:
        updated_task = update_task(db, task_id, task, current_user)
        if updated_task is None:
            return JSONResponse(
                status_code=404,
                content=ErrorResponse(
                    detail="Zadanie nie znalezione",
                    error_code="TASK_NOT_FOUND",
                    status_code=404,
                    data={"task_id": task_id}
                ).dict()
            )
        return updated_task
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="Nie udało się zaktualizować zadania",
                error_code="UPDATE_TASK_ERROR",
                status_code=500,
                data={"error": str(e), "task_id": task_id}
            ).dict()
        )

@router.delete("/{task_id}", response_model=Task)
async def delete_task_endpoint(task_id: int, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    try:
        task = delete_task(db, task_id, current_user)
        if task is None:
            return JSONResponse(
                status_code=404,
                content=ErrorResponse(
                    detail="Zadanie nie znalezione",
                    error_code="TASK_NOT_FOUND",
                    status_code=404,
                    data={"task_id": task_id}
                ).dict()
            )
        return task
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="Nie udało się usunąć zadania",
                error_code="DELETE_TASK_ERROR",
                status_code=500,
                data={"error": str(e), "task_id": task_id}
            ).dict()
        )

@router.put("/{task_id}/toggle", response_model=Task)
async def toggle_task_status(task_id: int, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    try:
        task = get_task(db, task_id, current_user)
        if task is None:
            return JSONResponse(
                status_code=404,
                content=ErrorResponse(
                    detail="Zadanie nie znalezione",
                    error_code="TASK_NOT_FOUND",
                    status_code=404,
                    data={"task_id": task_id}
                ).dict()
            )
        
        task.status = "completed" if task.status == "pending" else "pending"
        db.commit()
        db.refresh(task)
        return task
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="Nie udało się zmienić statusu zadania",
                error_code="TOGGLE_TASK_ERROR",
                status_code=500,
                data={"error": str(e), "task_id": task_id}
            ).dict()
        ) 