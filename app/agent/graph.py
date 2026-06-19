from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START
from langgraph.prebuilt import ToolNode, tools_condition

from app.agent.state import AgentState
from app.agent.prompts import get_system_prompt
from app.tools.web_search import web_search_tool
from app.tools.calendar_tools import get_calendar_events, create_calendar_event
from app.config import GROQ_API_KEY

tools = [web_search_tool, get_calendar_events, create_calendar_event]

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=GROQ_API_KEY,
    temperature=0,
)
llm_with_tools = llm.bind_tools(tools)


def agent_node(state: AgentState):
    system_message = {"role": "system", "content": get_system_prompt()}
    response = llm_with_tools.invoke([system_message] + state["messages"])
    return {"messages": [response]}


def build_graph():
    graph_builder = StateGraph(AgentState)

    graph_builder.add_node("agent", agent_node)
    graph_builder.add_node("tools", ToolNode(tools))

    graph_builder.add_edge(START, "agent")
    graph_builder.add_conditional_edges("agent", tools_condition)
    graph_builder.add_edge("tools", "agent")
    

    return graph_builder.compile()