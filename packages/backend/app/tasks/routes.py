from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from app.auth.routes import get_current_user
from app.auth.models import DBUser
from .models import Task, TaskCreate
from .service import create_task, get_user_tasks, get_task, update_task, delete_task
from typing import List

router = APIRouter()

@router.post("", response_model=Task)
async def create_new_task(task: TaskCreate, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    return create_task(db, task, current_user)

@router.get("", response_model=List[Task])
async def read_tasks(db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    return get_user_tasks(db, current_user)

@router.get("/{task_id}", response_model=Task)
async def read_task(task_id: int, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    task = get_task(db, task_id, current_user)
    if task is None:
        raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
    return task

@router.put("/{task_id}", response_model=Task)
async def update_task_endpoint(task_id: int, task: TaskCreate, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    updated_task = update_task(db, task_id, task, current_user)
    if updated_task is None:
        raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
    return updated_task

@router.delete("/{task_id}", response_model=Task)
async def delete_task_endpoint(task_id: int, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    task = delete_task(db, task_id, current_user)
    if task is None:
        raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
    return task 