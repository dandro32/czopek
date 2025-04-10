from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List
import os
import openai

load_dotenv()

app = FastAPI()
security = HTTPBearer()

openai.api_key = os.getenv("OPENAI_API_KEY")
API_TOKEN = os.getenv("API_TOKEN", "your_api_token_here")

API_TOKEN = os.getenv("API_TOKEN")
if not API_TOKEN:
    raise RuntimeError("Brakuje API_TOKEN w .env")

DEFAULT_SYSTEM_MESSAGE = {
    "role": "system",
    "content": "Jesteś pomocnym asystentem, który odpowiada w języku polskim. Starasz się udzielać zwięzłych i konkretnych odpowiedzi."
}

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

class ChatResponse(BaseModel):
    response: str

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != API_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Nieprawidłowy token dostępu"
        )
    return credentials.credentials

@app.post("/chat", response_model=ChatResponse)
async def chat_with_gpt(request: ChatRequest, token: str = Depends(verify_token)):
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        has_system_message = any(msg["role"] == "system" for msg in messages)
        if not has_system_message:
            messages.insert(0, DEFAULT_SYSTEM_MESSAGE)
            
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )
        return ChatResponse(response=response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}