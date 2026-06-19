from typing import Optional, List
from langchain_core.tools import tool

from app.services.google_calendar import list_events, create_event


@tool
def get_calendar_events(time_min: str, time_max: str, query: Optional[str] = None) -> str:
    """
    Look up events on the user's Google Calendar between time_min and time_max.
    Use this for ANY calendar lookup — today, a specific date, a date range, or upcoming events.

    Args:
        time_min: Start of the range as an RFC3339 datetime string with UTC offset,
            e.g. '2026-06-18T00:00:00+05:00'.
        time_max: End of the range as an RFC3339 datetime string with UTC offset,
            e.g. '2026-06-19T00:00:00+05:00'.
        query: Optional text to filter events by title or description.
    """
    events = list_events(time_min=time_min, time_max=time_max, query=query)

    if not events:
        return "No events found in that time range."

    return "\n".join(f"- {e['summary']} ({e['start']} to {e['end']})" for e in events)


@tool
def create_calendar_event(
    summary: str,
    start: str,
    end: str,
    description: Optional[str] = None,
    attendees: Optional[List[str]] = None,
) -> str:
    """
    Create a new event on the user's Google Calendar.

    Args:
        summary: Title of the event.
        start: Start datetime as an RFC3339 string with UTC offset, e.g. '2026-06-18T15:00:00+05:00'.
        end: End datetime as an RFC3339 string with UTC offset, e.g. '2026-06-18T16:00:00+05:00'.
        description: Optional longer description for the event.
        attendees: Optional list of attendee email addresses to invite.
    """
    result = create_event(summary=summary, start=start, end=end, description=description, attendees=attendees)
    return f"Event '{result['summary']}' created. Link: {result['htmlLink']}"