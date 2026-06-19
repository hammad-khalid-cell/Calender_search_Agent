from app.agent.graph import build_graph


def run_chat():
    graph = build_graph()
    messages = []

    print("Calendar & Search Agent — type 'exit' to quit\n")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("exit", "quit"):
            break
        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})

        result = graph.invoke({"messages": messages})
        messages = result["messages"]

        ai_response = messages[-1].content
        print(f"\nAgent: {ai_response}\n")


if __name__ == "__main__":
    run_chat()