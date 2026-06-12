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
  id: string;
  title: string;
  description?: string | null;
  done: boolean;
  focusRequired?: number | null;
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
  role: "user" | "assistant" | "action";
  content: string;
  timestamp?: string;
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type ApiMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };

interface AgentTools {
  createTask: (params: { title: string; description?: string; emoji?: string; focusRequired?: number; estimatedMinutes?: number; deadline?: string }) => Promise<{ id: string }>;
  updateTask: (id: string, changes: { title?: string; description?: string; emoji?: string; focusRequired?: number; estimatedMinutes?: number; deadline?: string; done?: boolean }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  setActiveTask: (id: string | null) => Promise<void>;
  deleteAllTasks: () => Promise<void>;
  addJournalEntry: (text: string, moods?: string[]) => Promise<void>;
  logMedication: (name: string, dose?: string) => Promise<void>;
  startTimer: (workMins?: number, breakMins?: number) => void;
  stopTimer: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  create_task: "CREATED TASK",
  update_task: "UPDATED TASK",
  delete_task: "DELETED TASK",
  complete_task: "COMPLETED TASK",
  set_active_task: "SET ACTIVE TASK",
  delete_all_tasks: "CLEARED ALL TASKS",
  add_journal_entry: "JOURNAL NOTE ADDED",
  log_medication: "MEDICATION LOGGED",
  start_timer: "TIMER STARTED",
  stop_timer: "TIMER STOPPED",
};

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
    keyPromptDesc: "Add your Anthropic API key in your profile to enable TokAgent. A key you enter is stored locally in your browser and never saved on Tokai's servers.",
    keyOpenSettings: "OPEN PROFILE SETTINGS",
    keyPrivacy: "When you send a message, your neural metrics, tasks, journal, and medication log are sent to Anthropic's API to generate a response. Anthropic does not use API data to train its models, and Tokai's API server is a stateless relay that stores nothing. Your tasks, journal, and profile are kept in your private Tokai account (isolated per user via row-level security); your API key and chat history stay in your browser.",
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
    keyPromptDesc: "在個人檔案中加入你的 Anthropic API 金鑰即可啟用 TokAgent。你輸入的金鑰僅儲存在瀏覽器本機，不會儲存於 Tokai 伺服器。",
    keyOpenSettings: "開啟個人設定",
    keyPrivacy: "當你發送訊息時，你的神經指標、任務、日誌與藥物紀錄會傳送至 Anthropic API 以生成回應。Anthropic 不會使用 API 資料訓練模型，且 Tokai 的 API 伺服器為無狀態中繼，不儲存任何資料。你的任務、日誌與個人檔案儲存在你的私人 Tokai 帳戶中（透過列級安全性逐一隔離）；API 金鑰與對話紀錄則留在你的瀏覽器。",
    keyPlaceholder: "sk-ant-...",
    keySubmit: "連線",
    keyGet: "前往 console.anthropic.com 取得金鑰",
    clearKey: "清除金鑰",
  },
};

const STORAGE_KEY = "tokai_anthropic_key";
const CHAT_KEY_PREFIX = "tokai_chat";
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export default function AgentChat({ neuralState, tasks, journalEntries = [], medLog = [], lang = "en", isMobile = false, selectedDate, onInfo, onClose, onOpenSettings, apiKey, moodAssessment, tools }: {
  neuralState: NeuralState;
  tasks: Task[];
  journalEntries?: JournalEntry[];
  medLog?: MedEntry[];
  lang?: "en" | "zh";
  isMobile?: boolean;
  selectedDate?: string;
  onInfo?: () => void;
  onClose?: () => void;
  onOpenSettings?: () => void;
  apiKey: string;
  moodAssessment?: MoodAssessment;
  tools?: AgentTools;
}) {
  const t = UI[lang];
  const chatDate = selectedDate ?? todayStr();
  const chatKey = `${CHAT_KEY_PREFIX}_${chatDate}`;
  const isToday = chatDate === todayStr();

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

  function resetChat() {
    localStorage.removeItem(chatKey);
    localStorage.removeItem(CHAT_KEY_PREFIX);
    const greeting = [{ role: "assistant" as const, content: t.greeting(neuralState.focusIndex.toFixed(1), String(Math.round(neuralState.bioEnergy))) }];
    setMessages(greeting);
  }

  async function executeTool(toolCall: { id: string; name: string; input: Record<string, unknown> }): Promise<{ success: boolean; message: string }> {
    if (!tools) return { success: false, message: "no tools connected" };
    try {
      switch (toolCall.name) {
        case "create_task": {
          const p = toolCall.input as Parameters<AgentTools["createTask"]>[0];
          const result = await tools.createTask(p);
          return { success: true, message: `"${p.title}" · ID ${result.id}` };
        }
        case "update_task": {
          const { id, ...changes } = toolCall.input as { id: string } & Parameters<AgentTools["updateTask"]>[1];
          await tools.updateTask(id, changes);
          return { success: true, message: `ID ${id}` };
        }
        case "delete_task": {
          const { id } = toolCall.input as { id: string };
          await tools.deleteTask(id);
          return { success: true, message: `ID ${id} removed` };
        }
        case "complete_task": {
          const { id } = toolCall.input as { id: string };
          await tools.completeTask(id);
          return { success: true, message: `ID ${id} done` };
        }
        case "set_active_task": {
          const { id } = toolCall.input as { id: string };
          await tools.setActiveTask(id);
          return { success: true, message: `ID ${id}` };
        }
        case "delete_all_tasks": {
          const { confirm: ok } = toolCall.input as { confirm: boolean };
          if (!ok) return { success: false, message: "confirmation required" };
          await tools.deleteAllTasks();
          return { success: true, message: "all tasks removed" };
        }
        case "add_journal_entry": {
          const { text, moods } = toolCall.input as { text: string; moods?: string[] };
          await tools.addJournalEntry(text, moods);
          return { success: true, message: text.length > 50 ? text.slice(0, 50) + "…" : text };
        }
        case "log_medication": {
          const { name, dose } = toolCall.input as { name: string; dose?: string };
          await tools.logMedication(name, dose);
          return { success: true, message: `${name}${dose ? ` · ${dose}` : ""}` };
        }
        case "start_timer": {
          const { workMins, breakMins } = toolCall.input as { workMins?: number; breakMins?: number };
          tools.startTimer(workMins, breakMins);
          return { success: true, message: `${workMins ?? 25}m work / ${breakMins ?? 5}m break` };
        }
        case "stop_timer": {
          tools.stopTimer();
          return { success: true, message: "timer stopped" };
        }
        default:
          return { success: false, message: `unknown: ${toolCall.name}` };
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "tool failed" };
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: nowTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build initial API message history from display messages (exclude action chips)
      const displayMsgs = [...messages, userMsg];
      const stripped: ApiMessage[] = displayMsgs
        .filter(m => m.role !== "action")
        .map(({ role, content }) => ({ role: role as "user" | "assistant", content }));
      const firstUser = stripped.findIndex(m => m.role === "user");
      let roundMessages: ApiMessage[] = firstUser > 0 ? stripped.slice(firstUser) : stripped;

      for (let round = 0; round < 5; round++) {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: roundMessages, neuralState, tasks, journalEntries, medLog, lang, userApiKey: apiKey, moodAssessment }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.content ?? `HTTP ${res.status}`);
        }
        const data = await res.json();

        if (data.stop_reason !== "tool_use" || !data.tool_calls?.length) {
          setMessages(prev => [...prev, { role: "assistant", content: data.content ?? t.error, timestamp: nowTime() }]);
          break;
        }

        // Append assistant's full content blocks to round history
        roundMessages = [...roundMessages, { role: "assistant", content: data.raw_content }];

        // Execute each tool and collect results
        const toolResults: ContentBlock[] = [];
        for (const toolCall of data.tool_calls as { id: string; name: string; input: Record<string, unknown> }[]) {
          const result = await executeTool(toolCall);
          const label = TOOL_LABELS[toolCall.name] ?? toolCall.name;
          const icon = result.success ? "✓" : "✗";
          setMessages(prev => [...prev, { role: "action", content: `${label}  ${icon}  ${result.message}`, timestamp: nowTime() }]);
          toolResults.push({ type: "tool_result", tool_use_id: toolCall.id, content: result.message });
        }

        roundMessages = [...roundMessages, { role: "user", content: toolResults }];
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, { role: "assistant", content: `${t.error} [${msg}]` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const S = {
    wrap: { background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: onClose ? "12px 12px 0 0" : 10, overflow: "hidden", boxShadow: "0 0 24px rgba(192,132,252,0.07)", display: "flex", flexDirection: "column", height: onClose ? "100%" : 480 } as React.CSSProperties,
    header: { padding: "12px 20px", borderBottom: "1px solid rgba(192,132,252,0.15)", display: "flex", alignItems: "center", gap: 10, background: "rgba(192,132,252,0.03)" } as React.CSSProperties,
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <Bot size={16} color="#c084fc" style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3 }}>
          <span style={{ color: "#7c3aed" }}>TOK</span>
          <span style={{ color: "#c084fc" }}>{lang === "en" ? "AGENT · TASK PLANNER" : "AGENT · 任務規劃"}</span>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#5a8fa8" }}>
          {isMobile && <>
            <span>{t.focus} {neuralState.focusIndex.toFixed(1)}/100</span>
            <span>{t.energy} {Math.round(neuralState.bioEnergy)}%</span>
            <span>{t.noise} {Math.round(neuralState.neuralNoise)} μV²</span>
          </>}
          {apiKey && isToday && (
            <button onClick={resetChat} style={{ background: "none", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 4, color: "#5a8fa8", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, padding: "4px 10px", letterSpacing: 1 }}>
              {lang === "en" ? "RESET CHAT" : "重置對話"}
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
          {onClose && (
            <button onClick={onClose} title={lang === "en" ? "Close" : "關閉"}
              style={{ background: "none", border: "1px solid rgba(192,132,252,0.25)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, padding: 0, lineHeight: 1, flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,132,252,0.6)"; (e.currentTarget as HTMLButtonElement).style.color = "#c084fc"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,132,252,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "#5a8fa8"; }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {!apiKey ? (
        <div style={{ flex: 1, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 2 }}>{t.keyPromptTitle}</div>
          <p style={{ fontSize: 15, color: "#5a8fa8", lineHeight: 1.6, margin: 0 }}>{t.keyPromptDesc}</p>
          {onOpenSettings && (
            <button onClick={onOpenSettings}
              style={{ alignSelf: "flex-start", padding: "9px 18px", background: "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>
              {t.keyOpenSettings}
            </button>
          )}
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
            {messages.map((msg, i) =>
              msg.role === "action" ? (
                <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ fontSize: 11, fontFamily: "'Share Tech Mono', monospace", color: "#4ade80", background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 4, padding: "3px 12px", letterSpacing: 0.5, maxWidth: "90%", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    ⚡ {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "72%", padding: "10px 14px", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.role === "user" ? "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.12))" : "rgba(192,132,252,0.06)", border: `1px solid ${msg.role === "user" ? "rgba(124,58,237,0.35)" : "rgba(192,132,252,0.18)"}`, fontSize: 17, color: "#d0e8f8", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>
                    {msg.role === "assistant" && (
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 2, marginBottom: 5 }}>{t.label}</div>
                    )}
                    {msg.content}
                    {msg.timestamp && (
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.5)", marginTop: 6, textAlign: msg.role === "user" ? "right" : "left", letterSpacing: 0.5 }}>{msg.timestamp}</div>
                    )}
                  </div>
                </div>
              )
            )}
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
                style={{ flex: 1, padding: "9px 14px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "var(--font-body)", fontSize: 16, outline: "none", transition: "border-color 0.2s" }}
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
      )}
    </div>
  );
}
