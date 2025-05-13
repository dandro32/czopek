from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from bson import ObjectId # For MongoDB Object IDs
# Assuming PyObjectId is defined elsewhere (e.g., in a shared models file or copied here)
# If not defined, copy the PyObjectId class definition here:
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class CalendarCredentials(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId # Reference to the User's ObjectId
    token: str # Consider encrypting this in a real application
    refresh_token: Optional[str] = None # Consider encrypting this
    token_uri: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None # Definitely encrypt this
    scopes: Optional[List[str]] = None
    # token_expiry: Optional[datetime] = None # Field name might differ based on OAuth library
    # Using generic fields, adjust based on actual Google OAuth response/library used

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
        json_encoders = { ObjectId: str }

class CalendarEvent(BaseModel):
    id: str # Google Calendar event ID is usually a string
    summary: Optional[str] = None # Make optional as not all events have summary
    description: Optional[str] = None
    start: Optional[datetime] = None # Can be date or datetime
    end: Optional[datetime] = None   # Can be date or datetime
    location: Optional[str] = None
    # Add other relevant fields from Google Calendar API if needed

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