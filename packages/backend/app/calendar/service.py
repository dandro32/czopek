from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import os
from sqlalchemy.orm import Session
from .models import CalendarCredentials, CalendarEvent
from app.auth.models import DBUser
from typing import List

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']

def create_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI")],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES
    )

def get_calendar_service(credentials: dict):
    creds = Credentials.from_authorized_user_info(credentials, SCOPES)
    return build('calendar', 'v3', credentials=creds)

def save_credentials(db: Session, user: DBUser, credentials: dict):
    db_credentials = CalendarCredentials(
        user_id=user.id,
        token=credentials.get('token'),
        refresh_token=credentials.get('refresh_token'),
        token_expiry=datetime.fromisoformat(credentials.get('expiry'))
    )
    db.add(db_credentials)
    db.commit()
    db.refresh(db_credentials)
    return db_credentials

def get_upcoming_events(service, max_results: int = 10) -> List[CalendarEvent]:
    now = datetime.utcnow().isoformat() + 'Z'
    events_result = service.events().list(
        calendarId='primary',
        timeMin=now,
        maxResults=max_results,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    events = events_result.get('items', [])

    return [
        CalendarEvent(
            id=event['id'],
            summary=event['summary'],
            description=event.get('description'),
            start=datetime.fromisoformat(event['start'].get('dateTime', event['start'].get('date'))),
            end=datetime.fromisoformat(event['end'].get('dateTime', event['end'].get('date'))),
            location=event.get('location')
        )
        for event in events
    ]

def create_event(service, event_data: dict):
    event = service.events().insert(
        calendarId='primary',
        body=event_data
    ).execute()
    return event

def event_to_rag_context(events: List[CalendarEvent]) -> str:
    context = "Nadchodzące wydarzenia w kalendarzu:\n\n"
    for event in events:
        context += f"- {event.summary}\n"
        context += f"  Data: {event.start.strftime('%Y-%m-%d %H:%M')} - {event.end.strftime('%Y-%m-%d %H:%M')}\n"
        if event.description:
            context += f"  Opis: {event.description}\n"
        if event.location:
            context += f"  Lokalizacja: {event.location}\n"
        context += "\n"
    return context 