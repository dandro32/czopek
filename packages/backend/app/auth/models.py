from pydantic import BaseModel, EmailStr
from sqlalchemy import Boolean, Column, Integer, String
from database import Base

class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool = True

    class Config:
        orm_mode = True

class UserInDB(User):
    hashed_password: str

class UserLogin(BaseModel):
    username: str
    password: str

class RefreshToken(BaseModel):
    refresh_token: str 