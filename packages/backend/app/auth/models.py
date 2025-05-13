from pydantic import BaseModel, EmailStr
from typing import Optional
from bson import ObjectId

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str # MongoDB uses string IDs by default
    is_active: bool = True

    class Config:
        orm_mode = True # Keep orm_mode for potential compatibility, or remove if not needed
        # Add alias for _id if you want to map MongoDB's _id to 'id'
        allow_population_by_field_name = True 
        json_encoders = {
            ObjectId: str # Assuming you might use ObjectId later
        }

class UserInDB(UserBase):
    id: Optional[str] = None  # Opcjonalne, żeby można było tworzyć bez ID
    hashed_password: str
    is_active: bool = True
    
    class Config:
        orm_mode = True
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str
        }

class UserLogin(BaseModel):
    username: str
    password: str

class RefreshToken(BaseModel):
    refresh_token: str

# Placeholder for ObjectId if needed, or import from bson if beanie/pymongo is used elsewhere
# from bson import ObjectId # Removed from here 