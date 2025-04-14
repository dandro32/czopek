from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from app.auth.routes import get_current_user
from app.auth.models import DBUser
from .models import CalendarEvent, CalendarEventCreate, TaskFromEvent, CalendarEventList, CalendarCredentials
from .service import create_flow, get_calendar_service, save_credentials, get_upcoming_events, create_event, event_to_rag_context
from app.tasks.models import TaskCreate
from app.tasks.service import create_task
from typing import List
import os
from datetime import datetime

router = APIRouter()

@router.get("/auth")
async def auth_calendar():
    flow = create_flow()
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    return {"authorization_url": authorization_url}

@router.get("/callback")
async def callback(code: str, state: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    flow = create_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    creds_dict = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes,
        'expiry': credentials.expiry.isoformat()
    }
    
    save_credentials(db, current_user, creds_dict)
    return {"message": "Autoryzacja zakończona pomyślnie"}

@router.get("/events", response_model=CalendarEventList)
async def get_events(db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    creds = db.query(CalendarCredentials).filter(CalendarCredentials.user_id == current_user.id).first()
    if not creds:
        raise HTTPException(status_code=401, detail="Brak autoryzacji kalendarza")
    
    service = get_calendar_service({
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': 'https://oauth2.googleapis.com/token',
        'client_id': os.getenv("GOOGLE_CLIENT_ID"),
        'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
        'scopes': ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
        'expiry': creds.token_expiry.isoformat()
    })
    
    events = get_upcoming_events(service)
    return CalendarEventList(events=events)

@router.post("/events", response_model=CalendarEvent)
async def create_calendar_event(
    event: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    creds = db.query(CalendarCredentials).filter(CalendarCredentials.user_id == current_user.id).first()
    if not creds:
        raise HTTPException(status_code=401, detail="Brak autoryzacji kalendarza")
    
    service = get_calendar_service({
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': 'https://oauth2.googleapis.com/token',
        'client_id': os.getenv("GOOGLE_CLIENT_ID"),
        'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
        'scopes': ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
        'expiry': creds.token_expiry.isoformat()
    })
    
    event_data = {
        'summary': event.summary,
        'description': event.description,
        'start': {'dateTime': event.start.isoformat(), 'timeZone': 'UTC'},
        'end': {'dateTime': event.end.isoformat(), 'timeZone': 'UTC'},
        'location': event.location
    }
    
    created_event = create_event(service, event_data)
    return CalendarEvent(
        id=created_event['id'],
        summary=created_event['summary'],
        description=created_event.get('description'),
        start=datetime.fromisoformat(created_event['start']['dateTime']),
        end=datetime.fromisoformat(created_event['end']['dateTime']),
        location=created_event.get('location')
    )

@router.post("/events/{event_id}/to-task")
async def convert_event_to_task(
    event_id: str,
    task_data: TaskFromEvent,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    task = TaskCreate(
        title=task_data.title,
        description=task_data.description,
        due_date=task_data.due_date,
        priority=task_data.priority
    )
    
    created_task = create_task(db, task, current_user)
    return created_task

@router.get("/events/rag-context")
async def get_events_rag_context(db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    creds = db.query(CalendarCredentials).filter(CalendarCredentials.user_id == current_user.id).first()
    if not creds:
        raise HTTPException(status_code=401, detail="Brak autoryzacji kalendarza")
    
    service = get_calendar_service({
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': 'https://oauth2.googleapis.com/token',
        'client_id': os.getenv("GOOGLE_CLIENT_ID"),
        'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
        'scopes': ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
        'expiry': creds.token_expiry.isoformat()
    })
    
    events = get_upcoming_events(service)
    context = event_to_rag_context(events)
    return {"context": context}

@router.get("/status")
async def get_calendar_status(db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    creds = db.query(CalendarCredentials).filter(CalendarCredentials.user_id == current_user.id).first()
    return {
        "is_authorized": creds is not None,
        "expiry": creds.token_expiry.isoformat() if creds else None
    } 