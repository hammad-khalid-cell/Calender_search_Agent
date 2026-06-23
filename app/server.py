import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, SystemMessage

from app.agent.graph import build_graph
from app.services.google_calendar import list_events, delete_event, get_calendar_service
from app.config import TOKEN_PATH

app = FastAPI(title="Calendar & Search Agent API")

# Add CORS Middleware so the React frontend (running on e.g. localhost:5173) can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build the LangGraph graph
graph = build_graph()

class ToolCallSchema(BaseModel):
    name: str
    args: dict
    id: str
    type: Optional[str] = "tool_call"

class MessageSchema(BaseModel):
    role: str
    content: str
    name: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_calls: Optional[List[ToolCallSchema]] = None

class ChatRequest(BaseModel):
    messages: List[MessageSchema]

class ChatResponse(BaseModel):
    messages: List[MessageSchema]

def deserialize_message(msg: MessageSchema):
    """Convert JSON schema message to LangChain Message object."""
    if msg.role == "user":
        return HumanMessage(content=msg.content)
    elif msg.role == "assistant":
        tool_calls = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls.append({
                    "name": tc.name,
                    "args": tc.args,
                    "id": tc.id,
                    "type": "tool_call"
                })
        return AIMessage(content=msg.content, tool_calls=tool_calls)
    elif msg.role == "tool":
        return ToolMessage(content=msg.content, tool_call_id=msg.tool_call_id, name=msg.name)
    elif msg.role == "system":
        return SystemMessage(content=msg.content)
    else:
        return HumanMessage(content=msg.content)

def serialize_message(m) -> MessageSchema:
    """Convert LangChain message object back to JSON Schema."""
    # Handle dict (just in case they come as dicts)
    if isinstance(m, dict):
        return MessageSchema(
            role=m.get("role", "user"),
            content=m.get("content", ""),
            name=m.get("name"),
            tool_call_id=m.get("tool_call_id"),
            tool_calls=m.get("tool_calls")
        )
    
    role = "user"
    if m.type == "human":
        role = "user"
    elif m.type == "ai":
        role = "assistant"
    elif m.type == "tool":
        role = "tool"
    elif m.type == "system":
        role = "system"
    else:
        role = m.type

    tool_calls = None
    if m.type == "ai" and hasattr(m, "tool_calls") and m.tool_calls:
        tool_calls = []
        for tc in m.tool_calls:
            tool_calls.append(ToolCallSchema(
                name=tc.get("name"),
                args=tc.get("args"),
                id=tc.get("id"),
                type=tc.get("type", "tool_call")
            ))

    tool_call_id = getattr(m, "tool_call_id", None)
    name = getattr(m, "name", None)

    return MessageSchema(
        role=role,
        content=m.content,
        name=name,
        tool_call_id=tool_call_id,
        tool_calls=tool_calls
    )

@app.get("/api/status")
def get_status():
    """Check if the Google Calendar token exists and is valid."""
    if not os.path.exists(TOKEN_PATH):
        return {
            "authenticated": False,
            "message": "Google Calendar not connected. Login will be triggered on the first calendar operation."
        }
    try:
        service = get_calendar_service()
        # Basic check to verify credentials work
        service.calendarList().list(maxResults=1).execute()
        return {
            "authenticated": True,
            "message": "Successfully authenticated with Google Calendar."
        }
    except Exception as e:
        return {
            "authenticated": False,
            "message": f"Auth token exists but verification failed: {str(e)}"
        }

@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Invoke the LangGraph agent with the message history and return the full updated history."""
    try:
        # Convert incoming message history to LangChain message objects
        lc_messages = [deserialize_message(m) for m in request.messages]
        
        # Invoke the graph
        result = graph.invoke({"messages": lc_messages})
        
        # Return serialized messages
        serialized_messages = [serialize_message(m) for m in result["messages"]]
        return ChatResponse(messages=serialized_messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error invoking agent: {str(e)}")

@app.get("/api/calendar/events")
def get_calendar_events(
    start_date: Optional[str] = Query(None, description="Start date (ISO format, e.g. YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format, e.g. YYYY-MM-DD)")
):
    """Get upcoming calendar events."""
    try:
        # Use Pakistan timezone standard offset or local time offset (as used in prompts)
        # default to 7-day range from today
        tz_offset = "+05:00"  # Match Asia/Karachi offset in prompt
        
        if not start_date:
            now = datetime.now()
            # start of today
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start_str = f"{start_dt.isoformat()}{tz_offset}"
        else:
            start_str = f"{start_date}T00:00:00{tz_offset}"
            
        if not end_date:
            now = datetime.now()
            # 7 days from now
            end_dt = (now + timedelta(days=7)).replace(hour=23, minute=59, second=59, microsecond=0)
            end_str = f"{end_dt.isoformat()}{tz_offset}"
        else:
            end_str = f"{end_date}T23:59:59{tz_offset}"

        events = list_events(time_min=start_str, time_max=end_str)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching calendar events: {str(e)}")

@app.delete("/api/calendar/events/{event_id}")
def delete_calendar_event(event_id: str):
    """Delete a calendar event by ID."""
    try:
        result = delete_event(event_id=event_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting event {event_id}: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.server:app", host="127.0.0.1", port=8000, reload=True)
