from langchain_core.tools import tool
from langchain_tavily import TavilySearch

from app.config import TAVILY_API_KEY  # noqa: F401

_tavily = TavilySearch(max_results=5, topic="general")


@tool
def web_search_tool(query: str) -> str:
    """Search the web for current information, facts, or news. Pass a single plain-text search query."""
    result = _tavily.invoke({"query": query})
    return str(result)