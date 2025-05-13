import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pymongo.database import Database
from contextlib import asynccontextmanager
from typing import AsyncGenerator

load_dotenv()

MONGO_USER = os.getenv("MONGO_USER")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD")
MONGO_HOST = os.getenv("MONGO_HOST", "localhost")
MONGO_PORT = os.getenv("MONGO_PORT", "27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "czopek_db")

if MONGO_USER and MONGO_PASSWORD:
    MONGODB_URL = f"mongodb://{MONGO_USER}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/"
else:
    # Domyślne połączenie dla localhost bez uwierzytelniania, jeśli nie podano użytkownika/hasła
    MONGODB_URL = f"mongodb://{MONGO_HOST}:{MONGO_PORT}/"

client = MongoClient(MONGODB_URL)
async_client = AsyncIOMotorClient(MONGODB_URL)

db = client[DATABASE_NAME]
async_db = async_client[DATABASE_NAME]

@asynccontextmanager
async def get_db():
    try:
        yield async_db
    finally:
        pass

# Nowa funkcja do użycia z Depends() w FastAPI
async def async_get_db():
    return async_db

def get_sync_db() -> Database:
    return db

def init_db():
    collections = db.list_collection_names()
    if "users" not in collections:
        db.create_collection("users")
        db.users.create_index("email", unique=True)
        db.users.create_index("username", unique=True)
    if "tasks" not in collections:
        db.create_collection("tasks")
        db.tasks.create_index("user_id") 