from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo.database import Database
from database import get_db
from app.auth.routes import get_current_user
from app.auth.models import UserInDB
from .models import CalendarEvent, CalendarEventCreate, TaskFromEvent, CalendarEventList, CalendarCredentials
from .service import create_flow, get_calendar_service, save_credentials, get_upcoming_events, create_event, event_to_rag_context
from app.tasks.models import TaskCreate
from app.tasks.service import create_task
from typing import List, Annotated
import os
from datetime import datetime
from bson import ObjectId

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
async def callback(
    code: str, 
    state: str, 
    db: Annotated[Database, Depends(get_db)],
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    flow = create_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    await save_credentials(db, current_user, credentials)
    return {"message": "Autoryzacja zakończona pomyślnie"}

@router.get("/events", response_model=CalendarEventList)
async def get_events(
    db: Annotated[Database, Depends(get_db)], 
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    creds_doc = await db.calendar_credentials.find_one({"user_id": current_user.id})
    if not creds_doc:
        raise HTTPException(status_code=401, detail="Brak autoryzacji kalendarza")
    
    creds = CalendarCredentials(**creds_doc)
    
    service = get_calendar_service({
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': 'https://oauth2.googleapis.com/token',
        'client_id': os.getenv("GOOGLE_CLIENT_ID"),
        'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
        'scopes': ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']
    })
    
    events = get_upcoming_events(service)
    return CalendarEventList(events=events)

@router.post("/events", response_model=CalendarEvent)
async def create_calendar_event(
    event: CalendarEventCreate,
    db: Annotated[Database, Depends(get_db)],
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    creds_doc = await db.calendar_credentials.find_one({"user_id": current_user.id})
    if not creds_doc:
        raise HTTPException(status_code=401, detail="Brak autoryzacji kalendarza")
    
    creds = CalendarCredentials(**creds_doc)
    
    service = get_calendar_service({
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': 'https://oauth2.googleapis.com/token',
        'client_id': os.getenv("GOOGLE_CLIENT_ID"),
        'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
        'scopes': ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']
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
    db: Annotated[Database, Depends(get_db)],
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    task = TaskCreate(
        title=task_data.title,
        description=task_data.description,
        due_date=task_data.due_date,
        priority=task_data.priority
    )
    
    created_task = await create_task(db, task, current_user)
    return created_task

@router.get("/events/rag-context")
async def get_events_rag_context(
    db: Annotated[Database, Depends(get_db)], 
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    creds_doc = await db.calendar_credentials.find_one({"user_id": current_user.id})
    if not creds_doc:
        raise HTTPException(status_code=401, detail="Brak autoryzacji kalendarza")
    
    creds = CalendarCredentials(**creds_doc)
    
    service = get_calendar_service({
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': 'https://oauth2.googleapis.com/token',
        'client_id': os.getenv("GOOGLE_CLIENT_ID"),
        'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
        'scopes': ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']
    })
    
    events = get_upcoming_events(service)
    context = event_to_rag_context(events)
    return {"context": context}

@router.get("/status")
async def get_calendar_status(
    db: Annotated[Database, Depends(get_db)], 
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    creds_doc = await db.calendar_credentials.find_one({"user_id": current_user.id})
    
    return {
        "is_authorized": creds_doc is not None,
    } 