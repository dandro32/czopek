from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from database import Base
from sqlalchemy.orm import relationship

class CalendarCredentials(Base):
    __tablename__ = "calendar_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String)
    refresh_token = Column(String)
    token_expiry = Column(DateTime)
    
    user = relationship("DBUser", back_populates="calendar_credentials")

class CalendarEvent(BaseModel):
    id: str
    summary: str
    description: Optional[str] = None
    start: datetime
    end: datetime
    location: Optional[str] = None

class CalendarEventCreate(BaseModel):
    summary: str
    description: Optional[str] = None
    start: datetime
    end: datetime
    location: Optional[str] = None

class TaskFromEvent(BaseModel):
    event_id: str
    title: str
    description: Optional[str] = None
    due_date: datetime
    priority: str = "medium"

class CalendarEventList(BaseModel):
    events: List[CalendarEvent] 