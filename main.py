from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Dict
import os
import openai
from models import User, UserCreate, UserLogin, RefreshToken, DBUser
from security import (
    Token, verify_password, get_password_hash, create_access_token,
    create_refresh_token, verify_token
)
from database import SessionLocal, engine, get_db
from sqlalchemy.orm import Session

load_dotenv()

app = FastAPI()
security = HTTPBearer()

openai.api_key = os.getenv("OPENAI_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY nie został ustawiony w pliku .env")

fake_users_db: Dict[str, Dict] = {}

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

class ChatResponse(BaseModel):
    response: str

DEFAULT_SYSTEM_MESSAGE = {
    "role": "system",
    "content": "Jesteś pomocnym asystentem, który odpowiada w języku polskim. Starasz się udzielać zwięzłych i konkretnych odpowiedzi."
}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)):
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token dostępu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(DBUser).filter(DBUser.username == token_data.username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    return user

@app.post("/register", response_model=User)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Nazwa użytkownika jest już zajęta")
    
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email jest już zajęty")
    
    user_dict = user.dict()
    hashed_password = get_password_hash(user_dict["password"])
    del user_dict["password"]
    
    db_user = DBUser(**user_dict, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowa nazwa użytkownika lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/refresh", response_model=Token)
async def refresh_token(token: RefreshToken, db: Session = Depends(get_db)):
    token_data = verify_token(token.refresh_token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token odświeżania",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(DBUser).filter(DBUser.username == token_data.username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/logout")
async def logout(current_user: DBUser = Depends(get_current_user)):
    return {"message": "Wylogowano pomyślnie"}

@app.post("/chat", response_model=ChatResponse)
async def chat_with_gpt(request: ChatRequest, current_user: DBUser = Depends(get_current_user)):
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        has_system_message = any(msg["role"] == "system" for msg in messages)
        if not has_system_message:
            messages.insert(0, DEFAULT_SYSTEM_MESSAGE)
            
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=messages
        )
        return ChatResponse(response=response.choices[0].message['content'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}