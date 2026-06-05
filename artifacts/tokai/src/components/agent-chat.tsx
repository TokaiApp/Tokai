import { useState, useRef, useEffect } from "react";
import { Bot } from "lucide-react";

interface NeuralState {
  focusIndex: number;
  bioEnergy: number;
  neuralNoise: number;
  tbRatio: number;
  theta?: number;
  beta?: number;
}

interface Task {
  title: string;
  description?: string | null;
  done: boolean;
  demand?: string | null;
  estimatedMinutes?: number | null;
  deadline?: string;
  createdAt?: string;
  emoji?: string;
}

interface JournalEntry {
  text: string;
  time: string;
  date?: string;
  focusIndex: number;
  mood: string[];
}

interface MedEntry {
  id: string;
  name: string;
  dose: string;
  time: string;
}

interface MoodAssessment {
  mood: "positive" | "neutral" | "low";
  energy: "high" | "moderate" | "low";
  stress: "calm" | "mild" | "elevated";
  suggestion: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowTime() { return new Date().toTimeString().slice(0, 5); }

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
    keyPromptDesc: "TokAgent runs on your own Anthropic API key. Your key is stored locally in your browser and never saved on our servers.",
    keyPrivacy: "When you send a message, your neural metrics, tasks, journal entries, and medication log are transmitted to Anthropic's API to generate a response. Anthropic does not use API data to train its models. Nothing is stored on Tokai's servers. All local data lives in your browser only.",
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
    keyPromptDesc: "TokAgent 使用你自己的 Anthropic API 金鑰運作。金鑰僅儲存在你的瀏覽器本機，不會儲存於我們的伺服器。",
    keyPrivacy: "當你發送訊息時，你的神經指標、任務、日誌條目與藥物紀錄將傳送至 Anthropic API 以生成回應。Anthropic 不會使用 API 資料訓練模型。Tokai 伺服器不儲存任何資料，所有本機資料僅存於你的瀏覽器。",
    keyPlaceholder: "sk-ant-...",
    keySubmit: "連線",
    keyGet: "前往 console.anthropic.com 取得金鑰",
    clearKey: "清除金鑰",
  },
};

const STORAGE_KEY = "tokai_anthropic_key";
const CHAT_KEY_PREFIX = "tokai_chat";
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export default function AgentChat({ neuralState, tasks, journalEntries = [], medLog = [], lang = "en", isMobile = false, selectedDate, onInfo, moodAssessment }: {
  neuralState: NeuralState;
  tasks: Task[];
  journalEntries?: JournalEntry[];
  medLog?: MedEntry[];
  lang?: "en" | "zh";
  isMobile?: boolean;
  selectedDate?: string;
  onInfo?: () => void;
  moodAssessment?: MoodAssessment;
}) {
  const t = UI[lang];
  const chatDate = selectedDate ?? todayStr();
  const chatKey = `${CHAT_KEY_PREFIX}_${chatDate}`;
  const isToday = chatDate === todayStr();

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [keyInput, setKeyInput] = useState("");
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem("tokai_agent_collapsed") === "1");
  function toggleCollapsed() {
    setCollapsed(c => { const next = !c; try { localStorage.setItem("tokai_agent_collapsed", next ? "1" : "0"); } catch { /* ignore */ } return next; });
  }
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const s = localStorage.getItem(chatKey);
      if (s) { const d = JSON.parse(s); if (d.lang === lang && Array.isArray(d.messages) && d.messages.length > 0) return d.messages; }
      if (isToday) {
        const legacy = localStorage.getItem(CHAT_KEY_PREFIX);
        if (legacy) {
          const d = JSON.parse(legacy);
          const valid = Array.isArray(d.messages) && d.messages.every((m: unknown) => m && typeof (m as {role:string}).role === "string" && typeof (m as {content:string}).content === "string");
          if (valid && d.messages.length > 0) {
            localStorage.setItem(chatKey, legacy);
            localStorage.removeItem(CHAT_KEY_PREFIX);
            return d.messages;
          }
          localStorage.removeItem(CHAT_KEY_PREFIX);
        }
      }
    } catch {}
    if (!isToday) return [];
    return [{ role: "assistant" as const, content: t.greeting(neuralState.focusIndex.toFixed(1), String(Math.round(neuralState.bioEnergy))) }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLang = useRef(lang);

  useEffect(() => {
    if (prevLang.current !== lang) {
      prevLang.current = lang;
      if (!isToday) return;
      const greeting = [{ role: "assistant" as const, content: UI[lang].greeting(neuralState.focusIndex.toFixed(1), String(Math.round(neuralState.bioEnergy))) }];
      setMessages(greeting);
      try { localStorage.setItem(chatKey, JSON.stringify({ lang, messages: greeting })); } catch {}
    }
  }, [lang, neuralState.focusIndex, neuralState.bioEnergy]);

  useEffect(() => {
    if (!isToday) return;
    try { localStorage.setItem(chatKey, JSON.stringify({ lang, messages })); } catch {}
  }, [lang, messages]);

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

  function resetChat() {
    localStorage.removeItem(chatKey);
    localStorage.removeItem(CHAT_KEY_PREFIX);
    const greeting = [{ role: "assistant" as const, content: t.greeting(neuralState.focusIndex.toFixed(1), String(Math.round(neuralState.bioEnergy))) }];
    setMessages(greeting);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: nowTime() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const stripped = next.map(({ role, content }) => ({ role, content }));
      const firstUser = stripped.findIndex(m => m.role === "user");
      const apiMessages = firstUser > 0 ? stripped.slice(firstUser) : stripped;

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, neuralState, tasks, journalEntries, medLog, lang, userApiKey: apiKey, moodAssessment }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.content ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content, timestamp: nowTime() }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, { role: "assistant", content: `${t.error} [${msg}]` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const S = {
    wrap: { background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(192,132,252,0.07)", display: "flex", flexDirection: "column", height: collapsed ? "auto" : 480 } as React.CSSProperties,
    header: { padding: "12px 20px", borderBottom: "1px solid rgba(192,132,252,0.15)", display: "flex", alignItems: "center", gap: 10, background: "rgba(192,132,252,0.03)" } as React.CSSProperties,
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div onClick={toggleCollapsed} title={collapsed ? (lang === "en" ? "Expand" : "展開") : (lang === "en" ? "Collapse" : "收合")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minWidth: 0 }}>
          <span style={{ color: "rgba(192,132,252,0.7)", fontSize: 12, lineHeight: 1, flexShrink: 0, transform: collapsed ? "none" : "rotate(90deg)", transition: "transform 0.15s" }}>▸</span>
          <Bot size={16} color="#c084fc" style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, whiteSpace: "nowrap" }}>
            <span style={{ color: "#7c3aed" }}>TOK</span>
            <span style={{ color: "#c084fc" }}>{lang === "en" ? "AGENT · TASK PLANNER" : "AGENT · 任務規劃"}</span>
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#5a8fa8" }}>
          {!collapsed && isMobile && <>
            <span>{t.focus} {neuralState.focusIndex.toFixed(1)}/100</span>
            <span>{t.energy} {Math.round(neuralState.bioEnergy)}%</span>
            <span>{t.noise} {Math.round(neuralState.neuralNoise)} μV²</span>
          </>}
          {!collapsed && apiKey && isToday && (
            <button onClick={resetChat} style={{ background: "none", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 4, color: "#5a8fa8", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, padding: "4px 10px", letterSpacing: 1 }}>
              {lang === "en" ? "RESET CHAT" : "重置對話"}
            </button>
          )}
          {!collapsed && apiKey && (
            <button onClick={clearKey} style={{ background: "none", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 4, color: "#5a8fa8", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, padding: "4px 10px", letterSpacing: 1 }}>
              {t.clearKey}
            </button>
          )}
          {onInfo && (
            <button onClick={onInfo}
              style={{ background: "none", border: "1px solid rgba(192,132,252,0.25)", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(192,132,252,0.5)", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,132,252,0.6)"; (e.currentTarget as HTMLButtonElement).style.color = "#c084fc"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,132,252,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(192,132,252,0.5)"; }}>
              ?
            </button>
          )}
        </div>
      </div>

      {!collapsed && (!apiKey ? (
        <div style={{ flex: 1, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 2 }}>{t.keyPromptTitle}</div>
          <p style={{ fontSize: 15, color: "#5a8fa8", lineHeight: 1.6, margin: 0 }}>{t.keyPromptDesc}</p>
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
          <div style={{ padding: "10px 12px", background: "rgba(192,132,252,0.04)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 6 }}>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(90,143,168,0.8)", lineHeight: 1.6, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 0.3 }}>{t.keyPrivacy}</p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* ── Messages ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {!isToday && messages.length === 0 && (
              <p style={{ margin: 0, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(90,143,168,0.5)", letterSpacing: 1 }}>
                {lang === "en" ? "No session recorded for this day." : "此日無對話紀錄。"}
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "72%", padding: "10px 14px", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.role === "user" ? "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.12))" : "rgba(192,132,252,0.06)", border: `1px solid ${msg.role === "user" ? "rgba(124,58,237,0.35)" : "rgba(192,132,252,0.18)"}`, fontSize: 17, color: "#d0e8f8", lineHeight: 1.6, fontFamily: "'Rajdhani', sans-serif" }}>
                  {msg.role === "assistant" && (
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 2, marginBottom: 5 }}>{t.label}</div>
                  )}
                  {msg.content}
                  {msg.timestamp && (
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.5)", marginTop: 6, textAlign: msg.role === "user" ? "right" : "left", letterSpacing: 0.5 }}>{msg.timestamp}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "12px 12px 12px 2px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.18)" }}>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 2, marginBottom: 5 }}>{t.label}</div>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, color: "#5a8fa8", letterSpacing: 2 }}>{t.analyzing}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input (today only) ── */}
          {isToday ? (
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(192,132,252,0.15)", display: "flex", gap: 10, background: "rgba(0,0,0,0.15)" }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={t.placeholder}
                style={{ flex: 1, padding: "9px 14px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "'Rajdhani', sans-serif", fontSize: 16, outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => (e.target.style.borderColor = "rgba(192,132,252,0.5)")}
                onBlur={e => (e.target.style.borderColor = "rgba(192,132,252,0.2)")}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                style={{ padding: "9px 20px", background: loading || !input.trim() ? "rgba(192,132,252,0.05)" : "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, cursor: loading || !input.trim() ? "not-allowed" : "pointer", letterSpacing: 1, transition: "background 0.2s" }}
              >
                {t.send}
              </button>
            </div>
          ) : (
            <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(192,132,252,0.1)", background: "rgba(0,0,0,0.15)", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.5)", letterSpacing: 1 }}>
              {lang === "en" ? "PAST SESSION · READ ONLY" : "歷史對話 · 唯讀"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
