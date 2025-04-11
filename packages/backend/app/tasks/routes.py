from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from .models import Task, TaskCreate, DBTask
from app.auth.routes import get_current_user
from app.auth.models import DBUser

router = APIRouter()

@router.post("", response_model=Task)
async def create_task(task: TaskCreate, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = DBTask(**task.dict(), user_id=current_user.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("", response_model=List[Task])
async def get_tasks(current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(DBTask).filter(DBTask.user_id == current_user.id).all()
    return tasks

@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: int, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(DBTask).filter(DBTask.id == task_id, DBTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
    return task

@router.put("/{task_id}", response_model=Task)
async def update_task(task_id: int, task: TaskCreate, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = db.query(DBTask).filter(DBTask.id == task_id, DBTask.user_id == current_user.id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
    
    for key, value in task.dict().items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}")
async def delete_task(task_id: int, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(DBTask).filter(DBTask.id == task_id, DBTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Zadanie nie znalezione")
    
    db.delete(task)
    db.commit()
    return {"message": "Zadanie zostało usunięte"} 