from langchain_tavily import TavilySearch

from app.config import TAVILY_API_KEY  # noqa: F401 — ensures .env is loaded before TavilySearch reads it

web_search_tool = TavilySearch(
    max_results=5,
    topic="general",
)