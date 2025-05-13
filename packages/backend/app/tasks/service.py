from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.database import Database
from .models import TaskCreate, TaskList, Task, TaskUpdate
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
    
    # Dodaj bieżący czas jako created_at i updated_at
    current_time = datetime.utcnow()
    task_data["created_at"] = current_time
    task_data["updated_at"] = current_time
    
    result = await db.tasks.insert_one(task_data)
    
    logger.info(f"Utworzono zadanie {result.inserted_id}")
    
    # Przekształć dane na format zgodny z modelem Task
    task_dict = dict(task_data)
    task_dict["id"] = str(result.inserted_id)
    
    return task_dict

async def get_user_tasks(db: AsyncIOMotorDatabase, user_id: str) -> TaskList:
    logger.info(f"Pobieranie zadań dla użytkownika {user_id}")
    cursor = db.tasks.find({"user_id": user_id}).sort("due_date", 1)
    tasks_data = await cursor.to_list(length=None)
    logger.info(f"Znaleziono {len(tasks_data)} zadań")
    
    # Konwertuj dokumenty MongoDB na obiekty Pydantic Task
    tasks = []
    for task_data in tasks_data:
        # Tworzymy kopię danych, aby nie modyfikować oryginału
        task_dict = dict(task_data)
        
        # Konwertuj ObjectId _id na string dla pola id
        task_dict["id"] = str(task_data["_id"])
        
        # Usuń oryginalne pole _id aby uniknąć konfliktu
        if "_id" in task_dict:
            del task_dict["_id"]
        
        # Konwertuj daty na format ISO jeśli to potrzebne
        if "due_date" in task_dict and isinstance(task_dict["due_date"], datetime):
            task_dict["due_date"] = task_dict["due_date"].isoformat()
        if "created_at" in task_dict and isinstance(task_dict["created_at"], datetime):
            task_dict["created_at"] = task_dict["created_at"].isoformat()
        if "updated_at" in task_dict and isinstance(task_dict["updated_at"], datetime):
            task_dict["updated_at"] = task_dict["updated_at"].isoformat()
        
        # Sprawdź, czy istnieją wszystkie wymagane pola
        for required_field in ["created_at", "updated_at"]:
            if required_field not in task_dict:
                task_dict[required_field] = datetime.utcnow().isoformat()
                
        try:
            tasks.append(Task(**task_dict))
        except Exception as e:
            logger.error(f"Błąd podczas konwersji zadania: {e}, dane: {task_dict}")
            # Kontynuuj z następnym zadaniem, pomijając to, które powoduje błąd
            continue
    
    # Zwróć obiekt TaskList
    return TaskList(
        tasks=tasks,
        calendar_imported=False,
        total_count=len(tasks),
        pending_count=sum(1 for task in tasks if task.status == "pending"),
        completed_count=sum(1 for task in tasks if task.status == "completed")
    )

async def get_task(db: AsyncIOMotorDatabase, task_id: str, user_id: str):
    # Konwertuj task_id na ObjectId dla MongoDB
    task_id_obj = ObjectId(task_id) if isinstance(task_id, str) else task_id
    task_data = await db.tasks.find_one({"_id": task_id_obj, "user_id": user_id})
    
    if task_data:
        # Tworzymy kopię danych, aby nie modyfikować oryginału
        task_dict = dict(task_data)
        
        # Konwertuj ObjectId _id na string dla pola id
        task_dict["id"] = str(task_data["_id"])
        
        # Usuń oryginalne pole _id aby uniknąć konfliktu
        if "_id" in task_dict:
            del task_dict["_id"]
        
        # Konwertuj daty do ISO formatu jeśli to potrzebne
        if "due_date" in task_dict and isinstance(task_dict["due_date"], datetime):
            task_dict["due_date"] = task_dict["due_date"].isoformat()
        if "created_at" in task_dict and isinstance(task_dict["created_at"], datetime):
            task_dict["created_at"] = task_dict["created_at"].isoformat()
        if "updated_at" in task_dict and isinstance(task_dict["updated_at"], datetime):
            task_dict["updated_at"] = task_dict["updated_at"].isoformat()
        
        # Sprawdź, czy istnieją wszystkie wymagane pola
        for required_field in ["created_at", "updated_at"]:
            if required_field not in task_dict:
                task_dict[required_field] = datetime.utcnow().isoformat()
        
        return task_dict
    return None

async def update_task(db: AsyncIOMotorDatabase, task_id: str, task: TaskUpdate, user_id: str):
    # Konwertuj task_id na ObjectId dla MongoDB
    task_id_obj = ObjectId(task_id) if isinstance(task_id, str) else task_id
    
    # Dodanie logowania i diagnostyki
    logger.info(f"Aktualizacja zadania {task_id} dla użytkownika {user_id}")
    logger.info(f"Dane aktualizacji: {task.dict(exclude_unset=True)}")
    
    # Sprawdź czy zadanie istnieje przed aktualizacją
    existing_task = await db.tasks.find_one({"_id": task_id_obj, "user_id": user_id})
    if not existing_task:
        logger.warning(f"Nie znaleziono zadania {task_id} dla użytkownika {user_id}")
        return None
    
    # Przygotuj dane do aktualizacji
    task_data = {k: v for k, v in task.dict(exclude_unset=True).items() if v is not None}
    logger.info(f"Dane po filtracji: {task_data}")
    
    # Dodaj pole aktualizacji
    task_data["updated_at"] = datetime.utcnow()
    
    try:
        result = await db.tasks.update_one(
            {"_id": task_id_obj, "user_id": user_id},
            {"$set": task_data}
        )
        
        logger.info(f"Wynik aktualizacji: modified_count={result.modified_count}")
        
        if result.modified_count > 0 or result.matched_count > 0:
            # Pobierz zaktualizowane zadanie przez funkcję get_task
            updated_task = await get_task(db, task_id_obj, user_id)
            logger.info(f"Zaktualizowane zadanie: {updated_task}")
            return updated_task
        else:
            logger.warning(f"Nie zaktualizowano zadania {task_id}")
            return await get_task(db, task_id_obj, user_id)  # Zwróć istniejące zadanie
    except Exception as e:
        logger.error(f"Błąd podczas aktualizacji zadania {task_id}: {str(e)}")
        raise

async def delete_task(db: AsyncIOMotorDatabase, task_id: str, user_id: str):
    # Konwertuj task_id na ObjectId dla MongoDB
    task_id_obj = ObjectId(task_id) if isinstance(task_id, str) else task_id
    task = await get_task(db, task_id_obj, user_id)
    if task:
        await db.tasks.delete_one({"_id": task_id_obj, "user_id": user_id})
    return task

async def import_calendar_events(db: AsyncIOMotorDatabase, user_id: str) -> Tuple[TaskList, bool]:
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
            'expiry': creds.get("token_expiry", None)
        })
        
        logger.info("Pobieranie wydarzeń z kalendarza")
        calendar_events = get_upcoming_events(service)
        logger.info(f"Pobrano {len(calendar_events)} wydarzeń z kalendarza")
        
        # Dodaj bieżący czas dla pól created_at i updated_at
        current_time = datetime.utcnow()
        
        for event in calendar_events:
            logger.info(f"Przetwarzanie wydarzenia {event.id}")
            existing_task = await db.tasks.find_one({
                "calendar_event_id": event.id,
                "user_id": user_id
            })
            
            if not existing_task:
                logger.info(f"Tworzenie nowego zadania z wydarzenia {event.id}")
                task = TaskCreate(
                    title=event.summary or "(Bez tytułu)",
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
                task_data["created_at"] = current_time
                task_data["updated_at"] = current_time
                await db.tasks.insert_one(task_data)
            else:
                logger.info(f"Zadanie dla wydarzenia {event.id} już istnieje")
        
        tasks = await get_user_tasks(db, user_id)
        logger.info(f"Zakończono import z kalendarza, znaleziono łącznie {len(tasks.tasks)} zadań")
        
        # Zaktualizuj pole calendar_imported
        tasks.calendar_imported = True
        
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
        tasks_list, calendar_imported = await import_calendar_events(db, user_id)
        # import_calendar_events już zwraca TaskList, więc nie musimy nic więcej robić
        return tasks_list
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