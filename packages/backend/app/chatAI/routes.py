from fastapi import APIRouter, HTTPException, Depends
import openai
from .models import ChatRequest, ChatResponse
from app.auth.routes import get_current_user
from app.auth.models import DBUser

router = APIRouter()

DEFAULT_SYSTEM_MESSAGE = {
    "role": "system",
    "content": "Jesteś pomocnym asystentem, który odpowiada w języku polskim. Starasz się udzielać zwięzłych i konkretnych odpowiedzi."
}

@router.post("", response_model=ChatResponse)
async def chat_with_gpt(request: ChatRequest, current_user: DBUser = Depends(get_current_user)):
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        has_system_message = any(msg["role"] == "system" for msg in messages)
        if not has_system_message:
            messages.insert(0, DEFAULT_SYSTEM_MESSAGE)
            
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=messages
        )
        return ChatResponse(response=response.choices[0].message['content'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 