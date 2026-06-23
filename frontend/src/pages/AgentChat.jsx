import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "http://127.0.0.1:8000";

// ── Lightweight Markdown Renderer (zero deps) ─────────────────────────────────
let _mk = 0;
function parseInline(str) {
  const parts = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, m;
  while ((m = regex.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index));
    const k = ++_mk;
    if (m[2]) parts.push(<strong key={k}><em>{m[2]}</em></strong>);
    else if (m[3]) parts.push(<strong key={k}>{m[3]}</strong>);
    else if (m[4]) parts.push(<em key={k}>{m[4]}</em>);
    else if (m[5]) parts.push(
      <code key={k} style={{ background:"#F3F4F6", padding:"1px 5px", borderRadius:4, fontFamily:"'JetBrains Mono',monospace", fontSize:"0.88em", color:"#4338CA" }}>
        {m[5]}
      </code>
    );
    else if (m[6]) parts.push(
      <a key={k} href={m[7]} target="_blank" rel="noopener noreferrer" style={{ color:"#3B6FE8", textDecoration:"underline" }}>
        {m[6]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts.length ? parts : str;
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const k = ++_mk;
    // blank
    if (!line.trim()) { i++; continue; }
    // heading
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      const sz = { 1:"1.25em", 2:"1.1em", 3:"1em" }[hm[1].length];
      out.push(<div key={k} style={{ fontWeight:700, fontSize:sz, color:"#111827", margin:"12px 0 4px", lineHeight:1.4 }}>{parseInline(hm[2])}</div>);
      i++; continue;
    }
    // ordered list
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, "")); i++;
      }
      out.push(
        <ol key={k} style={{ paddingLeft:22, margin:"6px 0 8px", display:"flex", flexDirection:"column", gap:5 }}>
          {items.map((it,j) => <li key={j} style={{ fontSize:14, lineHeight:1.65, color:"#1A1D23" }}>{parseInline(it)}</li>)}
        </ol>
      );
      continue;
    }
    // unordered list
    if (/^[-*+]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s/, "")); i++;
      }
      out.push(
        <ul key={k} style={{ paddingLeft:20, margin:"6px 0 8px", display:"flex", flexDirection:"column", gap:5 }}>
          {items.map((it,j) => <li key={j} style={{ fontSize:14, lineHeight:1.65, color:"#1A1D23" }}>{parseInline(it)}</li>)}
        </ul>
      );
      continue;
    }
    // fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      i++;
      out.push(
        <div key={k} style={{ margin:"8px 0", borderRadius:8, overflow:"hidden", border:"1px solid #E5E7EB" }}>
          {lang && <div style={{ background:"#1E293B", color:"#94A3B8", fontSize:11, padding:"4px 12px", fontFamily:"'JetBrains Mono',monospace" }}>{lang}</div>}
          <pre style={{ background:"#F8FAFC", margin:0, padding:"10px 14px", overflowX:"auto", fontSize:12, fontFamily:"'JetBrains Mono',monospace", color:"#1E293B", lineHeight:1.6 }}>
            {code.join("\n")}
          </pre>
        </div>
      );
      continue;
    }
    // hr
    if (/^[-*_]{3,}$/.test(line.trim())) {
      out.push(<hr key={k} style={{ border:"none", borderTop:"1px solid #E5E7EB", margin:"10px 0" }} />);
      i++; continue;
    }
    // paragraph
    out.push(<p key={k} style={{ margin:"3px 0", fontSize:14, lineHeight:1.7, color:"#1A1D23" }}>{parseInline(line)}</p>);
    i++;
  }
  return out;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatEventDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatEventTime(start, end) {
  if (!start) return "All day";
  const s = new Date(start.dateTime || start.date);
  const e = end ? new Date(end.dateTime || end.date) : null;
  const fmt = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return e ? `${fmt(s)} – ${fmt(e)}` : fmt(s);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ authenticated, message }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "7px 12px", borderRadius: 8,
      background: authenticated ? "#EFF9F2" : "#FEF3F2",
      border: `1px solid ${authenticated ? "#BBF0CE" : "#FECDCA"}`,
      fontSize: 12, color: authenticated ? "#1A7043" : "#B42318",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: authenticated ? "#22C55E" : "#F04438",
        flexShrink: 0,
        boxShadow: authenticated ? "0 0 0 2px #BBF0CE" : "0 0 0 2px #FECDCA"
      }} />
      {authenticated ? "Calendar connected" : "Calendar not connected"}
    </div>
  );
}

function ToolChip({ name }) {
  const icons = {
    web_search: "🔍",
    create_event: "📅",
    delete_event: "🗑️",
    list_events: "📋",
    update_event: "✏️",
  };
  const icon = icons[name] || "⚙️";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 9px", borderRadius: 20,
      background: "#EEF2FF", border: "1px solid #C7D2FE",
      fontSize: 11, color: "#4338CA", fontFamily: "'JetBrains Mono', monospace",
    }}>
      {icon} {name}
    </span>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#93C5FD",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg, isLast }) {
  const isUser = msg.role === "user";
  const isAssistant = msg.role === "assistant";
  const isTool = msg.role === "tool";

  if (isTool) {
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
        <div style={{
          fontSize: 11, color: "#6B7280", background: "#F3F4F6",
          border: "1px solid #E5E7EB", borderRadius: 6,
          padding: "3px 10px", fontFamily: "'JetBrains Mono', monospace",
          maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          ↩ tool result: {msg.content?.slice(0, 80)}{msg.content?.length > 80 ? "…" : ""}
        </div>
      </div>
    );
  }

  if (!isUser && !isAssistant) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 10,
      margin: "10px 0",
    }}>
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #3B6FE8 0%, #6366F1 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 2,
        }}>A</div>
      )}
      <div style={{ maxWidth: "72%", minWidth: 0 }}>
        {/* Tool calls chips (agent actions) */}
        {isAssistant && msg.tool_calls?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
            {msg.tool_calls.map((tc, i) => <ToolChip key={i} name={tc.name} />)}
          </div>
        )}
        {/* Bubble */}
        {(msg.content || isLast) && (
          <div style={{
            padding: "11px 15px",
            borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
            background: isUser ? "#3B6FE8" : "#FFFFFF",
            border: isUser ? "none" : "1px solid #E5E7EB",
            color: isUser ? "#fff" : "#1A1D23",
            boxShadow: isUser ? "0 2px 8px rgba(59,111,232,0.18)" : "0 1px 4px rgba(0,0,0,0.06)",
            wordBreak: "break-word",
          }}>
            {isAssistant && !msg.content && isLast
              ? <ThinkingDots />
              : isUser
                ? <p style={{ margin:0, fontSize:14, lineHeight:1.6, color:"#fff" }}>{msg.content}</p>
                : <div>{renderMarkdown(msg.content)}</div>
            }
          </div>
        )}
        <div style={{
          fontSize: 10, color: "#9CA3AF", marginTop: 4,
          textAlign: isUser ? "right" : "left",
        }}>
          {formatTime(msg._ts)}
        </div>
      </div>
    </div>
  );
}

function CalendarPanel({ events, loading, onRefresh, onDelete }) {
  if (loading) return (
    <div style={{ padding: 20, color: "#9CA3AF", fontSize: 13, textAlign: "center" }}>
      Loading events…
    </div>
  );

  if (!events.length) return (
    <div style={{ padding: "24px 16px", color: "#9CA3AF", fontSize: 13, textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
      No events in the next 7 days
    </div>
  );

  return (
    <div style={{ padding: "0 4px" }}>
      {events.map((ev, i) => (
        <div key={ev.id || i} style={{
          background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB",
          padding: "10px 12px", marginBottom: 8,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: "#1A1D23",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{ev.summary || "Untitled"}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                {formatEventDate(ev.start?.dateTime || ev.start?.date)}
              </div>
              <div style={{ fontSize: 11, color: "#3B6FE8", marginTop: 1 }}>
                {formatEventTime(ev.start, ev.end)}
              </div>
            </div>
            {ev.id && (
              <button
                onClick={() => onDelete(ev.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#D1D5DB", fontSize: 14, padding: "2px 4px", marginLeft: 6,
                  borderRadius: 4, transition: "color 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={e => e.target.style.color = "#EF4444"}
                onMouseLeave={e => e.target.style.color = "#D1D5DB"}
                title="Delete event"
              >✕</button>
            )}
          </div>
        </div>
      ))}
      <button onClick={onRefresh} style={{
        width: "100%", marginTop: 4, padding: "7px",
        background: "none", border: "1px solid #E5E7EB", borderRadius: 8,
        fontSize: 12, color: "#6B7280", cursor: "pointer", transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.target.style.background = "#F9FAFB"; e.target.style.color = "#374151"; }}
        onMouseLeave={e => { e.target.style.background = "none"; e.target.style.color = "#6B7280"; }}
      >↻ Refresh</button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function AgentChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI assistant. I can search the web and manage your Google Calendar — just ask me anything.",
      _ts: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ authenticated: false, message: "" });
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch auth status
  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/status`);
      const d = await r.json();
      setStatus(d);
    } catch { /* ignore */ }
  }, []);

  // Fetch calendar events
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/calendar/events`);
      const d = await r.json();
      setEvents(d.events || []);
    } catch { /* ignore */ }
    finally { setEventsLoading(false); }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchEvents();
  }, [fetchStatus, fetchEvents]);

  // Delete event
  const handleDeleteEvent = async (id) => {
    try {
      await fetch(`${API_BASE}/api/calendar/events/${id}`, { method: "DELETE" });
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch { /* ignore */ }
  };

  // Send message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text, _ts: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const payload = newMessages.map(({ role, content, tool_calls, tool_call_id, name }) => ({
        role, content: content || "", tool_calls, tool_call_id, name,
      }));

      const r = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });

      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const data = await r.json();

      const stamped = data.messages.map(m => ({ ...m, _ts: m._ts || new Date().toISOString() }));
      setMessages(stamped);

      // Re-fetch calendar after potential mutations
      const hasCalendarOp = stamped.some(m =>
        m.tool_calls?.some(tc => ["create_event", "delete_event", "update_event"].includes(tc.name))
      );
      if (hasCalendarOp) fetchEvents();
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Error: ${err.message}`,
        _ts: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filter visible messages (hide bare tool messages from main view)
  const visibleMessages = messages.filter(m =>
    m.role === "user" || m.role === "assistant"
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; }
        body { font-family: 'Inter', sans-serif; background: #F0F2F5; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-6px);opacity:1} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .msg-enter { animation: fadeSlide 0.18s ease; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 10px; }
        textarea { outline: none !important; }
        ol, ul { list-style-position: outside; }
      `}</style>

      <div style={{
        display: "flex", height: "100vh", width: "100vw", overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div style={{
            width: 268, minWidth: 268, maxWidth: 268,
            background: "#F7F8FA", borderRight: "1px solid #E5E7EB",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Logo / Header */}
            <div style={{
              padding: "18px 16px 14px", borderBottom: "1px solid #E5E7EB",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "linear-gradient(135deg, #3B6FE8 0%, #6366F1 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>✦</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1D23" }}>Agent Hub</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Calendar · Search</div>
                </div>
              </div>
              <StatusBadge {...status} />
            </div>

            {/* Calendar Panel */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 12px" }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Upcoming
                </span>
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>Next 7 days</span>
              </div>
              <CalendarPanel
                events={events}
                loading={eventsLoading}
                onRefresh={fetchEvents}
                onDelete={handleDeleteEvent}
              />
            </div>

            {/* Sidebar footer — reserved for Text-to-SQL tab later */}
            <div style={{
              padding: "10px 12px", borderTop: "1px solid #E5E7EB",
              fontSize: 11, color: "#9CA3AF", textAlign: "center",
            }}>
              Text-to-SQL coming soon
            </div>
          </div>
        )}

        {/* ── Chat Area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", background: "#F0F2F5" }}>

          {/* Top bar */}
          <div style={{
            height: 54, borderBottom: "1px solid #E5E7EB", background: "#FFFFFF",
            display: "flex", alignItems: "center", padding: "0 20px", gap: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#6B7280", fontSize: 18, padding: "4px 6px",
                borderRadius: 6, lineHeight: 1,
              }}
              title="Toggle sidebar"
            >☰</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1D23" }}>Chat</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                onClick={() => setMessages([{
                  role: "assistant",
                  content: "Hi! I'm your AI assistant. I can search the web and manage your Google Calendar — just ask me anything.",
                  _ts: new Date().toISOString(),
                }])}
                style={{
                  background: "none", border: "1px solid #E5E7EB", borderRadius: 7,
                  padding: "5px 12px", fontSize: 12, color: "#6B7280",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => e.target.style.background = "#F9FAFB"}
                onMouseLeave={e => e.target.style.background = "none"}
              >New chat</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            {/* Tool messages inline (subtle) */}
            {messages.map((msg, i) => {
              if (msg.role === "tool") {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "center", margin: "3px 0" }}>
                    <div style={{
                      fontSize: 11, color: "#9CA3AF", background: "#F9FAFB",
                      border: "1px solid #F3F4F6", borderRadius: 6,
                      padding: "2px 10px", fontFamily: "'JetBrains Mono', monospace",
                      maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      ↩ {msg.name}: {msg.content?.slice(0, 60)}{msg.content?.length > 60 ? "…" : ""}
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="msg-enter">
                  <MessageBubble msg={msg} isLast={i === messages.length - 1 && loading} />
                </div>
              );
            })}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, margin: "10px 0" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "linear-gradient(135deg, #3B6FE8, #6366F1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, color: "#fff", fontWeight: 700,
                }}>A</div>
                <div style={{
                  padding: "10px 14px", background: "#fff",
                  border: "1px solid #E5E7EB", borderRadius: "16px 16px 16px 4px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  <ThinkingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>{/* inner max-width div */}
          </div>{/* scroll area */}

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <div style={{ maxWidth: 780, margin: "0 0", padding: "0 24px 10px", width: "100%" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["What's on my calendar this week?","Search for the latest AI news","Schedule a meeting tomorrow at 3pm"].map(s => (
                  <button key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:20, padding:"6px 14px", fontSize:12, color:"#374151", cursor:"pointer" }}
                    onMouseEnter={e => { e.target.style.borderColor="#3B6FE8"; e.target.style.color="#3B6FE8"; }}
                    onMouseLeave={e => { e.target.style.borderColor="#E5E7EB"; e.target.style.color="#374151"; }}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ background:"#fff", borderTop:"1px solid #E5E7EB", padding:"12px 24px 16px", flexShrink:0 }}>
            <div style={{ maxWidth:780, margin:"0 auto" }}>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 10,
              background: "#F9FAFB", border: "1.5px solid #E5E7EB",
              borderRadius: 14, padding: "10px 12px",
              transition: "border-color 0.15s",
            }}
              onFocusCapture={e => e.currentTarget.style.borderColor = "#3B6FE8"}
              onBlurCapture={e => e.currentTarget.style.borderColor = "#E5E7EB"}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything — search the web, manage your calendar…"
                rows={1}
                style={{
                  flex: 1, background: "none", border: "none", resize: "none",
                  fontSize: 14, color: "#1A1D23", lineHeight: 1.5,
                  fontFamily: "'Inter', sans-serif",
                  maxHeight: 120, overflowY: "auto",
                }}
                onInput={e => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: "none",
                  background: (loading || !input.trim()) ? "#E5E7EB" : "linear-gradient(135deg, #3B6FE8, #6366F1)",
                  color: (loading || !input.trim()) ? "#9CA3AF" : "#fff",
                  cursor: (loading || !input.trim()) ? "not-allowed" : "pointer",
                  fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s",
                  boxShadow: (loading || !input.trim()) ? "none" : "0 2px 8px rgba(59,111,232,0.3)",
                }}
              >↑</button>
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 7 }}>
              Enter to send · Shift+Enter for new line
            </div>
            </div>{/* max-width wrapper */}
          </div>{/* input bar */}
        </div>{/* chat pane */}
      </div>{/* root flex */}
    </>
  );
}
