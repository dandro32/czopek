from fastapi import FastAPI
from dotenv import load_dotenv
import os
import openai
from app.auth.routes import router as auth_router
from app.tasks.routes import router as tasks_router
from app.chatAI.routes import router as chat_router
from app.whisper.routes import router as whisper_router

load_dotenv()

app = FastAPI()

openai.api_key = os.getenv("OPENAI_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY nie został ustawiony w pliku .env")

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(whisper_router, prefix="/whisper", tags=["whisper"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}