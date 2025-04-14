from sqlalchemy.orm import Session
from .models import DBTask, TaskCreate, TaskList
from app.auth.models import DBUser
from app.calendar.models import CalendarCredentials
from app.calendar.service import get_calendar_service, get_upcoming_events
from datetime import datetime, timedelta
import os
import logging
from typing import List, Tuple, Dict

logger = logging.getLogger(__name__)

def create_task(db: Session, task: TaskCreate, user: DBUser):
    logger.info(f"Tworzenie nowego zadania dla użytkownika {user.id}")
    db_task = DBTask(
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        priority=task.priority,
        user_id=user.id,
        source=task.source,
        calendar_event_id=task.calendar_event_id,
        status=task.status
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    logger.info(f"Utworzono zadanie {db_task.id}")
    return db_task

def get_user_tasks(db: Session, user: DBUser) -> List[DBTask]:
    logger.info(f"Pobieranie zadań dla użytkownika {user.id}")
    tasks = db.query(DBTask).filter(DBTask.user_id == user.id).order_by(DBTask.due_date.asc()).all()
    logger.info(f"Znaleziono {len(tasks)} zadań")
    return tasks

def get_task(db: Session, task_id: int, user: DBUser):
    return db.query(DBTask).filter(DBTask.id == task_id, DBTask.user_id == user.id).first()

def update_task(db: Session, task_id: int, task: TaskCreate, user: DBUser):
    db_task = get_task(db, task_id, user)
    if db_task:
        for key, value in task.dict(exclude_unset=True).items():
            setattr(db_task, key, value)
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int, user: DBUser):
    db_task = get_task(db, task_id, user)
    if db_task:
        db.delete(db_task)
        db.commit()
    return db_task

def import_calendar_events(db: Session, user: DBUser) -> Tuple[List[DBTask], bool]:
    logger.info(f"Próba importu wydarzeń z kalendarza dla użytkownika {user.id}")
    creds = db.query(CalendarCredentials).filter(CalendarCredentials.user_id == user.id).first()
    if not creds:
        logger.warning(f"Brak poświadczeń kalendarza dla użytkownika {user.id}")
        tasks = get_user_tasks(db, user)
        return tasks, False
    
    logger.info("Znaleziono poświadczenia kalendarza, tworzenie serwisu")
    try:
        service = get_calendar_service({
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': 'https://oauth2.googleapis.com/token',
            'client_id': os.getenv("GOOGLE_CLIENT_ID"),
            'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
            'scopes': ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
            'expiry': creds.token_expiry.isoformat()
        })
        
        logger.info("Pobieranie wydarzeń z kalendarza")
        calendar_events = get_upcoming_events(service)
        logger.info(f"Pobrano {len(calendar_events)} wydarzeń z kalendarza")
        
        for event in calendar_events:
            logger.info(f"Przetwarzanie wydarzenia {event.id}")
            existing_task = db.query(DBTask).filter(
                DBTask.calendar_event_id == event.id,
                DBTask.user_id == user.id
            ).first()
            
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
                create_task(db, task, user)
            else:
                logger.info(f"Zadanie dla wydarzenia {event.id} już istnieje")
        
        tasks = get_user_tasks(db, user)
        logger.info(f"Zakończono import z kalendarza, znaleziono łącznie {len(tasks)} zadań")
        return tasks, True
        
    except Exception as e:
        logger.error(f"Błąd podczas importu z kalendarza: {str(e)}")
        raise

def group_tasks_by_date(tasks: List[DBTask]) -> Dict[str, List[DBTask]]:
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
        if not task.due_date:
            grouped_tasks["no_date"].append(task)
            continue

        task_date = task.due_date.date()
        
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

def get_task_statistics(tasks: List[DBTask]) -> dict:
    total_count = len(tasks)
    completed_count = sum(1 for task in tasks if task.status == "completed")
    pending_count = total_count - completed_count
    
    return {
        "total_count": total_count,
        "pending_count": pending_count,
        "completed_count": completed_count
    }

def get_tasks_with_stats(db: Session, user: DBUser) -> TaskList:
    logger.info(f"Pobieranie zadań ze statystykami dla użytkownika {user.id}")
    try:
        tasks, calendar_imported = import_calendar_events(db, user)
        stats = get_task_statistics(tasks)
        
        logger.info(f"Statystyki zadań: {stats}")
        return TaskList(
            tasks=sorted(tasks, key=lambda x: x.due_date if x.due_date else datetime.max),
            calendar_imported=calendar_imported,
            **stats
        )
    except Exception as e:
        logger.error(f"Błąd podczas pobierania zadań ze statystykami: {str(e)}")
        raise 