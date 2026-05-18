import { useState, useRef, useEffect } from "react";

interface NeuralState {
  focusIndex: number;
  bioEnergy: number;
  neuralNoise: number;
  abRatio: number;
}

interface Task {
  text: string;
  done: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export default function AgentChat({ neuralState, tasks }: { neuralState: NeuralState; tasks: Task[] }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Neural sync established. I'm TokAgent, your task planning assistant. Based on your current state — Focus ${neuralState.focusIndex.toFixed(1)}/100, Energy ${Math.round(neuralState.bioEnergy)}% — I can help you build and prioritize your to-do list. What are you trying to accomplish today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, neuralState, tasks }),
      });

      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Neural link disrupted. Make sure the API server is running (PORT=3000 pnpm --filter @workspace/api-server dev) and ANTHROPIC_API_KEY is set.",
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div style={{ background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(192,132,252,0.07)" }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(192,132,252,0.15)", display: "flex", alignItems: "center", gap: 10, background: "rgba(192,132,252,0.03)" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c084fc", boxShadow: "0 0 8px rgba(192,132,252,0.9)", flexShrink: 0 }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, fontWeight: 700, color: "#c084fc", letterSpacing: 3 }}>TOKAGENT · TASK PLANNER</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#5a8fa8" }}>
          <span>FOCUS {neuralState.focusIndex.toFixed(1)}/100</span>
          <span>ENERGY {Math.round(neuralState.bioEnergy)}%</span>
          <span>NOISE {Math.round(neuralState.neuralNoise)} μV²</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ height: 260, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "72%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.role === "user"
                ? "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.12))"
                : "rgba(192,132,252,0.06)",
              border: `1px solid ${msg.role === "user" ? "rgba(124,58,237,0.35)" : "rgba(192,132,252,0.18)"}`,
              fontSize: 14,
              color: "#d0e8f8",
              lineHeight: 1.6,
              fontFamily: "'Rajdhani', sans-serif",
            }}>
              {msg.role === "assistant" && (
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc", letterSpacing: 2, marginBottom: 5 }}>TOKAGENT</div>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 2px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.18)" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc", letterSpacing: 2, marginBottom: 5 }}>TOKAGENT</div>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 2 }}>ANALYZING NEURAL STATE...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(192,132,252,0.15)", display: "flex", gap: 10, background: "rgba(0,0,0,0.15)" }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Tell TokAgent what you want to work on today..."
          disabled={loading}
          style={{
            flex: 1, padding: "9px 14px",
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(192,132,252,0.2)",
            borderRadius: 6, color: "#d0e8f8",
            fontFamily: "'Rajdhani', sans-serif", fontSize: 14,
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(192,132,252,0.5)")}
          onBlur={e => (e.target.style.borderColor = "rgba(192,132,252,0.2)")}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: "9px 20px",
            background: loading || !input.trim() ? "rgba(192,132,252,0.05)" : "rgba(192,132,252,0.15)",
            border: "1px solid rgba(192,132,252,0.3)",
            borderRadius: 6, color: "#c084fc",
            fontFamily: "'Share Tech Mono', monospace", fontSize: 11,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            letterSpacing: 1,
            transition: "background 0.2s",
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
