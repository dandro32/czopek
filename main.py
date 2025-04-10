from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Dict
import os
import openai
from models import User, UserCreate, UserLogin, RefreshToken
from security import (
    Token, verify_password, get_password_hash, create_access_token,
    create_refresh_token, verify_token
)

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token dostępu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = fake_users_db.get(token_data.username)
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    return user

@app.post("/register", response_model=User)
async def register(user: UserCreate):
    if user.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Nazwa użytkownika jest już zajęta")
    
    user_dict = user.model_dump()
    user_dict["id"] = len(fake_users_db) + 1
    user_dict["hashed_password"] = get_password_hash(user.password)
    del user_dict["password"]
    
    fake_users_db[user.username] = user_dict
    return user_dict

@app.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    user = fake_users_db.get(user_data.username)
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowa nazwa użytkownika lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["username"]})
    refresh_token = create_refresh_token(data={"sub": user["username"]})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/refresh", response_model=Token)
async def refresh_token(token: RefreshToken):
    token_data = verify_token(token.refresh_token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token odświeżania",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = fake_users_db.get(token_data.username)
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    
    access_token = create_access_token(data={"sub": user["username"]})
    refresh_token = create_refresh_token(data={"sub": user["username"]})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Wylogowano pomyślnie"}

@app.post("/chat", response_model=ChatResponse)
async def chat_with_gpt(request: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        has_system_message = any(msg["role"] == "system" for msg in messages)
        if not has_system_message:
            messages.insert(0, DEFAULT_SYSTEM_MESSAGE)
            
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages
        )
        return ChatResponse(response=response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}