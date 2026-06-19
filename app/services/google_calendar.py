import os
from typing import Optional, List

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from app.config import CREDENTIALS_PATH, TOKEN_PATH, CALENDAR_SCOPES


def get_calendar_service():
    """Authenticate and return an authorized Google Calendar API service object."""
    creds = None

    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, CALENDAR_SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, CALENDAR_SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, "w") as token_file:
            token_file.write(creds.to_json())

    return build("calendar", "v3", credentials=creds)


def list_events(time_min: str, time_max: str, query: Optional[str] = None, max_results: int = 20):
    """
    Fetch events from the primary calendar between time_min and time_max.
    time_min / time_max must be RFC3339 datetime strings, e.g. '2026-06-17T00:00:00+05:00'.
    """
    service = get_calendar_service()

    params = {
        "calendarId": "primary",
        "timeMin": time_min,
        "timeMax": time_max,
        "maxResults": max_results,
        "singleEvents": True,
        "orderBy": "startTime",
    }
    if query:
        params["q"] = query

    events = service.events().list(**params).execute().get("items", [])

    return [
        {
            "id": e.get("id"),
            "summary": e.get("summary", "(No title)"),
            "start": e["start"].get("dateTime", e["start"].get("date")),
            "end": e["end"].get("dateTime", e["end"].get("date")),
        }
        for e in events
    ]


def create_event(
    summary: str,
    start: str,
    end: str,
    description: Optional[str] = None,
    attendees: Optional[List[str]] = None,
):
    """
    Create an event on the primary calendar.
    start / end must be RFC3339 datetime strings, e.g. '2026-06-17T15:00:00+05:00'.
    """
    service = get_calendar_service()

    event_body = {
        "summary": summary,
        "start": {"dateTime": start},
        "end": {"dateTime": end},
    }
    if description:
        event_body["description"] = description
    if attendees:
        event_body["attendees"] = [{"email": email} for email in attendees]

    created = service.events().insert(calendarId="primary", body=event_body).execute()

    return {
        "id": created.get("id"),
        "summary": created.get("summary"),
        "start": created.get("start"),
        "end": created.get("end"),
        "htmlLink": created.get("htmlLink"),
    }