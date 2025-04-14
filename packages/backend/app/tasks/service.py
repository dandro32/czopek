from sqlalchemy.orm import Session
from .models import DBTask, TaskCreate
from app.auth.models import DBUser

def create_task(db: Session, task: TaskCreate, user: DBUser):
    db_task = DBTask(
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        priority=task.priority,
        user_id=user.id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_user_tasks(db: Session, user: DBUser):
    return db.query(DBTask).filter(DBTask.user_id == user.id).all()

def get_task(db: Session, task_id: int, user: DBUser):
    return db.query(DBTask).filter(DBTask.id == task_id, DBTask.user_id == user.id).first()

def update_task(db: Session, task_id: int, task: TaskCreate, user: DBUser):
    db_task = get_task(db, task_id, user)
    if db_task:
        for key, value in task.dict(exclude_unset=True).items():
            setattr(db_task, key, value)
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int, user: DBUser):
    db_task = get_task(db, task_id, user)
    if db_task:
        db.delete(db_task)
        db.commit()
    return db_task 