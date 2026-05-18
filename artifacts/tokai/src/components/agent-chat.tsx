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

const UI = {
  en: {
    title: "TOKAGENT · TASK PLANNER",
    focus: "FOCUS", energy: "ENERGY", noise: "NOISE",
    label: "TOKAGENT",
    analyzing: "ANALYZING NEURAL STATE...",
    placeholder: "Tell TokAgent what you want to work on today...",
    send: "SEND",
    greeting: (f: string, e: string) =>
      `Neural sync established. I'm TokAgent, your task planning assistant. Based on your current state — Focus ${f}/100, Energy ${e}% — I can help you build and prioritize your to-do list. What are you trying to accomplish today?`,
    error: "Neural link disrupted. Check that your API key is valid and try again.",
    keyPromptTitle: "ANTHROPIC API KEY REQUIRED",
    keyPromptDesc: "TokAgent runs on your own Anthropic API key. It is stored locally in your browser and sent only to this app's server to process your request — never stored.",
    keyPlaceholder: "sk-ant-...",
    keySubmit: "CONNECT",
    keyGet: "Get a key at console.anthropic.com",
    clearKey: "CLEAR KEY",
  },
  zh: {
    title: "TOKAGENT · 任務規劃",
    focus: "專注", energy: "能量", noise: "噪訊",
    label: "TOKAGENT",
    analyzing: "神經狀態分析中...",
    placeholder: "告訴 TokAgent 你今天想做什麼...",
    send: "傳送",
    greeting: (f: string, e: string) =>
      `神經同步完成。我是 TokAgent，你的任務規劃助手。根據你當前的狀態——專注度 ${f}/100，能量 ${e}%——我可以幫你制定並優先排列今日任務清單。你今天需要完成什麼？`,
    error: "神經鏈路中斷。請確認 API 金鑰有效後重試。",
    keyPromptTitle: "需要 ANTHROPIC API 金鑰",
    keyPromptDesc: "TokAgent 使用你自己的 Anthropic API 金鑰運作。金鑰僅儲存在你的瀏覽器本機，並只傳送至本應用伺服器以處理請求，絕不會被儲存。",
    keyPlaceholder: "sk-ant-...",
    keySubmit: "連線",
    keyGet: "前往 console.anthropic.com 取得金鑰",
    clearKey: "清除金鑰",
  },
};

const STORAGE_KEY = "tokai_anthropic_key";
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export default function AgentChat({ neuralState, tasks, lang = "en" }: { neuralState: NeuralState; tasks: Task[]; lang?: "en" | "zh" }) {
  const t = UI[lang];

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [keyInput, setKeyInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.greeting(neuralState.focusIndex.toFixed(1), String(Math.round(neuralState.bioEnergy))) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLang = useRef(lang);

  useEffect(() => {
    if (prevLang.current !== lang) {
      prevLang.current = lang;
      setMessages([{ role: "assistant", content: UI[lang].greeting(neuralState.focusIndex.toFixed(1), String(Math.round(neuralState.bioEnergy))) }]);
    }
  }, [lang, neuralState.focusIndex, neuralState.bioEnergy]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function submitKey() {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem(STORAGE_KEY, k);
    setApiKey(k);
    setKeyInput("");
  }

  function clearKey() {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey("");
  }

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
        body: JSON.stringify({ messages: next, neuralState, tasks, lang, userApiKey: apiKey }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: t.error }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const S = {
    wrap: { background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(192,132,252,0.07)" } as React.CSSProperties,
    header: { padding: "12px 20px", borderBottom: "1px solid rgba(192,132,252,0.15)", display: "flex", alignItems: "center", gap: 10, background: "rgba(192,132,252,0.03)" } as React.CSSProperties,
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c084fc", boxShadow: "0 0 8px rgba(192,132,252,0.9)", flexShrink: 0 }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>
          <span style={{ color: "#7c3aed" }}>TOK</span>
          <span style={{ color: "#c084fc" }}>{lang === "en" ? "AGENT · TASK PLANNER" : "AGENT · 任務規劃"}</span>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#5a8fa8" }}>
          <span>{t.focus} {neuralState.focusIndex.toFixed(1)}/100</span>
          <span>{t.energy} {Math.round(neuralState.bioEnergy)}%</span>
          <span>{t.noise} {Math.round(neuralState.neuralNoise)} μV²</span>
          {apiKey && (
            <button onClick={clearKey} style={{ background: "none", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 4, color: "#5a8fa8", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, padding: "2px 7px", letterSpacing: 1 }}>
              {t.clearKey}
            </button>
          )}
        </div>
      </div>

      {!apiKey ? (
        /* ── Key entry prompt ── */
        <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 2 }}>{t.keyPromptTitle}</div>
          <p style={{ fontSize: 13, color: "#5a8fa8", lineHeight: 1.6, margin: 0 }}>{t.keyPromptDesc}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitKey()}
              placeholder={t.keyPlaceholder}
              style={{ flex: 1, padding: "9px 14px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#d0e8f8", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none" }}
            />
            <button
              onClick={submitKey}
              disabled={!keyInput.trim()}
              style={{ padding: "9px 18px", background: keyInput.trim() ? "rgba(192,132,252,0.15)" : "rgba(192,132,252,0.05)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, cursor: keyInput.trim() ? "pointer" : "not-allowed", letterSpacing: 1 }}
            >
              {t.keySubmit}
            </button>
          </div>
          <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "rgba(192,132,252,0.5)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>{t.keyGet} →</a>
        </div>
      ) : (
        <>
          {/* ── Messages ── */}
          <div style={{ height: 260, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "72%", padding: "10px 14px", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.role === "user" ? "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.12))" : "rgba(192,132,252,0.06)", border: `1px solid ${msg.role === "user" ? "rgba(124,58,237,0.35)" : "rgba(192,132,252,0.18)"}`, fontSize: 14, color: "#d0e8f8", lineHeight: 1.6, fontFamily: "'Rajdhani', sans-serif" }}>
                  {msg.role === "assistant" && (
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc", letterSpacing: 2, marginBottom: 5 }}>{t.label}</div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 2px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.18)" }}>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc", letterSpacing: 2, marginBottom: 5 }}>{t.label}</div>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 2 }}>{t.analyzing}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(192,132,252,0.15)", display: "flex", gap: 10, background: "rgba(0,0,0,0.15)" }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={t.placeholder} disabled={loading}
              style={{ flex: 1, padding: "9px 14px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "'Rajdhani', sans-serif", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
              onFocus={e => (e.target.style.borderColor = "rgba(192,132,252,0.5)")}
              onBlur={e => (e.target.style.borderColor = "rgba(192,132,252,0.2)")}
            />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ padding: "9px 20px", background: loading || !input.trim() ? "rgba(192,132,252,0.05)" : "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, cursor: loading || !input.trim() ? "not-allowed" : "pointer", letterSpacing: 1, transition: "background 0.2s" }}
            >
              {t.send}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
