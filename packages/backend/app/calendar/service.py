from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import os
from pymongo.database import Database
from .models import CalendarCredentials, CalendarEvent, PyObjectId
from app.auth.models import UserInDB
from typing import List, Dict
import json

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']

def create_flow():
    client_config = {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI")],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    if not all([
        client_config["web"]["client_id"],
        client_config["web"]["client_secret"],
        client_config["web"]["redirect_uris"][0]
    ]):
        raise ValueError("Missing Google OAuth configuration in environment variables")
    return Flow.from_client_config(client_config, scopes=SCOPES)

def get_calendar_service(credentials_dict: Dict):
    if not all(k in credentials_dict for k in ('token', 'token_uri', 'client_id', 'client_secret', 'scopes')):
        raise ValueError("Incomplete calendar credentials retrieved from database")
    creds = Credentials.from_authorized_user_info(credentials_dict)
    return build('calendar', 'v3', credentials=creds)

async def save_credentials(db: Database, user: UserInDB, credentials: Credentials):
    credentials_dict = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

    db_credentials_data = CalendarCredentials(
        user_id=user.id,
        **credentials_dict
    )

    await db.calendar_credentials.update_one(
        {"user_id": user.id},
        {"$set": db_credentials_data.dict(exclude={'id'}, exclude_none=True)},
        upsert=True
    )
    saved_credentials = await db.calendar_credentials.find_one({"user_id": user.id})
    if saved_credentials:
        return CalendarCredentials(**saved_credentials)
    return None

def get_upcoming_events(service, max_results: int = 10) -> List[CalendarEvent]:
    now = datetime.utcnow().isoformat() + 'Z'
    try:
        events_result = service.events().list(
            calendarId='primary',
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        items = events_result.get('items', [])
        
        upcoming_events = []
        for event in items:
            start_time = None
            end_time = None
            if 'dateTime' in event['start']:
                start_time = datetime.fromisoformat(event['start']['dateTime'])
            elif 'date' in event['start']:
                start_time = datetime.fromisoformat(event['start']['date'])
            
            if 'dateTime' in event['end']:
                end_time = datetime.fromisoformat(event['end']['dateTime'])
            elif 'date' in event['end']:
                end_time = datetime.fromisoformat(event['end']['date'])
                
            upcoming_events.append(
                CalendarEvent(
                    id=event['id'],
                    summary=event.get('summary'),
                    description=event.get('description'),
                    start=start_time,
                    end=end_time,
                    location=event.get('location')
                )
            )
        return upcoming_events
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        return []

def create_event(service, event_data: dict):
    try:
        event = service.events().insert(
            calendarId='primary',
            body=event_data
        ).execute()
        return event
    except Exception as e:
        print(f"Error creating Google Calendar event: {e}")
        raise

def event_to_rag_context(events: List[CalendarEvent]) -> str:
    context = "Nadchodzące wydarzenia w kalendarzu:\n\n"
    for event in events:
        context += f"- {event.summary or '(Brak tytułu)'}\n"
        if event.start and event.end:
            context += f"  Data: {event.start.strftime('%Y-%m-%d %H:%M')} - {event.end.strftime('%Y-%m-%d %H:%M')}\n"
        elif event.start:
            context += f"  Data rozpoczęcia: {event.start.strftime('%Y-%m-%d %H:%M')}\n"
        if event.description:
            context += f"  Opis: {event.description}\n"
        if event.location:
            context += f"  Lokalizacja: {event.location}\n"
        context += "\n"
    return context 