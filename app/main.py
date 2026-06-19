import sys
from app.agent.graph import build_graph


def run_agent(query: str):
    graph = build_graph()
    result = graph.invoke({"messages": [{"role": "user", "content": query}]})
    print(result["messages"][-1].content)


if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) or "What are my events today?"
    run_agent(query)

