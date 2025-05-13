from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId # For MongoDB Object IDs

# Helper for ObjectId serialization and validation
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

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"
    source: Optional[str] = "manual"
    calendar_event_id: Optional[str] = None
    status: str = "pending" # e.g., pending, in_progress, completed
    # user_id will be added in Task model, usually set by the application logic

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    title: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    # Allow partial updates
    class Config:
        extra = 'forbid' # Or 'ignore' if you want to silently ignore extra fields

class Task(TaskBase):
    id: str  # Zmiana z PyObjectId na str
    user_id: str  # String zamiast PyObjectId dla zgodności z UserInDB.id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat() # Ensure datetime is ISO string
        }

class TaskList(BaseModel):
    tasks: List[Task]
    # The following fields might be derived or calculated in the service layer
    calendar_imported: Optional[bool] = False
    total_count: Optional[int] = 0
    pending_count: Optional[int] = 0
    completed_count: Optional[int] = 0 