from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from database import Base
from sqlalchemy.orm import relationship

class DBTask(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String, default="medium")
    user_id = Column(Integer, ForeignKey("users.id"))
    source = Column(String, default="manual")
    calendar_event_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    
    user = relationship("DBUser", back_populates="tasks")

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"
    source: Optional[str] = "manual"
    calendar_event_id: Optional[str] = None
    status: str = "pending"

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True

class TaskList(BaseModel):
    tasks: List[Task]
    calendar_imported: bool = False
    total_count: int = 0
    pending_count: int = 0
    completed_count: int = 0 