from pydantic import BaseModel
from typing import Optional
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
    
    user = relationship("DBUser", back_populates="tasks")

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True 