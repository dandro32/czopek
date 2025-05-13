from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.database import Database
from .models import TaskCreate, TaskList
from bson import ObjectId
from app.calendar.models import CalendarCredentials
from app.calendar.service import get_calendar_service, get_upcoming_events
from datetime import datetime, timedelta
import os
import logging
from typing import List, Tuple, Dict

logger = logging.getLogger(__name__)

async def create_task(db: AsyncIOMotorDatabase, task: TaskCreate, user):
    logger.info(f"Tworzenie nowego zadania dla użytkownika {user.id}")
    task_data = task.dict()
    task_data["user_id"] = user.id
    
    result = await db.tasks.insert_one(task_data)
    
    logger.info(f"Utworzono zadanie {result.inserted_id}")
    task_data["_id"] = result.inserted_id
    return task_data

async def get_user_tasks(db: AsyncIOMotorDatabase, user_id: str) -> List[dict]:
    logger.info(f"Pobieranie zadań dla użytkownika {user_id}")
    cursor = db.tasks.find({"user_id": user_id}).sort("due_date", 1)
    tasks = await cursor.to_list(length=None)
    logger.info(f"Znaleziono {len(tasks)} zadań")
    return tasks

async def get_task(db: AsyncIOMotorDatabase, task_id: str, user_id: str):
    # Konwertuj task_id na ObjectId dla MongoDB
    task_id_obj = ObjectId(task_id) if isinstance(task_id, str) else task_id
    return await db.tasks.find_one({"_id": task_id_obj, "user_id": user_id})

async def update_task(db: AsyncIOMotorDatabase, task_id: str, task: TaskCreate, user_id: str):
    # Konwertuj task_id na ObjectId dla MongoDB
    task_id_obj = ObjectId(task_id) if isinstance(task_id, str) else task_id
    task_data = {k: v for k, v in task.dict(exclude_unset=True).items()}
    result = await db.tasks.update_one(
        {"_id": task_id_obj, "user_id": user_id},
        {"$set": task_data}
    )
    
    if result.modified_count > 0:
        return await get_task(db, task_id_obj, user_id)
    return None

async def delete_task(db: AsyncIOMotorDatabase, task_id: str, user_id: str):
    # Konwertuj task_id na ObjectId dla MongoDB
    task_id_obj = ObjectId(task_id) if isinstance(task_id, str) else task_id
    task = await get_task(db, task_id_obj, user_id)
    if task:
        await db.tasks.delete_one({"_id": task_id_obj, "user_id": user_id})
    return task

async def import_calendar_events(db: AsyncIOMotorDatabase, user_id: str) -> Tuple[List[dict], bool]:
    logger.info(f"Próba importu wydarzeń z kalendarza dla użytkownika {user_id}")
    creds = await db.calendar_credentials.find_one({"user_id": user_id})
    if not creds:
        logger.warning(f"Brak poświadczeń kalendarza dla użytkownika {user_id}")
        tasks = await get_user_tasks(db, user_id)
        return tasks, False
    
    logger.info("Znaleziono poświadczenia kalendarza, tworzenie serwisu")
    try:
        service = get_calendar_service({
            'token': creds["token"],
            'refresh_token': creds["refresh_token"],
            'token_uri': 'https://oauth2.googleapis.com/token',
            'client_id': os.getenv("GOOGLE_CLIENT_ID"),
            'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
            'scopes': ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
            'expiry': creds["token_expiry"].isoformat() if isinstance(creds["token_expiry"], datetime) else creds["token_expiry"]
        })
        
        logger.info("Pobieranie wydarzeń z kalendarza")
        calendar_events = get_upcoming_events(service)
        logger.info(f"Pobrano {len(calendar_events)} wydarzeń z kalendarza")
        
        for event in calendar_events:
            logger.info(f"Przetwarzanie wydarzenia {event.id}")
            existing_task = await db.tasks.find_one({
                "calendar_event_id": event.id,
                "user_id": user_id
            })
            
            if not existing_task:
                logger.info(f"Tworzenie nowego zadania z wydarzenia {event.id}")
                task = TaskCreate(
                    title=event.summary,
                    description=event.description,
                    due_date=event.end,
                    priority="medium",
                    source="calendar",
                    calendar_event_id=event.id,
                    status="pending"
                )
                # Tworzymy słownik zadania bezpośrednio
                task_data = task.dict()
                task_data["user_id"] = user_id
                await db.tasks.insert_one(task_data)
            else:
                logger.info(f"Zadanie dla wydarzenia {event.id} już istnieje")
        
        tasks = await get_user_tasks(db, user_id)
        logger.info(f"Zakończono import z kalendarza, znaleziono łącznie {len(tasks)} zadań")
        return tasks, True
        
    except Exception as e:
        logger.error(f"Błąd podczas importu z kalendarza: {str(e)}")
        raise

def group_tasks_by_date(tasks: List[dict]) -> Dict[str, List[dict]]:
    today = datetime.now().date()
    grouped_tasks = {
        "overdue": [],
        "today": [],
        "tomorrow": [],
        "this_week": [],
        "later": [],
        "no_date": []
    }

    for task in tasks:
        due_date = task.get("due_date")
        if not due_date:
            grouped_tasks["no_date"].append(task)
            continue

        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        
        task_date = due_date.date()
        
        if task_date < today:
            grouped_tasks["overdue"].append(task)
        elif task_date == today:
            grouped_tasks["today"].append(task)
        elif task_date == today + timedelta(days=1):
            grouped_tasks["tomorrow"].append(task)
        elif task_date <= today + timedelta(days=7):
            grouped_tasks["this_week"].append(task)
        else:
            grouped_tasks["later"].append(task)

    return grouped_tasks

def get_task_statistics(tasks: List[dict]) -> dict:
    total_count = len(tasks)
    completed_count = sum(1 for task in tasks if task.get("status") == "completed")
    pending_count = total_count - completed_count
    
    return {
        "total_count": total_count,
        "pending_count": pending_count,
        "completed_count": completed_count
    }

async def get_tasks_with_stats(db: AsyncIOMotorDatabase, user_id: str) -> TaskList:
    logger.info(f"Pobieranie zadań ze statystykami dla użytkownika {user_id}")
    try:
        tasks, calendar_imported = await import_calendar_events(db, user_id)
        stats = get_task_statistics(tasks)
        
        logger.info(f"Statystyki zadań: {stats}")
        return TaskList(
            tasks=sorted(tasks, key=lambda x: x.get("due_date") if x.get("due_date") else datetime.max),
            calendar_imported=calendar_imported,
            **stats
        )
    except Exception as e:
        logger.error(f"Błąd podczas pobierania zadań ze statystykami: {str(e)}")
        raise

# Wersje synchroniczne dla skryptu migracji i narzędzi administracyjnych
def sync_create_task(db: Database, task: dict, user_id: str):
    task_data = task.copy()
    task_data["user_id"] = user_id
    
    result = db.tasks.insert_one(task_data)
    
    task_data["_id"] = result.inserted_id
    return task_data

def sync_get_user_tasks(db: Database, user_id: str) -> List[dict]:
    return list(db.tasks.find({"user_id": user_id}).sort("due_date", 1)) 