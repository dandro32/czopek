from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from database import Base

class DBTask(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    due_at = Column(DateTime)
    remind_at = Column(DateTime)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    remind_at: Optional[datetime] = None
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True 