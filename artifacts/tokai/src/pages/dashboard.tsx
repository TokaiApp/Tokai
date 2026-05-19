import { useState, useEffect, useRef, useCallback } from "react";
import { Github } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine,
} from "recharts";
import AgentChat from "@/components/agent-chat";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type Lang = "en" | "zh";

const T = {
  en: {
    version: "Tokai Pre-Alpha",
    systemControl: "SYSTEM CONTROL",
    liveStream: "Live Stream",
    refreshRate: "Refresh Rate (s)",
    manualRefresh: "⊕ Manual Refresh",
    sessionInfo: "SESSION INFO",
    date: "DATE", time: "TIME", samples: "SAMPLES", status: "STATUS",
    active: "ACTIVE", paused: "PAUSED",
    aboutTokai: "ABOUT TOKAI",
    aboutText: "Tokai synthesizes EEG stream data with biological rhythms to generate adaptive cognitive recommendations for people with ADHD.",
    sourceCode: "Source Code",
    sessionLabel: "SESSION",
    subtitle: "NEUROSUPPORTIVE DASHBOARD · ADHD MANAGEMENT SYSTEM",
    focusIndex: "FOCUS INDEX",
    bioEnergy: "BIO ENERGY",
    neuralNoise: "NEURAL NOISE",
    tbRatio: "T/B RATIO",
    tbrFocused: "FOCUSED", tbrNormal: "NORMAL", tbrElevated: "ELEVATED", tbrHigh: "HIGH",
    focusWindow: "FOCUS WINDOW",
    collectingData: "Collecting data...",
    streamMoreSamples: "STREAM MORE SAMPLES",
    confidence: "CONFIDENCE",
    focusStream: "REAL-TIME FOCUS STREAM",
    neuralInsights: "TOKAI · NEURAL INSIGHTS",
    tokTodo: "TOKTODO",
    taskPlaceholder: "Task title — press Enter to add...",
    descPlaceholder: "Description (optional)...",
    generateDesc: "✦ GENERATE DESCRIPTION",
    generating: "GENERATING...",
    taskDetail: "TASK DETAIL",
    deleteTask: "DELETE TASK",
    demandLabel: "DEMAND",
    demandLow: "LOW", demandMed: "MED", demandHigh: "HIGH",
    estTime: "Est. time", minUnit: "m",
    progress: "PROGRESS",
    complete: "✓ COMPLETE",
    planningInterface: "── PLANNING INTERFACE",
    focusLow: "LOW", focusMod: "MODERATE", focusHigh: "HIGH", focusOpt: "OPTIMAL",
    noiseClean: "CLEAN", noiseNom: "NOMINAL", noiseElev: "ELEVATED", noiseHigh: "HIGH",
    insightOptimal: (f: string, e: string) =>
      `Optimal cognitive window detected. Focus is high (${f}/100) with excellent energy reserves (${e}%). This is your prime window for deep work, complex problem-solving, and high-stakes creative tasks. Prioritize your hardest challenges now.`,
    insightMod: (f: string, noise: string, e: string, eLevel: string) =>
      `Neural baseline is ${noise}. Conditions are favorable for sustained cognitive work. Focus is moderate (${f}/100). Consider chunking tasks into 20-minute intervals. Biological energy is ${eLevel} (${e}%). Leverage this window for complex problem-solving.`,
    insightLow: (f: string, e: string) =>
      `Focus index is low (${f}/100). Neural noise is elevated. Recommend switching to low-cognitive tasks — organizing, reviewing notes, or short breaks. Energy at ${e}%. Allow your neural state to recover before tackling demanding work.`,
  },
  zh: {
    version: "Tokai 預覽版",
    systemControl: "系統控制",
    liveStream: "即時串流",
    refreshRate: "更新頻率（秒）",
    manualRefresh: "⊕ 手動更新",
    sessionInfo: "工作階段資訊",
    date: "日期", time: "時間", samples: "樣本", status: "狀態",
    active: "作用中", paused: "已暫停",
    aboutTokai: "關於 TOKAI",
    aboutText: "Tokai 整合 EEG 腦電流數據與生理節律，為 ADHD 使用者提供自適應認知建議。",
    sourceCode: "原始碼",
    sessionLabel: "工作階段",
    subtitle: "神經支援儀表板 · ADHD 管理系統",
    focusIndex: "專注指數",
    bioEnergy: "生理能量",
    neuralNoise: "神經噪訊",
    tbRatio: "θ/β 比值",
    tbrFocused: "專注", tbrNormal: "正常", tbrElevated: "偏高", tbrHigh: "高",
    focusWindow: "專注窗口",
    collectingData: "資料收集中...",
    streamMoreSamples: "繼續收集樣本",
    confidence: "可信度",
    focusStream: "即時專注串流",
    neuralInsights: "TOKAI · 神經洞察",
    tokTodo: "任務清單",
    taskPlaceholder: "任務標題 — 按 Enter 新增...",
    descPlaceholder: "描述（選填）...",
    generateDesc: "✦ 生成描述",
    generating: "生成中...",
    taskDetail: "任務詳情",
    deleteTask: "刪除任務",
    demandLabel: "認知負荷",
    demandLow: "低", demandMed: "中", demandHigh: "高",
    estTime: "預估時間", minUnit: "分",
    progress: "進度",
    complete: "✓ 全部完成",
    planningInterface: "── 規劃介面",
    focusLow: "低", focusMod: "中等", focusHigh: "高", focusOpt: "最佳",
    noiseClean: "清晰", noiseNom: "正常", noiseElev: "偏高", noiseHigh: "高",
    insightOptimal: (f: string, e: string) =>
      `檢測到最佳認知窗口。專注度高（${f}/100），能量儲備充足（${e}%）。現在是深度工作與高價值創造任務的黃金時段，請優先處理最具挑戰性的工作。`,
    insightMod: (f: string, noise: string, e: string, eLevel: string) =>
      `神經基線${noise}。認知工作條件良好，專注度中等（${f}/100）。建議以 20 分鐘為單元分解任務。生理能量${eLevel}（${e}%），適合持續的問題求解工作。`,
    insightLow: (f: string, e: string) =>
      `專注指數偏低（${f}/100），神經噪訊較高。建議切換至低認知負荷任務——整理資料、回顧筆記或短暫休息。能量水平 ${e}%，待神經狀態恢復後再處理高難度工作。`,
  },
};

interface NeuralState {
  focusIndex: number;
  bioEnergy: number;
  neuralNoise: number;
  tbRatio: number;
  theta: number;
  beta: number;
}

interface FocusPoint { time: string; value: number; }
type Demand = "low" | "medium" | "high";
interface Task { id: string; title: string; description: string | null; done: boolean; demand: Demand | null; estimatedMinutes: number | null; }

function demandColor(d: Demand) {
  if (d === "low") return "#4ade80";
  if (d === "medium") return "#ffa040";
  return "#f472b6";
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function formatTime(d: Date) { return d.toTimeString().slice(0, 8); }

function drift(val: number, amount: number, min: number, max: number) {
  return parseFloat(clamp(val + (Math.random() - 0.5) * amount, min, max).toFixed(2));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 3, marginBottom: 10, borderBottom: "1px solid rgba(192,132,252,0.2)", paddingBottom: 4 }}>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ width: 36, height: 20, background: checked ? "rgba(192,132,252,0.25)" : "rgba(0,0,0,0.4)", borderRadius: 10, cursor: "pointer", position: "relative", border: `1px solid ${checked ? "#c084fc" : "rgba(192,132,252,0.2)"}`, transition: "all 0.2s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 2, left: checked ? 17 : 2, width: 14, height: 14, borderRadius: "50%", background: checked ? "#c084fc" : "#5a8fa8", transition: "left 0.2s" }} />
    </div>
  );
}

function MetricCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 10, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg, #c084fc, #7c3aed)" }} />
      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#5a8fa8", letterSpacing: 2, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 16, background: "#c084fc", borderRadius: 1, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 3 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, padding: "2px 8px", border: `1px solid ${color}`, color, borderRadius: 3, letterSpacing: 1 }}>
      {children}
    </span>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6, overflow: "hidden", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1 }}
    >
      <span style={{ width: 48, textAlign: "center", padding: "6px 0", display: "inline-block", color: lang === "en" ? "#c084fc" : "#5a8fa8", fontWeight: lang === "en" ? 700 : 400, background: lang === "en" ? "rgba(192,132,252,0.15)" : "transparent", transition: "all 0.2s" }}>EN</span>
      <span style={{ color: "rgba(192,132,252,0.3)", padding: "6px 0" }}>|</span>
      <span style={{ width: 48, textAlign: "center", padding: "6px 0", display: "inline-block", color: lang === "zh" ? "#c084fc" : "#5a8fa8", fontWeight: lang === "zh" ? 700 : 400, background: lang === "zh" ? "rgba(192,132,252,0.15)" : "transparent", transition: "all 0.2s" }}>中文</span>
    </button>
  );
}

export default function Dashboard() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [liveStream, setLiveStream] = useState(true);
  const [refreshRate, setRefreshRate] = useState(3);
  const [now, setNow] = useState(new Date());
  const sessionStart = useRef(new Date());
  const [samples, setSamples] = useState(1);

  const [neural, setNeural] = useState<NeuralState>({
    focusIndex: 35.6, bioEnergy: 84, neuralNoise: 29,
    tbRatio: 2.10, theta: 88.0, beta: 41.9,
  });
  const neuralRef = useRef(neural);
  useEffect(() => { neuralRef.current = neural; }, [neural]);

  // Internal focus target: drifts slowly, actual focus index pulls toward it
  const focusTargetRef = useRef(55);

  const [focusHistory, setFocusHistory] = useState<FocusPoint[]>([
    { time: formatTime(new Date()), value: 35.6 },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Review morning notes", description: "Scan yesterday's capture for open action items before the day's first focus block.", done: false, demand: "low", estimatedMinutes: 15 },
    { id: "2", title: "Deep work block: project spec", description: null, done: false, demand: "high", estimatedMinutes: 90 },
    { id: "3", title: "Reply to priority emails", description: null, done: false, demand: "medium", estimatedMinutes: 30 },
  ]);
  const [newTask, setNewTask] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDemand, setNewTaskDemand] = useState<Demand | null>(null);
  const [newTaskTime, setNewTaskTime] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedTaskId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tick = useCallback(() => {
    const prev = neuralRef.current;
    const newTheta = drift(prev.theta, 18, 10, 180);
    const newBeta = drift(prev.beta, 18, 10, 180);

    // Mean-reverting focus simulation: target drifts slowly, focus pulls toward it
    focusTargetRef.current = clamp(
      focusTargetRef.current + (Math.random() - 0.5) * 10,
      5, 95
    );
    const focusPull = (focusTargetRef.current - prev.focusIndex) * 0.2;
    const newFocus = parseFloat(clamp(prev.focusIndex + focusPull + (Math.random() - 0.5) * 10, 0, 100).toFixed(1));

    const next: NeuralState = {
      focusIndex: newFocus,
      bioEnergy: drift(prev.bioEnergy, 2, 0, 100),
      neuralNoise: drift(prev.neuralNoise, 3, 0, 80),
      tbRatio: parseFloat((newTheta / newBeta).toFixed(2)),
      theta: newTheta, beta: newBeta,
    };
    setNeural(next);
    neuralRef.current = next;
    const maxSamples = Math.round(5 * 60 / refreshRate);
    setFocusHistory(h => [...h, { time: formatTime(new Date()), value: next.focusIndex }].slice(-maxSamples));
    setSamples(s => s + 1);
  }, [refreshRate]);

  useEffect(() => {
    if (!liveStream) return;
    const id = setInterval(tick, refreshRate * 1000);
    return () => clearInterval(id);
  }, [liveStream, refreshRate, tick]);

  function getFocusInfo(f: number) {
    if (f < 30) return { label: t.focusLow, color: "#ff4d4d" };
    if (f < 60) return { label: t.focusMod, color: "#ffa040" };
    if (f < 80) return { label: t.focusHigh, color: "#c084fc" };
    return { label: t.focusOpt, color: "#f472b6" };
  }

  function getTBRInfo(tbr: number) {
    if (tbr < 1.5) return { label: t.tbrFocused, color: "#f472b6" };
    if (tbr < 2.5) return { label: t.tbrNormal, color: "#4ade80" };
    if (tbr < 3.5) return { label: t.tbrElevated, color: "#ffa040" };
    return { label: t.tbrHigh, color: "#ff4d4d" };
  }

  function getNoiseInfo(n: number) {
    if (n < 20) return { label: t.noiseClean, color: "#f472b6" };
    if (n < 40) return { label: t.noiseNom, color: "#c084fc" };
    if (n < 60) return { label: t.noiseElev, color: "#ffa040" };
    return { label: t.noiseHigh, color: "#ff4d4d" };
  }

  const focusInfo = getFocusInfo(neural.focusIndex);
  const noiseInfo = getNoiseInfo(neural.neuralNoise);
  const tbrInfo = getTBRInfo(neural.tbRatio);

  function getInsight() {
    const f = neural.focusIndex;
    const e = neural.bioEnergy;
    if (f > 70 && e > 70) return t.insightOptimal(f.toFixed(1), String(Math.round(e)));
    if (f > 50) {
      const eLevel = lang === "en" ? (e > 60 ? "high" : "moderate") : (e > 60 ? "高" : "中等");
      return t.insightMod(f.toFixed(1), noiseInfo.label.toLowerCase(), String(Math.round(e)), eLevel);
    }
    return t.insightLow(f.toFixed(1), String(Math.round(e)));
  }

  function addTask(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && newTask.trim()) {
      setTasks(prev => [...prev, {
        id: Date.now().toString(),
        title: newTask.trim(),
        description: newTaskDesc.trim() || null,
        done: false,
        demand: newTaskDemand,
        estimatedMinutes: newTaskTime ? parseInt(newTaskTime) : null,
      }]);
      setNewTask("");
      setNewTaskDesc("");
      setNewTaskDemand(null);
      setNewTaskTime("");
    }
  }

  async function generateDescription(task: Task) {
    const apiKey = localStorage.getItem("tokai_anthropic_key") ?? "";
    if (!apiKey || generatingId) return;
    setGeneratingId(task.id);
    try {
      const res = await fetch(`${API_BASE}/api/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: task.title, neuralState: neural, lang, userApiKey: apiKey }),
      });
      const data = await res.json();
      if (data.description) {
        setTasks(p => p.map(t => t.id === task.id ? { ...t, description: data.description } : t));
      }
    } catch { /* silent */ }
    setGeneratingId(null);
  }

  const completedCount = tasks.filter(t => t.done).length;
  const sessionDuration = Math.floor((now.getTime() - sessionStart.current.getTime()) / 60000);
  const avgFocus = focusHistory.length > 1
    ? Math.round(focusHistory.reduce((s, p) => s + p.value, 0) / focusHistory.length)
    : null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(135deg, #0c0818 0%, #100a25 50%, #080614 100%)", fontFamily: "'Rajdhani', sans-serif", color: "#c8d8e8" }}>

      {/* ── Sidebar (desktop only) ── */}
      <aside style={{ width: 200, minWidth: 200, padding: "24px 16px", borderRight: "1px solid rgba(192,132,252,0.15)", display: isMobile ? "none" : "flex", flexDirection: "column", gap: 24, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <a href="https://tokai.app" target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none" }}>
          <img src="/tokai_logo.png" alt="Tokai" style={{ width: 110, display: "block", marginBottom: 6 }} />
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 2, textAlign: "center" }}>{t.version}</div>
        </a>

        <div>
          <SectionLabel>{t.systemControl}</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 15, color: "#c8d8e8" }}>{t.liveStream}</span>
            <Toggle checked={liveStream} onChange={setLiveStream} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "#5a8fa8" }}>{t.refreshRate}</span>
              <span style={{ fontSize: 11, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace" }}>{refreshRate}</span>
            </div>
            <input type="range" min={1} max={10} value={refreshRate}
              onChange={e => setRefreshRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#c084fc", cursor: "pointer" }} />
          </div>
          <button onClick={tick} style={{ width: "100%", padding: "6px 0", background: "transparent", border: "1px solid rgba(192,132,252,0.4)", color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, cursor: "pointer", letterSpacing: 1, borderRadius: 4 }}>
            {t.manualRefresh}
          </button>
        </div>

        <div>
          <SectionLabel>{t.sessionInfo}</SectionLabel>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <tbody>
              {([
                [t.date, now.toISOString().slice(0, 10)],
                [t.time, formatTime(now)],
                [t.samples, String(samples)],
                [t.status, liveStream ? t.active : t.paused],
              ] as [string, string][]).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: "#5a8fa8", paddingRight: 8, paddingBottom: 5, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>{k}</td>
                  <td style={{ color: k === t.status ? (liveStream ? "#c084fc" : "#ffa040") : "#c8d8e8", fontFamily: "'Share Tech Mono', monospace" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <SectionLabel>{t.aboutTokai}</SectionLabel>
          <p style={{ fontSize: 13, color: "#5a8fa8", lineHeight: 1.6, margin: "0 0 12px 0" }}>{t.aboutText}</p>
          <a href="https://github.com/TokaiApp/Tokai-Pre-Alpha" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#5a8fa8", textDecoration: "none", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#c084fc")}
            onMouseLeave={e => (e.currentTarget.style.color = "#5a8fa8")}>
            <Github size={20} />{t.sourceCode}
          </a>
        </div>

        <div style={{ marginTop: "auto", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(192,132,252,0.3)", letterSpacing: 1 }}>
          {t.sessionLabel} {sessionDuration}m
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowX: "hidden", minWidth: 0 }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(192,132,252,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(12,8,24,0.97)", position: "sticky", top: 0, zIndex: 20 }}>
            <a href="https://tokai.app" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <img src="/tokai_logo.png" alt="Tokai" style={{ width: 34 }} />
              <div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 20, letterSpacing: 4, lineHeight: 1 }}>
                  <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>AI</span>
                </div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#5a8fa8", letterSpacing: 1, marginTop: 2 }}>{t.version}</div>
              </div>
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8" }}>{t.liveStream}</span>
                <Toggle checked={liveStream} onChange={setLiveStream} />
              </div>
              <LangToggle lang={lang} setLang={setLang} />
            </div>
          </div>
        )}

        {/* Content area */}
        <div style={{ padding: isMobile ? "16px" : "24px 28px", display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>

          {/* Desktop header */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 52, fontWeight: 700, letterSpacing: 14, textShadow: "0 0 30px rgba(192,132,252,0.4), 0 0 60px rgba(192,132,252,0.15)", margin: "0 0 4px 0" }}>
                  <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>AI</span>
                </h1>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 4 }}>{t.subtitle}</div>
              </div>
              <LangToggle lang={lang} setLang={setLang} />
            </div>
          )}

          {/* Metric cards — 2 cols on mobile, 5 on desktop */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: isMobile ? 10 : 14 }}>
            <MetricCard title={t.focusIndex}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                {neural.focusIndex.toFixed(1)}<span style={{ fontSize: 16, color: "#5a8fa8" }}>/100</span>
              </div>
              <Badge color={focusInfo.color}>{focusInfo.label}</Badge>
            </MetricCard>

            <MetricCard title={t.bioEnergy}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                {Math.round(neural.bioEnergy)}<span style={{ fontSize: 16, color: "#5a8fa8" }}>%</span>
              </div>
              <div style={{ height: 4, background: "rgba(192,132,252,0.1)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${neural.bioEnergy}%`, background: "linear-gradient(90deg, #c084fc, #7c3aed)", borderRadius: 2, transition: "width 0.5s ease" }} />
              </div>
            </MetricCard>

            <MetricCard title={t.neuralNoise}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                {Math.round(neural.neuralNoise)}<span style={{ fontSize: 14, color: "#5a8fa8" }}> μV²</span>
              </div>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: noiseInfo.color, letterSpacing: 2 }}>{noiseInfo.label}</span>
            </MetricCard>

            <MetricCard title={t.tbRatio}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>{neural.tbRatio}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge color={tbrInfo.color}>{tbrInfo.label}</Badge>
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1, marginTop: 6 }}>
                θ:{neural.theta.toFixed(1)}  β:{neural.beta.toFixed(1)}
              </div>
            </MetricCard>

            <MetricCard title={t.focusWindow}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e8f4ff", marginBottom: 8, lineHeight: 1.4 }}>
                {focusHistory.length < 6 ? t.collectingData : `~${Math.max(3, Math.round((80 - neural.focusIndex) / 2))} min`}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1 }}>
                {focusHistory.length < 6 ? t.streamMoreSamples : `${t.confidence} ${Math.min(99, Math.round(50 + samples * 1.2))}%`}
              </div>
            </MetricCard>

          </div>

          {/* Charts row — stacked on mobile */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 360px", gap: 14 }}>
            <Panel title={
              <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span>{t.focusStream}</span>
                {avgFocus !== null && (
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(192,132,252,0.6)", letterSpacing: 1, fontWeight: 400 }}>
                    5m avg: {avgFocus}
                  </span>
                )}
              </span>
            }>
              <div style={{ position: "relative", height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={focusHistory} margin={{ top: 8, right: 48, bottom: 0, left: 0 }}>
                    <XAxis dataKey="time" tick={{ fill: "#5a8fa8", fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} interval={focusHistory.length <= 6 ? 0 : Math.ceil((focusHistory.length - 1) / 5) - 1} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#5a8fa8", fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} ticks={[0, 20, 40, 60, 80, 100]} />
                    <ReferenceLine y={60} stroke="rgba(255,80,80,0.35)" strokeDasharray="4 4" />
                    {avgFocus !== null && (
                      <ReferenceLine y={avgFocus} stroke="rgba(192,132,252,0.55)" strokeDasharray="6 3" />
                    )}
                    <Line type="monotone" dataKey="value" stroke="#c084fc" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc" }}>
                  {neural.focusIndex.toFixed(1)}
                </div>
              </div>
            </Panel>

            <Panel title={t.neuralInsights}>
              <p style={{ fontSize: 15, color: "#c8d8e8", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>
                "{getInsight()}"
              </p>
            </Panel>
          </div>

          {/* Planning interface */}
          <div style={{ borderTop: "1px solid rgba(192,132,252,0.25)", paddingTop: 20 }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 3, marginBottom: 14 }}>{t.planningInterface}</div>
            {/* Agent + Todo — stacked on mobile */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <AgentChat neuralState={neural} tasks={tasks.map(t => ({ title: t.title, description: t.description, done: t.done, demand: t.demand, estimatedMinutes: t.estimatedMinutes }))} lang={lang} isMobile={isMobile} />

              <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, padding: 16, boxShadow: "0 0 24px rgba(192,132,252,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 3, height: 16, background: "#c084fc", borderRadius: 1, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3 }}>
                    {lang === "en"
                      ? <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>TODO · CHECKLIST</span></>
                      : <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>TODO · {t.tokTodo}</span></>}
                  </span>
                </div>
                {/* Task title input */}
                <input
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={addTask}
                  placeholder={t.taskPlaceholder}
                  style={{ width: "100%", padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: "4px 4px 0 0", color: "#c8d8e8", fontFamily: "'Rajdhani', sans-serif", fontSize: 16, boxSizing: "border-box", outline: "none" }}
                />
                {/* Task description input */}
                <input
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  placeholder={t.descPlaceholder}
                  style={{ width: "100%", padding: "5px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(192,132,252,0.2)", borderTop: "none", borderRadius: "0 0 4px 4px", color: "#7a9ab8", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, marginBottom: 8, boxSizing: "border-box", outline: "none", fontStyle: "italic" }}
                />
                {/* Demand + time selectors */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 1, flexShrink: 0 }}>{t.demandLabel}:</span>
                  {(["low", "medium", "high"] as Demand[]).map(d => (
                    <button key={d} onClick={() => setNewTaskDemand(newTaskDemand === d ? null : d)} style={{ padding: "3px 10px", background: newTaskDemand === d ? demandColor(d) + "22" : "transparent", border: `1px solid ${newTaskDemand === d ? demandColor(d) : "rgba(192,132,252,0.2)"}`, borderRadius: 3, color: newTaskDemand === d ? demandColor(d) : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, cursor: "pointer", letterSpacing: 1, transition: "all 0.15s" }}>
                      {d === "low" ? t.demandLow : d === "medium" ? t.demandMed : t.demandHigh}
                    </button>
                  ))}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 1 }}>{t.estTime}:</span>
                    <input
                      type="number" min={1} max={480}
                      value={newTaskTime}
                      onChange={e => setNewTaskTime(e.target.value)}
                      placeholder="—"
                      style={{ width: 52, padding: "3px 6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c8d8e8", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none", textAlign: "center" }}
                    />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8" }}>{t.minUnit}</span>
                  </div>
                </div>
                {/* Task list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto", overflowX: "hidden" }}>
                  {tasks.map(task => (
                    <div key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      style={{ display: "flex", flexDirection: "column", padding: "8px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 4, border: "1px solid rgba(192,132,252,0.1)", gap: 5, minWidth: 0, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.35)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(192,132,252,0.05)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.1)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.2)"; }}
                    >
                      {/* Top row: checkbox + title + badges */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
                        <div onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={task.done}
                            onChange={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                            style={{ accentColor: "#c084fc", cursor: "pointer", flexShrink: 0, marginTop: 3 }} />
                        </div>
                        <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: task.done ? "#5a8fa8" : "#c8d8e8", textDecoration: task.done ? "line-through" : "none", minWidth: 0, wordBreak: "break-word" }}>
                          {task.title}
                        </span>
                        {task.demand && (
                          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, padding: "1px 5px", border: `1px solid ${demandColor(task.demand)}`, color: demandColor(task.demand), borderRadius: 3, flexShrink: 0, letterSpacing: 1 }}>
                            {task.demand === "low" ? t.demandLow : task.demand === "medium" ? t.demandMed : t.demandHigh}
                          </span>
                        )}
                        {task.estimatedMinutes && (
                          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", flexShrink: 0 }}>
                            {task.estimatedMinutes}{t.minUnit}
                          </span>
                        )}
                      </div>
                      {/* Description preview */}
                      {task.description && (
                        <p style={{ margin: 0, marginLeft: 22, fontSize: 13, color: "#5a8fa8", lineHeight: 1.5, fontStyle: "italic", fontFamily: "'Rajdhani', sans-serif", wordBreak: "break-word" }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 1 }}>
                  {t.progress} {completedCount}/{tasks.length} {completedCount > 0 && completedCount === tasks.length ? t.complete : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile footer with session info + links */}
          {isMobile && (
            <div style={{ borderTop: "1px solid rgba(192,132,252,0.15)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8" }}>
                <span>{t.samples} {samples}</span>
                <span>{t.status}: {liveStream ? <span style={{ color: "#c084fc" }}>{t.active}</span> : <span style={{ color: "#ffa040" }}>{t.paused}</span>}</span>
                <span>{t.sessionLabel} {sessionDuration}m</span>
              </div>
              <a href="https://github.com/TokaiApp/Tokai-Pre-Alpha" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#5a8fa8", textDecoration: "none", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1 }}>
                <Github size={16} />{t.sourceCode}
              </a>
            </div>
          )}

        </div>
      </main>

      {/* ── Task detail modal ── */}
      {(() => {
        const task = tasks.find(t => t.id === selectedTaskId);
        if (!task) return null;
        return (
          <div onClick={() => setSelectedTaskId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 12, padding: 24, boxShadow: "0 0 48px rgba(192,132,252,0.12)", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 3, height: 16, background: "#c084fc", borderRadius: 1, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc", letterSpacing: 3, flex: 1 }}>{t.taskDetail}</span>
                <button onClick={() => setSelectedTaskId(null)} style={{ background: "none", border: "none", color: "#5a8fa8", cursor: "pointer", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
              </div>

              {/* Done toggle + title */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <input type="checkbox" checked={task.done}
                  onChange={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                  style={{ accentColor: "#c084fc", cursor: "pointer", flexShrink: 0, marginTop: 6, width: 16, height: 16 }} />
                <input
                  value={task.title}
                  onChange={e => setTasks(p => p.map(t => t.id === task.id ? { ...t, title: e.target.value } : t))}
                  style={{ flex: 1, padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#c8d8e8", fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 600, boxSizing: "border-box", outline: "none", textDecoration: task.done ? "line-through" : "none" }}
                />
              </div>

              {/* Description */}
              <textarea
                value={task.description ?? ""}
                onChange={e => setTasks(p => p.map(t => t.id === task.id ? { ...t, description: e.target.value || null } : t))}
                placeholder={t.descPlaceholder}
                rows={3}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, color: "#7a9ab8", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontStyle: "italic", resize: "vertical", boxSizing: "border-box", outline: "none", lineHeight: 1.5 }}
              />

              {/* Generate button */}
              <button
                onClick={() => generateDescription(task)}
                disabled={!!generatingId}
                style={{ alignSelf: "flex-start", padding: "4px 12px", background: "none", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 4, color: generatingId === task.id ? "#5a8fa8" : "rgba(192,132,252,0.6)", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, cursor: generatingId ? "default" : "pointer", letterSpacing: 1 }}
              >
                {generatingId === task.id ? t.generating : t.generateDesc}
              </button>

              {/* Demand + time */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1, flexShrink: 0 }}>{t.demandLabel}:</span>
                {(["low", "medium", "high"] as Demand[]).map(d => (
                  <button key={d} onClick={() => setTasks(p => p.map(tk => tk.id === task.id ? { ...tk, demand: tk.demand === d ? null : d } : tk))}
                    style={{ padding: "3px 10px", background: task.demand === d ? demandColor(d) + "22" : "transparent", border: `1px solid ${task.demand === d ? demandColor(d) : "rgba(192,132,252,0.2)"}`, borderRadius: 3, color: task.demand === d ? demandColor(d) : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>
                    {d === "low" ? t.demandLow : d === "medium" ? t.demandMed : t.demandHigh}
                  </button>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1 }}>{t.estTime}:</span>
                  <input type="number" min={1} max={480}
                    value={task.estimatedMinutes ?? ""}
                    onChange={e => setTasks(p => p.map(tk => tk.id === task.id ? { ...tk, estimatedMinutes: e.target.value ? parseInt(e.target.value) : null } : tk))}
                    placeholder="—"
                    style={{ width: 52, padding: "3px 7px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c8d8e8", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, outline: "none", textAlign: "center" }}
                  />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8" }}>{t.minUnit}</span>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => { setTasks(p => p.filter(tk => tk.id !== task.id)); setSelectedTaskId(null); }}
                style={{ alignSelf: "flex-start", padding: "5px 12px", background: "transparent", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 4, color: "rgba(255,80,80,0.6)", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}
              >
                {t.deleteTask}
              </button>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
