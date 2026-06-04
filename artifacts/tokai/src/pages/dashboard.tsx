import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Github, Activity, BookOpen, ListChecks, Pill, Brain, Crosshair, Zap, Waves, BarChart2, Clock, Camera } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine,
} from "recharts";
import AgentChat from "@/components/agent-chat";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type Lang = "en" | "zh";

const T = {
  en: {
    version: "Tokai Alpha",
    systemControl: "SYSTEM CONTROL",
    liveStream: "Live Stream",
    refreshRate: "Refresh Rate (s)",
    manualRefresh: "⊕ Manual Refresh",
    sessionInfo: "SESSION INFO",
    date: "DATE", time: "TIME", samples: "SAMPLES", status: "STATUS",
    active: "ACTIVE", paused: "PAUSED",
    aboutTokai: "ABOUT TOKAI",
    aboutText: "Tokai is a neurosupportive productivity suite for people with ADHD. It streams EEG and biological data in real time to adapt task recommendations to your current cognitive state — helping you work with your brain, not against it.",
    sourceCode: "Source Code",
    sessionLabel: "DURATION",
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
    estTime: "Est. time", minUnit: "m",
    progress: "PROGRESS",
    complete: "✓ COMPLETE",
    tokMed: "TOKMED · LOG",
    medNamePlaceholder: "Med / supplement / coffee...",
    medDosePlaceholder: "Dose (optional)",
    medLogBtn: "LOG",
    medEmpty: "No entries logged yet. Log a medication or supplement to see how it affects your focus.",
    medAt: "at",
    tokNote: "TOKNOTE · JOURNAL",
    notePlaceholder: "Write a note... (Enter to save)",
    noteEmpty: "No journal entries yet. Write a note to capture your thoughts alongside your focus data.",
    noteFocusLabel: "Focus",
    moodHyperfocus: "Hyperfocus", moodFlow: "Flow", moodFocused: "Focused", moodRestless: "Restless", moodScattered: "Scattered", moodAnxious: "Anxious", moodFatigued: "Fatigued", moodZonedOut: "Zoned Out", moodCrashed: "Crashed", moodLow: "Low",
    planningInterface: "── PLANNING INTERFACE",
    focusLow: "LOW", focusMod: "MODERATE", focusHigh: "HIGH", focusOpt: "OPTIMAL",
    noiseClean: "CLEAN", noiseNom: "NOMINAL", noiseElev: "ELEVATED", noiseHigh: "HIGH",
    insightOptimal: (f: string, e: string) =>
      `Optimal cognitive window detected. Focus is high (${f}/100) with excellent energy reserves (${e}%). This is your prime window for deep work, complex problem-solving, and high-stakes creative tasks. Prioritize your hardest challenges now.`,
    insightMod: (f: string, noise: string, e: string, eLevel: string) =>
      `Neural baseline is ${noise}. Conditions are favorable for sustained cognitive work. Focus is moderate (${f}/100). Consider chunking tasks into 20-minute intervals. Biological energy is ${eLevel} (${e}%). Leverage this window for complex problem-solving.`,
    insightLow: (f: string, e: string) =>
      `Focus index is low (${f}/100). Neural noise is elevated. Recommend switching to low-cognitive tasks — organizing, reviewing notes, or short breaks. Energy at ${e}%. Allow your neural state to recover before tackling demanding work.`,
    signOut: "SIGN OUT",
    developedBy: "Developed by",
    pomodoro: "POMODORO",
    pomoFocus: "FOCUS", pomoBreak: "BREAK", pomoLongBreak: "LONG BREAK",
    pomoStart: "▶ START", pomoPause: "⏸ PAUSE",
    pomoWorkLabel: "WORK", pomoBreakLabel: "BREAK",
    bestTaskBtn: "✦ BEST TASK RIGHT NOW", bestTaskLoading: "THINKING...",
    viewing: "VIEWING",
    pastDayReadOnly: "PAST DAY · READ ONLY",
    noTasksYet: "No tasks yet. Add one above.",
    minFocusLabel: "⚡ MIN FOCUS:",
    minFocusHint: "auto if blank",
    focusReadyLabel: "✓ READY", focusMarginalLabel: "~ MARGINAL", focusNotYetLabel: "✗ NOT YET",
    deadlineLabel: "DEADLINE:", taskAddedLabel: "ADDED",
    dueLabel: "DUE",
  },
  zh: {
    version: "Tokai Alpha",
    systemControl: "系統控制",
    liveStream: "即時串流",
    refreshRate: "更新頻率（秒）",
    manualRefresh: "⊕ 手動更新",
    sessionInfo: "工作階段資訊",
    date: "日期", time: "時間", samples: "樣本", status: "狀態",
    active: "作用中", paused: "已暫停",
    aboutTokai: "關於 TOKAI",
    aboutText: "Tokai 是專為 ADHD 設計的神經支援生產力套件。透過即時串流 EEG 與生理數據，根據你當前的認知狀態調整任務建議——幫助你順應大腦節律，而非與之對抗。",
    sourceCode: "原始碼",
    sessionLabel: "時長",
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
    estTime: "預估時間", minUnit: "分",
    progress: "進度",
    complete: "✓ 全部完成",
    tokMed: "TOKMED · 紀錄",
    medNamePlaceholder: "藥物 / 補充品 / 咖啡...",
    medDosePlaceholder: "劑量（選填）",
    medLogBtn: "紀錄",
    medEmpty: "尚無紀錄。記錄藥物或補充品以觀察其對專注度的影響。",
    medAt: "於",
    tokNote: "TOKNOTE · 日誌",
    notePlaceholder: "寫筆記... (Enter 儲存)",
    noteEmpty: "尚無日誌紀錄。記下你的想法，與專注數據一起追蹤。",
    noteFocusLabel: "專注",
    moodHyperfocus: "超專注", moodFlow: "心流", moodFocused: "專注", moodRestless: "坐立難安", moodScattered: "渙散", moodAnxious: "焦慮", moodFatigued: "疲憊", moodZonedOut: "恍神", moodCrashed: "崩潰", moodLow: "低落",
    planningInterface: "── 規劃介面",
    focusLow: "低", focusMod: "中等", focusHigh: "高", focusOpt: "最佳",
    noiseClean: "清晰", noiseNom: "正常", noiseElev: "偏高", noiseHigh: "高",
    insightOptimal: (f: string, e: string) =>
      `檢測到最佳認知窗口。專注度高（${f}/100），能量儲備充足（${e}%）。現在是深度工作與高價值創造任務的黃金時段，請優先處理最具挑戰性的工作。`,
    insightMod: (f: string, noise: string, e: string, eLevel: string) =>
      `神經基線${noise}。認知工作條件良好，專注度中等（${f}/100）。建議以 20 分鐘為單元分解任務。生理能量${eLevel}（${e}%），適合持續的問題求解工作。`,
    insightLow: (f: string, e: string) =>
      `專注指數偏低（${f}/100），神經噪訊較高。建議切換至低認知負荷任務——整理資料、回顧筆記或短暫休息。能量水平 ${e}%，待神經狀態恢復後再處理高難度工作。`,
    signOut: "登出",
    developedBy: "開發者",
    pomodoro: "番茄鐘",
    pomoFocus: "專注", pomoBreak: "短休", pomoLongBreak: "長休息",
    pomoStart: "▶ 開始", pomoPause: "⏸ 暫停",
    pomoWorkLabel: "專注時間", pomoBreakLabel: "休息時間",
    bestTaskBtn: "✦ 現在最佳任務", bestTaskLoading: "思考中...",
    viewing: "檢視",
    pastDayReadOnly: "歷史日期 · 唯讀",
    noTasksYet: "尚無任務。請在上方新增。",
    minFocusLabel: "⚡ 最低專注：",
    minFocusHint: "留空自動估算",
    focusReadyLabel: "✓ 可開始", focusMarginalLabel: "~ 勉強", focusNotYetLabel: "✗ 尚未準備",
    deadlineLabel: "截止日期：", taskAddedLabel: "新增於",
    dueLabel: "截止",
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
interface Task { id: string; title: string; description: string | null; done: boolean; estimatedMinutes: number | null; createdAt?: string; deadline?: string; emoji?: string; focusRequired?: number; }

const TASK_EMOJIS = ["📚", "✍️", "💻", "📧", "💪", "🍳", "🧹", "🎯", "🔬", "📞", "🛒", "🎨"];
interface MedEntry { id: string; name: string; dose: string; time: string; date: string; focusTime?: string; sampleIndex: number; rating: number | null; }
type Mood = "hyperfocus" | "flow" | "focused" | "restless" | "scattered" | "anxious" | "fatigued" | "zoned-out" | "crashed" | "low";
interface JournalEntry { id: string; text: string; time: string; date: string; focusIndex: number; mood: Mood[]; focusTime?: string; }
interface MoodAssessment { mood: "positive" | "neutral" | "low"; energy: "high" | "moderate" | "low"; stress: "calm" | "mild" | "elevated"; suggestion: string; }


function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function formatTime(d: Date) { return d.toTimeString().slice(0, 5); }
function formatTimeSec(d: Date) { return d.toTimeString().slice(0, 8); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function formatDateTime(d: Date) { return `${todayStr()} ${d.toTimeString().slice(0, 5)}`; }
function formatDayLabel(dateStr: string, lang: string): string {
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return lang === "zh" ? "今天" : "TODAY";
  if (dateStr === yesterday) return lang === "zh" ? "昨天" : "YESTERDAY";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(lang === "zh" ? "zh-TW" : "en-US", { month: "short", day: "numeric" });
}

function drift(val: number, amount: number, min: number, max: number) {
  return parseFloat(clamp(val + (Math.random() - 0.5) * amount, min, max).toFixed(2));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 3, marginBottom: 10, borderBottom: "1px solid rgba(192,132,252,0.2)", paddingBottom: 4 }}>
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

function estimateFocusRequired(title: string, description: string | null): number {
  const text = (title + " " + (description ?? "")).toLowerCase();
  const high = ["math", "calculus", "algebra", "physics", "chemistry", "study", "homework", "assignment", "exam", "test", "essay", "thesis", "dissertation", "research", "analyze", "analysis", "code", "program", "debug", "develop", "design", "write", "draft", "read", "review", "report", "project", "solve", "problem", "chapter", "lecture", "learn"];
  const low = ["medication", "meds", "medicine", "pill", "vitamin", "supplement", "clean", "laundry", "dishes", "wash", "shower", "bath", "groceries", "grocery", "shop", "eat", "lunch", "dinner", "breakfast", "snack", "walk", "stretch", "rest", "sleep", "nap", "call", "text", "message", "reply", "water", "hydrate"];
  if (high.some(k => text.includes(k))) return 65;
  if (low.some(k => text.includes(k))) return 20;
  return 40;
}

function focusReadiness(required: number | undefined, currentFocus: number): { color: string; label: string } | null {
  if (required == null) return null;
  const color = currentFocus >= required ? "#4ade80" : currentFocus >= required - 15 ? "#fbbf24" : "#f472b6";
  return { color, label: required >= 100 ? "100" : `${required}+` };
}

const INFO = {
  en: {
    focusIndex: { title: "FOCUS INDEX", body: "A composite score from 0–100 derived from your theta and beta wave patterns. Above 70 is a strong focus window suited for deep work. Below 40 means your brain needs lower-demand tasks or rest." },
    bioEnergy: { title: "BIO ENERGY", body: "Your estimated biological energy level. Simulated in pre-alpha — future versions will draw from HRV and wearable data. Use it as a rough guide to physical stamina alongside your neural focus." },
    neuralNoise: { title: "NEURAL NOISE", body: "Background EEG signal noise in μV². Lower values mean a calmer, cleaner neural state. Above 40 often indicates heightened arousal, distraction, or environmental interference." },
    tbRatio: { title: "T/B RATIO", body: "Theta-to-beta wave ratio. Elevated TBR above 3.0 is associated with ADHD-type inattention in the research literature. Lower values indicate more active, focused brain states." },
    focusWindow: { title: "FOCUS WINDOW", body: "Predicted time remaining in your current focus state, based on recent trend data. Requires at least 6 samples to calculate. Use this to decide whether to start a long task or wrap up." },
    focusStream: { title: "REAL-TIME FOCUS STREAM", body: "A scrollable real-time chart of your Focus Index over time. Reference lines show your 5-minute average, session average, and day average. Yellow vertical lines mark when you logged a medication or supplement." },
    tokNote: { title: "TOKNOTE", body: "An ADHD-friendly journal. Each entry is automatically stamped with the date, time, and your Focus Index at that moment. Use it to track patterns between how you feel and how your brain is actually performing." },
    tokAgent: { title: "TOKAGENT", body: "Your AI task planning assistant, powered by Claude (Anthropic). TokAgent reads your live neural metrics, full task list, journal entries, and medication log to recommend which tasks to tackle based on your current cognitive state." },
    tokTodo: { title: "TOKTODO", body: "A task manager built around cognitive demand. Tag tasks as Low, Medium, or High demand so TokAgent can match them to your focus level. Add time estimates and deadlines for realistic planning. Tasks are organized by day." },
    tokMed: { title: "TOKMED", body: "Log medications, supplements, and stimulants like coffee. Tokai tracks how your Focus Index changes in the 15–30 minutes after each entry, giving you real data on what affects your brain." },
  },
  zh: {
    focusIndex: { title: "專注指數", body: "從 0 到 100 的綜合評分，源自 θ 與 β 腦波模式。70 以上代表適合深度工作的專注窗口；40 以下表示大腦需要低認知需求任務或休息。" },
    bioEnergy: { title: "生理能量", body: "估算的生理能量水平。Pre-alpha 版本為模擬數值，未來版本將整合 HRV 與穿戴裝置數據。可作為體力的粗略參考。" },
    neuralNoise: { title: "神經噪訊", body: "背景 EEG 訊號噪訊（μV²）。數值越低代表神經狀態越清晰；40 以上通常表示高喚醒、分心或環境干擾。" },
    tbRatio: { title: "θ/β 比值", body: "θ 波與 β 波的比率。TBR 高於 3.0 與研究文獻中的 ADHD 型注意力不足有關；數值較低代表更專注的腦部狀態。" },
    focusWindow: { title: "專注窗口", body: "根據近期趨勢預測目前專注狀態的剩餘時間，至少需要 6 個樣本。可用來判斷是否適合開始長時間任務。" },
    focusStream: { title: "即時專注串流", body: "即時顯示專注指數的可捲動折線圖。參考線分別代表 5 分鐘均值、階段均值與當日均值。黃色垂直線標記你記錄藥物或補充品的時間點。" },
    tokNote: { title: "TOKNOTE", body: "ADHD 友善日誌。每則條目自動標記日期、時間與當下的專注指數，幫助你追蹤感受與大腦實際表現之間的規律。" },
    tokAgent: { title: "TOKAGENT", body: "由 Claude（Anthropic）驅動的 AI 任務規劃助手。TokAgent 讀取你的即時神經指標、任務清單、日誌與藥物紀錄，根據當前認知狀態推薦最適合的任務。" },
    tokTodo: { title: "TOKTODO", body: "以認知負荷為核心設計的任務管理器。為每個任務標記低、中、高需求，讓 TokAgent 能配對你的專注程度。加入預估時間與截止日期，制定更切實際的計畫。" },
    tokMed: { title: "TOKMED", body: "記錄藥物、補充品與咖啡等影響專注的物質。Tokai 追蹤記錄後 15–30 分鐘內專注指數的變化，為你提供有效成分的實際數據。" },
  },
};

function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ background: "none", border: "1px solid rgba(192,132,252,0.25)", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(192,132,252,0.5)", fontFamily: "'Share Tech Mono', monospace", fontSize: 9, padding: 0, lineHeight: 1, flexShrink: 0, transition: "all 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,132,252,0.7)"; (e.currentTarget as HTMLButtonElement).style.color = "#c084fc"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,132,252,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(192,132,252,0.5)"; }}
    >?</button>
  );
}

function MetricCard({ title, icon, onInfo, children }: { title: string; icon?: React.ReactNode; onInfo?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 10, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg, #c084fc, #7c3aed)" }} />
      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "#5a8fa8", letterSpacing: 2, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span style={{ flex: 1 }}>{title}</span>
        {onInfo && <InfoButton onClick={onInfo} />}
      </div>
      {children}
    </div>
  );
}

function Panel({ title, onInfo, children }: { title: React.ReactNode; onInfo?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 16, background: "#c084fc", borderRadius: 1, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 3, flex: 1 }}>{title}</span>
        {onInfo && <InfoButton onClick={onInfo} />}
      </div>
      {children}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, padding: "2px 8px", border: `1px solid ${color}`, color, borderRadius: 3, letterSpacing: 1 }}>
      {children}
    </span>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6, overflow: "hidden", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 15, letterSpacing: 1 }}
    >
      <span style={{ width: 48, textAlign: "center", padding: "6px 0", display: "inline-block", color: lang === "en" ? "#c084fc" : "#5a8fa8", fontWeight: lang === "en" ? 700 : 400, background: lang === "en" ? "rgba(192,132,252,0.15)" : "transparent", transition: "all 0.2s" }}>EN</span>
      <span style={{ color: "rgba(192,132,252,0.3)", padding: "6px 0" }}>|</span>
      <span style={{ width: 48, textAlign: "center", padding: "6px 0", display: "inline-block", color: lang === "zh" ? "#c084fc" : "#5a8fa8", fontWeight: lang === "zh" ? 700 : 400, background: lang === "zh" ? "rgba(192,132,252,0.15)" : "transparent", transition: "all 0.2s" }}>中文</span>
    </button>
  );
}

export default function Dashboard({ session }: { session: Session }) {
  const userId = session.user.id;
  const tokEn = 100; // Alpha: fixed allocation. Beta: fetch from DB per user.
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
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [chartWrapWidth, setChartWrapWidth] = useState(600);
  const [isLive, setIsLive] = useState(true);
  const sessionStartSampleCount = useRef(0);
  useEffect(() => { sessionStartSampleCount.current = focusHistory.length; }, []);

  // Internal focus target: drifts slowly, actual focus index pulls toward it
  const focusTargetRef = useRef(55);

  const [focusHistory, setFocusHistory] = useState<FocusPoint[]>(() => {
    try {
      const s = localStorage.getItem("tokai_focus_history");
      if (s) { const parsed = JSON.parse(s); if (parsed.length > 0) return parsed; }
    } catch {}
    return [{ time: formatTimeSec(new Date()), value: 35.6 }];
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newTaskEmoji, setNewTaskEmoji] = useState("");
  const [newTaskFocusRequired, setNewTaskFocusRequired] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [medLog, setMedLog] = useState<MedEntry[]>([]);
  const [newMedName, setNewMedName] = useState("");
  const [newMedDose, setNewMedDose] = useState("");
  const [newMedTime, setNewMedTime] = useState("");
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editMedName, setEditMedName] = useState("");
  const [editMedDose, setEditMedDose] = useState("");

  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [journalInput, setJournalInput] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([]);
  const [moodDropdownOpen, setMoodDropdownOpen] = useState(false);
  const moodDropdownRef = useRef<HTMLDivElement>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const journalBottomRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => !!localStorage.getItem("tokai_disclaimer_accepted"));

  // Best task
  const [bestTask, setBestTask] = useState<{ taskId: string | null; reason: string } | null>(null);
  const [bestTaskLoading, setBestTaskLoading] = useState(false);

  async function fetchBestTask() {
    setBestTaskLoading(true);
    setBestTask(null);
    try {
      const apiKey = localStorage.getItem("tokai_anthropic_key") ?? "";
      const res = await fetch(`${API_BASE}/api/best-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neuralState: { focusIndex: neural.focusIndex, bioEnergy: neural.bioEnergy },
          tasks: tasks.filter(t => !t.done).map(t => ({ id: t.id, title: t.title, description: t.description, done: t.done, focusRequired: t.focusRequired, estimatedMinutes: t.estimatedMinutes })),
          userApiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      setBestTask(data);
    } catch {
      setBestTask({ taskId: null, reason: "Could not reach the server." });
    }
    setBestTaskLoading(false);
  }

  // Pomodoro
  const [pomodoroWorkMins, setPomodoroWorkMins] = useState(25);
  const [pomodoroBreakMins, setPomodoroBreakMins] = useState(5);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<"work" | "break">("work");
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const pomodoroPhaseRef = useRef<"work" | "break">("work");
  const pomodoroCountRef = useRef(0);
  const pomodoroWorkRef = useRef(25 * 60);
  const pomodoroBreakRef = useRef(5 * 60);
  useEffect(() => { pomodoroPhaseRef.current = pomodoroPhase; }, [pomodoroPhase]);
  useEffect(() => { pomodoroCountRef.current = pomodoroCount; }, [pomodoroCount]);
  useEffect(() => { pomodoroWorkRef.current = pomodoroWorkMins * 60; }, [pomodoroWorkMins]);
  useEffect(() => { pomodoroBreakRef.current = pomodoroBreakMins * 60; }, [pomodoroBreakMins]);
  useEffect(() => {
    if (!pomodoroRunning) return;
    const id = setInterval(() => {
      setPomodoroTimeLeft(t => {
        if (t > 1) return t - 1;
        if (pomodoroPhaseRef.current === "work") {
          const next = pomodoroCountRef.current + 1;
          setPomodoroCount(next);
          pomodoroCountRef.current = next;
          setPomodoroPhase("break");
          pomodoroPhaseRef.current = "break";
          setPomodoroRunning(false);
          return next % 4 === 0 ? pomodoroBreakRef.current * 3 : pomodoroBreakRef.current;
        } else {
          setPomodoroPhase("work");
          pomodoroPhaseRef.current = "work";
          setPomodoroRunning(false);
          return pomodoroWorkRef.current;
        }
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pomodoroRunning]);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  const [moodAssessment, setMoodAssessment] = useState<MoodAssessment | null>(null);
  const [moodCapturedUrl, setMoodCapturedUrl] = useState<string | null>(null);
  const [moodCheckLoading, setMoodCheckLoading] = useState(false);
  const [moodCheckError, setMoodCheckError] = useState<string | null>(null);
  const [showMoodConsent, setShowMoodConsent] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const availableDates = useMemo(() => {
    const dates = new Set<string>([todayStr()]);
    journal.forEach(e => { if (e.date) dates.add(e.date); });
    tasks.forEach(t => { if (t.createdAt) dates.add(t.createdAt.slice(0, 10)); });
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("tokai_chat_") && /\d{4}-\d{2}-\d{2}$/.test(key)) dates.add(key.slice(-10));
      }
    } catch {}
    return [...dates].sort().reverse();
  }, [journal, tasks]);

  useEffect(() => {
    try {
      // cap at 1800 samples (~30 min at 1s, ~90 min at 3s) to stay well within localStorage limits
      localStorage.setItem("tokai_focus_history", JSON.stringify(focusHistory.slice(-1800)));
    } catch {}
  }, [focusHistory]);

  // Load all user data from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: tData }, { data: mData }, { data: jData }] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", userId),
        supabase.from("med_log").select("*").eq("user_id", userId).order("logged_at"),
        supabase.from("journal_entries").select("*").eq("user_id", userId),
      ]);
      if (cancelled) return;

      const mappedTasks: Task[] = (tData ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, title: r.title as string, description: r.description as string | null,
        done: r.done as boolean,
        estimatedMinutes: r.estimated_minutes as number | null, createdAt: r.created_at as string | undefined,
        deadline: r.deadline as string | undefined, emoji: r.emoji as string | undefined,
        focusRequired: r.focus_required as number | undefined,
      }));
      const mappedMeds: MedEntry[] = (mData ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, name: r.name as string, dose: r.dose as string,
        time: r.time as string,
        date: r.logged_at ? (r.logged_at as string).slice(0, 10) : todayStr(),
        focusTime: r.focus_time as string | undefined,
        sampleIndex: r.sample_index as number, rating: r.rating as number | null,
      }));
      const mappedJournal: JournalEntry[] = (jData ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, text: r.text as string, time: r.time as string,
        date: r.date as string, focusIndex: r.focus_index as number,
        mood: r.mood as Mood[], focusTime: r.focus_time as string | undefined,
      }));

      // Seed demo data for brand-new users
      if (mappedTasks.length === 0 && mappedJournal.length === 0) {
        const demoTasks = [
          { id: "demo-t1", user_id: userId, title: "Write methodology section", description: "Draft the research methodology chapter for the thesis.", done: true, estimated_minutes: 90, created_at: "2026-05-18 08:45", emoji: "✍️", focus_required: 65 },
          { id: "demo-t2", user_id: userId, title: "Review data analysis scripts", description: "Check the Python scripts for data processing and output errors.", done: true, estimated_minutes: 60, created_at: "2026-05-18 08:45", emoji: "💻", focus_required: 65 },
          { id: "demo-t3", user_id: userId, title: "Email supervisor — weekly update", description: null, done: true, estimated_minutes: 20, created_at: "2026-05-18 08:45", emoji: "📧", focus_required: 40 },
          { id: "demo-t4", user_id: userId, title: "Read 2 papers for lit review", description: null, done: false, estimated_minutes: 120, created_at: "2026-05-18 14:00", emoji: "📚", focus_required: 65 },
          { id: "demo-t5", user_id: userId, title: "Organize research notes", description: "Sort and label notes from the past two weeks of reading.", done: true, estimated_minutes: 20, created_at: "2026-05-16 10:30", emoji: "📚", focus_required: 30 },
          { id: "demo-t6", user_id: userId, title: "Rest and recharge", description: "Take the afternoon off. Watch something, go for a walk.", done: true, estimated_minutes: null, created_at: "2026-05-16 13:00", emoji: null, focus_required: null },
        ];
        const demoJournal = [
          { id: "demo-j1", user_id: userId, text: "Starting the week with a plan. Reviewed my thesis outline over coffee — feels manageable today.", time: "08:12", date: "2026-05-18", focus_index: 52.3, mood: ["focused"] },
          { id: "demo-j2", user_id: userId, text: "Deep work block finished. Got through the methodology section. Brain is tired now but satisfied.", time: "12:45", date: "2026-05-18", focus_index: 38.7, mood: ["fatigued"] },
          { id: "demo-j3", user_id: userId, text: "Short walk helped reset. Back at it — data analysis scripts are making more sense now.", time: "15:20", date: "2026-05-18", focus_index: 61.2, mood: ["flow"] },
          { id: "demo-j4", user_id: userId, text: "Slow start to Sunday. Tried to work but kept getting distracted. Focus feels very scattered.", time: "10:05", date: "2026-05-16", focus_index: 28.4, mood: ["scattered", "restless"] },
          { id: "demo-j5", user_id: userId, text: "Took a proper break and watched something. Feel a bit better. Going to try one light session before the day ends.", time: "14:30", date: "2026-05-16", focus_index: 41.8, mood: ["low"] },
        ];
        await Promise.all([
          supabase.from("tasks").insert(demoTasks),
          supabase.from("journal_entries").insert(demoJournal),
        ]);
        if (!localStorage.getItem("tokai_chat_2026-05-18")) {
          localStorage.setItem("tokai_chat_2026-05-18", JSON.stringify({ messages: [
            { role: "assistant", content: "Your neural data is streaming. I can see your tasks and today's journal. What would you like to work on first?" },
            { role: "user", content: "Good morning! What should I tackle first today?", timestamp: "08:15" },
            { role: "assistant", content: "Your focus is moderate (52.3/100) — a solid window for structured planning. Start with the methodology section (high demand) while your brain is fresh. Save the paper reading for after lunch. The email to your supervisor can close out the day as a low-demand win.", timestamp: "08:15" },
            { role: "user", content: "I finished the methodology section. Now what?", timestamp: "12:50" },
            { role: "assistant", content: "Strong progress. Your focus has dipped to 38.7 — that's expected after a high-demand block. Move to the data analysis scripts (medium demand) and if you feel cognitive drag after 30 minutes, switch to the supervisor email to close out cleanly.", timestamp: "12:50" },
          ]}));
        }
        if (!localStorage.getItem("tokai_chat_2026-05-16")) {
          localStorage.setItem("tokai_chat_2026-05-16", JSON.stringify({ messages: [
            { role: "assistant", content: "Your neural data is streaming. I can see your tasks and today's journal. What would you like to work on first?" },
            { role: "user", content: "It's Sunday and I can't focus at all. What should I do?", timestamp: "10:10" },
            { role: "assistant", content: "Your brain is signaling low focus (28.4/100) and elevated neural noise — this is your nervous system asking for rest. On a Sunday, that's completely appropriate. Try organizing your notes (low demand, 20 min) or simply rest. Recovery is productive.", timestamp: "10:10" },
            { role: "user", content: "OK I'll try to just organize my notes then", timestamp: "10:12" },
            { role: "assistant", content: "That's the right call. Set a 20-minute timer and don't push past it. Organizing notes is low cognitive load and can feel satisfying when your brain needs a gentler pace.", timestamp: "10:12" },
          ]}));
        }
        setTasks(demoTasks.map(r => ({ id: r.id, title: r.title, description: r.description, done: r.done, estimatedMinutes: r.estimated_minutes, createdAt: r.created_at, emoji: r.emoji ?? undefined, focusRequired: r.focus_required ?? undefined })));
        setJournal(demoJournal.map(r => ({ id: r.id, text: r.text, time: r.time, date: r.date, focusIndex: r.focus_index, mood: r.mood as Mood[] })));
      } else {
        setTasks(mappedTasks);
        setMedLog(mappedMeds);
        setJournal(mappedJournal);
      }
      setDataLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  // Persist task text-field edits to Supabase when the detail modal closes
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedTaskId;
    if (!prev || !dataLoaded) return;
    const task = tasksRef.current.find(t => t.id === prev);
    if (!task) return;
    supabase.from("tasks").update({
      title: task.title, description: task.description,
      estimated_minutes: task.estimatedMinutes, deadline: task.deadline ?? null,
      focus_required: task.focusRequired ?? null,
    }).eq("id", task.id);
  }, [selectedTaskId, dataLoaded]);

  async function updateTask(id: string, changes: Partial<Task>) {
    setTasks(p => p.map(t => t.id === id ? { ...t, ...changes } : t));
    const db: Record<string, unknown> = {};
    if ("done" in changes) db.done = changes.done;
    if ("emoji" in changes) db.emoji = changes.emoji ?? null;
    if ("deadline" in changes) db.deadline = changes.deadline ?? null;
    if ("focusRequired" in changes) db.focus_required = changes.focusRequired ?? null;
    if (Object.keys(db).length > 0) await supabase.from("tasks").update(db).eq("id", id);
  }

  async function deleteTask(id: string) {
    setTasks(p => p.filter(tk => tk.id !== id));
    setSelectedTaskId(null);
    await supabase.from("tasks").delete().eq("id", id);
  }

  function getMedDelta(med: MedEntry) {
    const idx = med.focusTime
      ? focusHistory.findIndex(p => p.time === med.focusTime)
      : med.sampleIndex;
    if (idx < 0) return null;
    const baseFocus = focusHistory[idx]?.value;
    if (baseFocus == null || focusHistory.length <= idx + 1) return null;
    const windowSamples = Math.round(15 * 60 / refreshRate);
    const endIdx = Math.min(idx + windowSamples, focusHistory.length - 1);
    if (endIdx <= idx) return null;
    const delta = Math.round(focusHistory[endIdx].value - baseFocus);
    const minutes = Math.round((endIdx - idx) * refreshRate / 60);
    return { delta, minutes };
  }

  async function logMed() {
    const name = newMedName.trim();
    if (!name) return;
    const timeStr = newMedTime.trim() || formatTime(new Date());
    const sampleIndex = focusHistory.length - 1;
    const entry: MedEntry = {
      id: Date.now().toString(), name, dose: newMedDose.trim(),
      time: timeStr, date: todayStr(),
      focusTime: focusHistory[sampleIndex]?.time,
      sampleIndex, rating: null,
    };
    setMedLog(prev => [...prev, entry]);
    setNewMedName("");
    setNewMedDose("");
    setNewMedTime("");
    await supabase.from("med_log").insert({
      id: entry.id, user_id: userId, name: entry.name, dose: entry.dose,
      time: entry.time, focus_time: entry.focusTime ?? null, sample_index: entry.sampleIndex, rating: null,
    });
  }

  function startEditMed(med: MedEntry) {
    setEditingMedId(med.id);
    setEditMedName(med.name);
    setEditMedDose(med.dose);
  }

  async function saveMedEdit(id: string) {
    const name = editMedName.trim();
    if (!name) { deleteMed(id); return; }
    const dose = editMedDose.trim();
    setMedLog(prev => prev.map(m => m.id === id ? { ...m, name, dose } : m));
    setEditingMedId(null);
    await supabase.from("med_log").update({ name, dose }).eq("id", id);
  }

  async function deleteMed(id: string) {
    setMedLog(prev => prev.filter(m => m.id !== id));
    setEditingMedId(null);
    await supabase.from("med_log").delete().eq("id", id);
  }

  async function setMedRating(id: string, rating: number) {
    const newRating = medLog.find(m => m.id === id)?.rating === rating ? null : rating;
    setMedLog(prev => prev.map(m => m.id === id ? { ...m, rating: newRating } : m));
    await supabase.from("med_log").update({ rating: newRating }).eq("id", id);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moodDropdownRef.current && !moodDropdownRef.current.contains(e.target as Node)) {
        setMoodDropdownOpen(false);
      }
    }
    if (moodDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moodDropdownOpen]);

  async function addJournalEntry() {
    const text = journalInput.trim();
    if (!text) return;
    const entry: JournalEntry = {
      id: Date.now().toString(), text, time: formatTime(new Date()), date: todayStr(),
      focusIndex: neural.focusIndex, mood: selectedMoods,
      focusTime: focusHistory[focusHistory.length - 1]?.time,
    };
    setJournal(prev => [...prev, entry]);
    setJournalInput("");
    setSelectedMoods([]);
    setMoodDropdownOpen(false);
    await supabase.from("journal_entries").insert({
      id: entry.id, user_id: userId, text: entry.text, time: entry.time,
      date: entry.date, focus_index: entry.focusIndex, mood: entry.mood,
      focus_time: entry.focusTime ?? null,
    });
  }

  function startEditNote(entry: JournalEntry) {
    setEditingNoteId(entry.id);
    setEditNoteText(entry.text);
  }

  async function saveNoteEdit(id: string) {
    const text = editNoteText.trim();
    if (!text) { deleteNote(id); return; }
    setJournal(prev => prev.map(e => e.id === id ? { ...e, text } : e));
    setEditingNoteId(null);
    await supabase.from("journal_entries").update({ text }).eq("id", id);
  }

  async function deleteNote(id: string) {
    setJournal(prev => prev.filter(e => e.id !== id));
    setEditingNoteId(null);
    await supabase.from("journal_entries").delete().eq("id", id);
  }

  function triggerMoodCheck() {
    if (!localStorage.getItem("tokai_mood_consent")) {
      setShowMoodConsent(true);
    } else {
      cameraInputRef.current?.click();
    }
  }

  async function handleImageCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setMoodCheckLoading(true);
    setMoodCheckError(null);
    try {
      const { base64, mimeType } = await compressImage(file);
      setMoodCapturedUrl(`data:image/jpeg;base64,${base64}`);
      const res = await fetch(`${API_BASE}/api/mood-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, userApiKey: localStorage.getItem("tokai_anthropic_key") ?? "" }),
      });
      const text = await res.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text); }
      catch { throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0, 120)}`); }
      if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`);
      if (data.mood) {
        setMoodAssessment(data as unknown as MoodAssessment);
      } else {
        throw new Error("Unexpected response from scan.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed.";
      console.error("Mood check error:", msg);
      setMoodCheckError(lang === "en" ? `Scan failed: ${msg}` : `掃描失敗：${msg}`);
    }
    setMoodCheckLoading(false);
  }

  function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<{ base64: string; mimeType: "image/jpeg" }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image.")); };
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas unavailable.")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.src = url;
    });
  }

  useEffect(() => {
    journalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [journal]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedTaskId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Measure the chart wrapper's pixel width so the scroll container can be set to an explicit px value
  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setChartWrapWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-scroll chart to right edge when live mode is active
  useEffect(() => {
    const el = chartScrollRef.current;
    if (!el || !isLive) return;
    el.scrollLeft = el.scrollWidth;
  }, [focusHistory, isLive, chartWrapWidth]);

  function scrollChart(delta: number) {
    const el = chartScrollRef.current;
    if (!el) return;
    el.scrollLeft += delta;
  }

  function goToLive() {
    const el = chartScrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    setIsLive(true);
  }

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
    const maxSamples = Math.round(30 * 60 / refreshRate);
    setFocusHistory(h => [...h, { time: formatTimeSec(new Date()), value: next.focusIndex }].slice(-maxSamples));
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

  async function addTask(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && newTask.trim()) {
      const title = newTask.trim();
      const description = newTaskDesc.trim() || null;
      const task: Task = {
        id: Date.now().toString(), title, description, done: false,
        estimatedMinutes: newTaskTime ? parseInt(newTaskTime) : null,
        createdAt: formatDateTime(new Date()), deadline: newTaskDeadline || undefined,
        emoji: newTaskEmoji || undefined,
        focusRequired: newTaskFocusRequired ?? estimateFocusRequired(title, description),
      };
      setTasks(prev => [...prev, task]);
      setNewTask(""); setNewTaskDesc("");
      setNewTaskTime(""); setNewTaskDeadline(""); setNewTaskEmoji(""); setNewTaskFocusRequired(null);
      await supabase.from("tasks").insert({
        id: task.id, user_id: userId, title: task.title, description: task.description,
        done: false, estimated_minutes: task.estimatedMinutes,
        created_at: task.createdAt, deadline: task.deadline ?? null, emoji: task.emoji ?? null,
        focus_required: task.focusRequired ?? null,
      });
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
        await supabase.from("tasks").update({ description: data.description }).eq("id", task.id);
      }
    } catch { /* silent */ }
    setGeneratingId(null);
  }

  const visibleTasks = selectedDate === todayStr()
    ? tasks
    : tasks.filter(task => task.createdAt?.startsWith(selectedDate));
  const visibleMedLog = medLog.filter(m => (m.date ?? todayStr()) === selectedDate);
  const visibleCompleted = visibleTasks.filter(t => t.done).length;
  const sessionElapsed = Math.floor((now.getTime() - sessionStart.current.getTime()) / 1000);
  const sessionDuration = `${Math.floor(sessionElapsed / 3600)}:${String(Math.floor((sessionElapsed % 3600) / 60)).padStart(2, "0")}:${String(sessionElapsed % 60).padStart(2, "0")}`;
  const fiveMinSamples = Math.round(5 * 60 / refreshRate);
  const recentSlice = focusHistory.slice(-fiveMinSamples);
  const avgFocus = recentSlice.length > 1
    ? Math.round(recentSlice.reduce((s, p) => s + p.value, 0) / recentSlice.length)
    : null;
  const sessionSlice = focusHistory.slice(sessionStartSampleCount.current);
  const sessionAvg = sessionSlice.length > 1
    ? Math.round(sessionSlice.reduce((s, p) => s + p.value, 0) / sessionSlice.length)
    : null;
  const dayAvg = focusHistory.length > 1
    ? Math.round(focusHistory.reduce((s, p) => s + p.value, 0) / focusHistory.length)
    : null;
  const chartPxPerSample = Math.max(4, Math.round(chartWrapWidth / fiveMinSamples) * 2);
  const chartWidth = Math.max(chartWrapWidth, focusHistory.length * chartPxPerSample);
  const xInterval = Math.max(0, Math.round(60 / refreshRate) - 1);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(135deg, #0c0818 0%, #100a25 50%, #080614 100%)", fontFamily: "'Rajdhani', sans-serif", color: "#c8d8e8" }}>

      {/* ── Sidebar (desktop only) ── */}
      <aside style={{ width: 240, minWidth: 240, padding: "24px 20px", borderRight: "1px solid rgba(192,132,252,0.15)", display: isMobile ? "none" : "flex", flexDirection: "column", gap: 24, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <a href="https://tokai.app" target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none" }}>
          <img src="/tokai_logo.png" alt="Tokai" style={{ width: 120, display: "block", marginBottom: 6 }} />
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, color: "#5a8fa8", letterSpacing: 2, textAlign: "center" }}>{t.version}</div>
        </a>

        <div>
          <SectionLabel>{t.systemControl}</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 16, color: "#c8d8e8" }}>{t.liveStream}</span>
            <Toggle checked={liveStream} onChange={setLiveStream} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 14, color: "#5a8fa8" }}>{t.refreshRate}</span>
              <span style={{ fontSize: 13, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace" }}>{refreshRate}</span>
            </div>
            <input type="range" min={1} max={10} value={refreshRate}
              onChange={e => setRefreshRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#c084fc", cursor: "pointer" }} />
          </div>
          <button onClick={tick} style={{ width: "100%", padding: "7px 0", background: "transparent", border: "1px solid rgba(192,132,252,0.4)", color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, cursor: "pointer", letterSpacing: 1, borderRadius: 4 }}>
            {t.manualRefresh}
          </button>
        </div>

        <div>
          <SectionLabel>{t.sessionInfo}</SectionLabel>
          <table style={{ width: "100%", fontSize: 15, borderCollapse: "collapse" }}>
            <tbody>
              {([
                [t.date, now.toISOString().slice(0, 10)],
                [t.time, formatTime(now)],
                [t.sessionLabel, sessionDuration],
                [t.samples, String(samples)],
                [t.status, liveStream ? t.active : t.paused],
              ] as [string, string][]).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: "#5a8fa8", paddingRight: 8, paddingBottom: 6, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>{k}</td>
                  <td style={{ color: k === t.status ? (liveStream ? "#c084fc" : "#ffa040") : "#c8d8e8", fontFamily: "'Share Tech Mono', monospace" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pomodoro Timer */}
        <div>
          <SectionLabel>{t.pomodoro}</SectionLabel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 2, color: pomodoroPhase === "work" ? "#c084fc" : "#6ee7b7" }}>
              {pomodoroPhase === "work" ? t.pomoFocus : pomodoroCount % 4 === 0 ? t.pomoLongBreak : t.pomoBreak}
            </span>
            <div style={{ display: "flex", gap: 5 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < (pomodoroCount % 4) ? "#c084fc" : "rgba(192,132,252,0.2)", transition: "background 0.3s" }} />
              ))}
            </div>
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 26, color: "#c8d8e8", textAlign: "center", letterSpacing: 5, marginBottom: 10, textShadow: pomodoroRunning ? "0 0 16px rgba(192,132,252,0.4)" : "none", transition: "text-shadow 0.3s" }}>
            {String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, "0")}:{String(pomodoroTimeLeft % 60).padStart(2, "0")}
          </div>
          {!pomodoroRunning && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1 }}>{t.pomoWorkLabel}</span>
              <input type="number" min={1} max={90} value={pomodoroWorkMins}
                onChange={e => { const v = Math.max(1, Math.min(90, parseInt(e.target.value) || 1)); setPomodoroWorkMins(v); if (pomodoroPhase === "work") setPomodoroTimeLeft(v * 60); }}
                style={{ width: 42, padding: "2px 5px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, outline: "none", textAlign: "center" }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1 }}>{t.pomoBreakLabel}</span>
              <input type="number" min={1} max={30} value={pomodoroBreakMins}
                onChange={e => { const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1)); setPomodoroBreakMins(v); if (pomodoroPhase === "break") setPomodoroTimeLeft(v * 60); }}
                style={{ width: 36, padding: "2px 5px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#6ee7b7", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, outline: "none", textAlign: "center" }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "rgba(90,143,168,0.5)" }}>min</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPomodoroRunning(r => !r)}
              style={{ flex: 1, padding: "7px 0", background: pomodoroRunning ? "rgba(192,132,252,0.12)" : "rgba(192,132,252,0.18)", border: "1px solid rgba(192,132,252,0.5)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1, cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(192,132,252,0.28)")}
              onMouseLeave={e => (e.currentTarget.style.background = pomodoroRunning ? "rgba(192,132,252,0.12)" : "rgba(192,132,252,0.18)")}>
              {pomodoroRunning ? t.pomoPause : t.pomoStart}
            </button>
            <button
              onClick={() => { setPomodoroRunning(false); setPomodoroPhase("work"); pomodoroPhaseRef.current = "work"; setPomodoroTimeLeft(pomodoroWorkMins * 60); setPomodoroCount(0); pomodoroCountRef.current = 0; }}
              style={{ padding: "7px 12px", background: "transparent", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(192,132,252,0.5)"; e.currentTarget.style.color = "#c084fc"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(192,132,252,0.25)"; e.currentTarget.style.color = "#5a8fa8"; }}>
              ↺
            </button>
          </div>
        </div>

        <div>
          <SectionLabel>{t.aboutTokai}</SectionLabel>
          <p style={{ fontSize: 15, color: "#5a8fa8", lineHeight: 1.6, margin: "0 0 12px 0" }}>{t.aboutText}</p>
          <a href="https://github.com/TokaiApp/Tokai-Pre-Alpha" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#5a8fa8", textDecoration: "none", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#c084fc")}
            onMouseLeave={e => (e.currentTarget.style.color = "#5a8fa8")}>
            <Github size={20} />{t.sourceCode}
          </a>
          <div style={{ marginTop: 10, fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "rgba(90,143,168,0.5)", letterSpacing: 0.5 }}>
            {t.developedBy}:{" "}
            <a href="https://austinhua.com" target="_blank" rel="noopener noreferrer"
              style={{ color: "rgba(90,143,168,0.5)", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#c084fc")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(90,143,168,0.5)")}>
              Austin Hua
            </a>
          </div>
        </div>

      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 8 }}>
          <img src="/tok-en.png" alt="TokEn" style={{ width: 34, height: 34, flexShrink: 0 }} />
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, letterSpacing: 2 }}>
            <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>ENS</span>
            <span style={{ color: "#c084fc" }}>: {tokEn}</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "rgba(90,143,168,0.5)", letterSpacing: 0.5, wordBreak: "break-all" }}>
          {session.user.email}
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ width: "100%", padding: "10px 0", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#f87171", letterSpacing: 2, cursor: "pointer", transition: "background 0.2s, border-color 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.15)"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(248,113,113,0.07)"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; }}>
          {t.signOut}
        </button>
      </div>

      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ borderBottom: "1px solid rgba(192,132,252,0.15)", background: "rgba(12,8,24,0.97)", position: "sticky", top: 0, zIndex: 20 }}>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            <div style={{ padding: "6px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <img src="/tok-en.png" alt="TokEn" style={{ width: 24, height: 24, flexShrink: 0 }} />
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 2 }}>
                    <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>ENS</span>
                    <span style={{ color: "#c084fc" }}>: {tokEn}</span>
                  </div>
                </div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(90,143,168,0.5)", letterSpacing: 0.5 }}>
                  {session.user.email}
                </div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.4)", letterSpacing: 0.5 }}>
                  {t.developedBy}{" "}
                  <a href="https://austinhua.com" target="_blank" rel="noopener noreferrer"
                    style={{ color: "rgba(90,143,168,0.4)", textDecoration: "none" }}>
                    Austin Hua
                  </a>
                </div>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                style={{ padding: "6px 14px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#f87171", letterSpacing: 1, cursor: "pointer", flexShrink: 0 }}>
                {t.signOut}
              </button>
            </div>
          </div>
        )}

        {/* Content area */}
        <div style={{ padding: isMobile ? "16px" : "24px 28px", display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>

          {/* Desktop header */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h1 style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 52, fontWeight: 700, letterSpacing: 14, textShadow: "0 0 30px rgba(192,132,252,0.4), 0 0 60px rgba(192,132,252,0.15)", margin: 0 }}>
                <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>AI</span>
              </h1>
              <LangToggle lang={lang} setLang={setLang} />
            </div>
          )}

          {/* Metric cards — 2 cols on mobile, 5 on desktop */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: isMobile ? 10 : 14 }}>
            <MetricCard title={t.focusIndex} icon={<Crosshair size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].focusIndex)}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                {neural.focusIndex.toFixed(1)}<span style={{ fontSize: 16, color: "#5a8fa8" }}>/100</span>
              </div>
              <Badge color={focusInfo.color}>{focusInfo.label}</Badge>
            </MetricCard>

            <MetricCard title={t.bioEnergy} icon={<Zap size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].bioEnergy)}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                {Math.round(neural.bioEnergy)}<span style={{ fontSize: 16, color: "#5a8fa8" }}>%</span>
              </div>
              <div style={{ height: 4, background: "rgba(192,132,252,0.1)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${neural.bioEnergy}%`, background: "linear-gradient(90deg, #c084fc, #7c3aed)", borderRadius: 2, transition: "width 0.5s ease" }} />
              </div>
            </MetricCard>

            <MetricCard title={t.neuralNoise} icon={<Waves size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].neuralNoise)}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                {Math.round(neural.neuralNoise)}<span style={{ fontSize: 14, color: "#5a8fa8" }}> μV²</span>
              </div>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: noiseInfo.color, letterSpacing: 2 }}>{noiseInfo.label}</span>
            </MetricCard>

            <MetricCard title={t.tbRatio} icon={<BarChart2 size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].tbRatio)}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>{neural.tbRatio}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge color={tbrInfo.color}>{tbrInfo.label}</Badge>
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1, marginTop: 6 }}>
                θ:{neural.theta.toFixed(1)}  β:{neural.beta.toFixed(1)}
              </div>
            </MetricCard>

            <MetricCard title={t.focusWindow} icon={<Clock size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].focusWindow)}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8, lineHeight: 1.2 }}>
                {focusHistory.length < 6 ? t.collectingData : `~${Math.max(3, Math.round((80 - neural.focusIndex) / 2))} min`}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1 }}>
                {focusHistory.length < 6 ? t.streamMoreSamples : `${t.confidence} ${Math.min(99, Math.round(50 + samples * 1.2))}%`}
              </div>
            </MetricCard>

          </div>

          {/* Focus stream — full width */}
          <div style={{ minWidth: 0 }}>
            <Panel
              onInfo={() => setInfoModal(INFO[lang].focusStream)}
              title={
                <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Activity size={14} color="#c084fc" /><span>{t.focusStream}</span></span>
                  {avgFocus !== null && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, color: "rgba(192,132,252,0.8)", letterSpacing: 1, fontWeight: 400 }}>{lang === "en" ? "5m avg" : "5分均值"} {avgFocus}</span>}
                  {sessionAvg !== null && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, color: "rgba(56,189,248,0.85)", letterSpacing: 1, fontWeight: 400 }}>{lang === "en" ? "session avg" : "階段均值"} {sessionAvg}</span>}
                  {dayAvg !== null && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, color: "rgba(74,222,128,0.85)", letterSpacing: 1, fontWeight: 400 }}>{lang === "en" ? "day avg" : "日均值"} {dayAvg}</span>}
                </span>
              }
            >
              <div ref={chartWrapRef} style={{ width: "100%", position: "relative" }}>
                <div ref={chartScrollRef} style={{ width: chartWrapWidth, height: 168, overflowX: "scroll", overflowY: "hidden" }}
                  onScroll={e => {
                    const el = e.currentTarget;
                    const atRight = el.scrollWidth - el.scrollLeft - el.clientWidth < 80;
                    if (!atRight) setIsLive(false);
                  }}>
                  <div style={{ width: chartWidth, height: 168, position: "relative" }}>
                    <LineChart width={chartWidth} height={168} data={focusHistory} margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
                      <XAxis dataKey="time" tickFormatter={(v: string) => v.slice(0, 5)} tick={{ fill: "#5a8fa8", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} interval={xInterval} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#5a8fa8", fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }} axisLine={false} tickLine={false} ticks={[0, 20, 40, 60, 80, 100]} width={32} />
                      <ReferenceLine y={60} stroke="rgba(255,80,80,0.35)" strokeDasharray="4 4" />
                      {avgFocus !== null && <ReferenceLine y={avgFocus} stroke="rgba(192,132,252,0.55)" strokeDasharray="6 3" />}
                      {sessionAvg !== null && <ReferenceLine y={sessionAvg} stroke="rgba(56,189,248,0.5)" strokeDasharray="6 3" />}
                      {dayAvg !== null && dayAvg !== sessionAvg && <ReferenceLine y={dayAvg} stroke="rgba(74,222,128,0.5)" strokeDasharray="6 3" />}
                      <Line type="monotone" dataKey="value" stroke="#c084fc" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                    {(() => {
                      const N = focusHistory.length;
                      const plotLeft = 32, plotRight = chartWidth - 16;
                      const getX = (idx: number) => N <= 1 ? plotLeft : plotLeft + idx * (plotRight - plotLeft) / (N - 1);
                      const findIdx = (key: string) => focusHistory.findIndex(p =>
                        p.time === key || (key.length === 5 && p.time.startsWith(key + ":"))
                      );
                      return (
                        <>
                          {medLog.map(med => {
                            const idx = findIdx(med.focusTime || med.time);
                            if (idx < 0) return null;
                            const x = getX(idx);
                            return (
                              <div key={med.id} style={{ position: "absolute", left: x, top: 8, height: 142, width: 0, borderLeft: "1.5px dashed rgba(251,191,36,0.9)", pointerEvents: "none" }}>
                                <span style={{ position: "absolute", top: 2, left: 3, fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#fbbf24", whiteSpace: "nowrap", background: "rgba(12,8,24,0.75)", padding: "0 2px" }}>
                                  {med.name.length > 10 ? med.name.slice(0, 10) + "…" : med.name}
                                </span>
                              </div>
                            );
                          })}
                          {journal.filter(e => (e.date ?? todayStr()) === todayStr()).map(entry => {
                            const idx = findIdx(entry.focusTime || entry.time);
                            if (idx < 0) return null;
                            const x = getX(idx);
                            return (
                              <div key={"note_" + entry.id} style={{ position: "absolute", left: x, top: 8, height: 142, width: 0, borderLeft: "1.5px dashed rgba(100,220,180,0.75)", pointerEvents: "none" }}>
                                <span style={{ position: "absolute", top: 2, right: 3, fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#6ee7b7", whiteSpace: "nowrap" }}>✎</span>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ position: "absolute", right: 4, top: 8, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc", pointerEvents: "none" }}>
                  {neural.focusIndex.toFixed(1)}
                </div>
                {/* Scroll controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
                  {[
                    { label: "◀◀", delta: -999999, title: "Scroll to start" },
                    { label: "◀", delta: -200, title: "Scroll left" },
                    { label: "▶", delta: 200, title: "Scroll right" },
                  ].map(({ label, delta, title }) => (
                    <button key={label} onClick={() => scrollChart(delta)} title={title}
                      style={{ padding: "5px 14px", background: "rgba(192,132,252,0.07)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 4, color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 14, cursor: "pointer", lineHeight: 1.6 }}>
                      {label}
                    </button>
                  ))}
                  <button onClick={goToLive} title="Jump to live"
                    style={{ padding: "5px 14px", background: isLive ? "rgba(192,132,252,0.2)" : "rgba(192,132,252,0.07)", border: `1px solid ${isLive ? "rgba(192,132,252,0.7)" : "rgba(192,132,252,0.25)"}`, borderRadius: 4, color: isLive ? "#c084fc" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 14, cursor: "pointer", letterSpacing: 1, lineHeight: 1.6, transition: "all 0.2s" }}>
                    ▶▶ LIVE
                  </button>
                </div>
              </div>
            </Panel>
          </div>

          {/* Day selector — mobile only; desktop version lives in right panel header */}
          {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 2, flexShrink: 0 }}>{t.viewing}</span>
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ padding: "5px 14px", background: "#120d28", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", outline: "none", colorScheme: "dark" }}
            >
              {availableDates.map(date => (
                <option key={date} value={date}>{formatDayLabel(date, lang)}</option>
              ))}
            </select>
          </div>
          )}

          {/* TokNote · TokMed */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(192,132,252,0.07)", display: "flex", flexDirection: "column", height: 480 }}>
            {/* Header */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(192,132,252,0.15)", display: "flex", alignItems: "center", gap: 10, background: "rgba(192,132,252,0.03)", flexShrink: 0 }}>
              <BookOpen size={16} color="#c084fc" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, flex: 1 }}>
                <span style={{ color: "#7c3aed" }}>TOK</span>
                <span style={{ color: "#c084fc" }}>{lang === "en" ? "NOTE · JOURNAL" : "NOTE · 日誌"}</span>
              </span>
              <InfoButton onClick={() => setInfoModal(INFO[lang].tokNote)} />
            </div>
            {/* Neural Insight — pinned, always visible */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(192,132,252,0.1)", background: "rgba(192,132,252,0.02)", flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Brain size={14} color="rgba(192,132,252,0.5)" style={{ flexShrink: 0, marginTop: 3 }} />
              <p style={{ margin: 0, fontSize: 15, color: "rgba(200,216,232,0.7)", lineHeight: 1.6, fontStyle: "italic", fontFamily: "'Rajdhani', sans-serif" }}>
                "{getInsight()}"
              </p>
            </div>
            {/* Mood assessment result banner */}
            {moodAssessment && (
              <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(192,132,252,0.1)", background: "rgba(192,132,252,0.04)", flexShrink: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {moodCapturedUrl && (
                  <img src={moodCapturedUrl} alt="Mood scan" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(192,132,252,0.3)", flexShrink: 0 }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {([
                      { k: lang === "en" ? "MOOD" : "情緒", v: moodAssessment.mood, colors: { positive: "#4ade80", neutral: "#c084fc", low: "#f472b6" } as Record<string, string> },
                      { k: lang === "en" ? "ENERGY" : "能量", v: moodAssessment.energy, colors: { high: "#4ade80", moderate: "#ffa040", low: "#f472b6" } as Record<string, string> },
                      { k: lang === "en" ? "STRESS" : "壓力", v: moodAssessment.stress, colors: { calm: "#4ade80", mild: "#ffa040", elevated: "#f472b6" } as Record<string, string> },
                    ] as { k: string; v: string; colors: Record<string, string> }[]).map(({ k, v, colors }) => (
                      <span key={k} style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, padding: "1px 7px", border: `1px solid ${colors[v] ?? "#c084fc"}`, color: colors[v] ?? "#c084fc", borderRadius: 3, letterSpacing: 1, whiteSpace: "nowrap" }}>
                        {k}: {v.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(200,216,232,0.7)", fontFamily: "'Rajdhani', sans-serif", fontStyle: "italic" }}>{moodAssessment.suggestion}</span>
                </div>
                <button onClick={() => { setMoodAssessment(null); setMoodCapturedUrl(null); }} style={{ background: "none", border: "none", color: "rgba(90,143,168,0.5)", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            )}
            {/* Entries */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {(() => {
                  const filtered = journal.filter(e => (e.date ?? todayStr()) === selectedDate);
                  if (filtered.length === 0) return (
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(90,143,168,0.6)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: 0.5, lineHeight: 1.5 }}>
                      {selectedDate === todayStr() ? t.noteEmpty : (lang === "en" ? "No entries for this day." : "此日無日誌條目。")}
                    </p>
                  );
                  return filtered.map(entry => editingNoteId === entry.id ? (
                    <div key={entry.id} style={{ padding: "8px 12px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.35)", borderRadius: 8 }}>
                      <textarea
                        autoFocus
                        value={editNoteText}
                        onChange={e => setEditNoteText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNoteEdit(entry.id); } if (e.key === "Escape") setEditingNoteId(null); }}
                        style={{ width: "100%", minHeight: 60, padding: "4px 0", background: "transparent", border: "none", borderBottom: "1px solid rgba(192,132,252,0.4)", color: "#d0e8f8", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, outline: "none", resize: "none", boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button onClick={() => saveNoteEdit(entry.id)} style={{ background: "none", border: "none", color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, cursor: "pointer", padding: 0, letterSpacing: 1 }}>SAVE</button>
                        <button onClick={() => deleteNote(entry.id)} style={{ background: "none", border: "none", color: "rgba(255,100,100,0.7)", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, cursor: "pointer", padding: 0, letterSpacing: 1 }}>DELETE</button>
                        <button onClick={() => setEditingNoteId(null)} style={{ background: "none", border: "none", color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, cursor: "pointer", padding: 0, letterSpacing: 1 }}>CANCEL</button>
                      </div>
                    </div>
                  ) : (
                    <div key={entry.id} onClick={() => startEditNote(entry)} style={{ padding: "8px 12px", background: "rgba(192,132,252,0.04)", border: "1px solid rgba(192,132,252,0.14)", borderRadius: 8, cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(192,132,252,0.35)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(192,132,252,0.14)")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#5a8fa8" }}>{entry.date ? `${entry.date} ${entry.time}` : entry.time}</span>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc" }}>{t.noteFocusLabel} {entry.focusIndex.toFixed(1)}</span>
                        {(() => {
                          const moodMap: Record<string, string> = { hyperfocus: t.moodHyperfocus, flow: t.moodFlow, focused: t.moodFocused, restless: t.moodRestless, scattered: t.moodScattered, anxious: t.moodAnxious, fatigued: t.moodFatigued, "zoned-out": t.moodZonedOut, crashed: t.moodCrashed, low: t.moodLow };
                          const moods = Array.isArray(entry.mood) ? entry.mood : (entry.mood ? [entry.mood as string] : []);
                          return moods.map(m => (
                            <span key={m} style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, padding: "1px 6px", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 3, color: "#c084fc", letterSpacing: 1 }}>
                              {moodMap[m] ?? m}
                            </span>
                          ));
                        })()}
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(192,132,252,0.3)", marginLeft: "auto" }}>✎</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 16, color: "#c8d8e8", fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.5 }}>{entry.text}</p>
                    </div>
                  ))
                })()}
                <div ref={journalBottomRef} />
              </div>
              {/* Input + mood tags (today only) */}
              {selectedDate !== todayStr() ? (
                <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(192,132,252,0.1)", background: "rgba(0,0,0,0.15)", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "rgba(90,143,168,0.5)", letterSpacing: 1, flexShrink: 0 }}>
                  {t.pastDayReadOnly}
                </div>
              ) : (
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(192,132,252,0.15)", display: "flex", gap: 8, alignItems: "center", background: "rgba(0,0,0,0.15)", flexShrink: 0 }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  ref={cameraInputRef}
                  onChange={handleImageCapture}
                  style={{ display: "none" }}
                />
                <input
                  value={journalInput}
                  onChange={e => setJournalInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addJournalEntry()}
                  placeholder={t.notePlaceholder}
                  style={{ flex: 1, padding: "8px 12px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, outline: "none", transition: "border-color 0.2s", minWidth: 0 }}
                  onFocus={e => (e.target.style.borderColor = "rgba(192,132,252,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(192,132,252,0.2)")}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={triggerMoodCheck}
                    disabled={moodCheckLoading}
                    title={lang === "en" ? "Mood scan (photo)" : "情緒掃描（拍照）"}
                    style={{ padding: "8px 10px", background: moodAssessment ? "rgba(192,132,252,0.15)" : moodCheckError ? "rgba(248,113,113,0.08)" : "rgba(192,132,252,0.05)", border: `1px solid ${moodCheckError ? "rgba(248,113,113,0.4)" : moodAssessment ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.2)"}`, borderRadius: 6, color: moodCheckError ? "#f87171" : moodAssessment ? "#c084fc" : "#5a8fa8", cursor: moodCheckLoading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { if (!moodCheckLoading && !moodCheckError) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,132,252,0.5)"; (e.currentTarget as HTMLButtonElement).style.color = "#c084fc"; } }}
                    onMouseLeave={e => { if (!moodAssessment && !moodCheckError) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,132,252,0.2)"; (e.currentTarget as HTMLButtonElement).style.color = "#5a8fa8"; } }}
                  >
                    {moodCheckLoading ? <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, letterSpacing: 1 }}>...</span> : <Camera size={14} />}
                  </button>
                  {moodCheckError && (
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#f87171", letterSpacing: 0.3, maxWidth: 80, textAlign: "center", lineHeight: 1.3, cursor: "pointer" }} onClick={() => setMoodCheckError(null)}>
                      {moodCheckError}
                    </span>
                  )}
                </div>
                <div ref={moodDropdownRef} style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    onClick={() => setMoodDropdownOpen(o => !o)}
                    style={{ padding: "8px 12px", background: moodDropdownOpen ? "rgba(192,132,252,0.15)" : "rgba(192,132,252,0.06)", border: `1px solid ${moodDropdownOpen ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.25)"}`, borderRadius: 6, color: selectedMoods.length ? "#c084fc" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 14, cursor: "pointer", letterSpacing: 1, whiteSpace: "nowrap", transition: "all 0.15s" }}
                  >
                    {selectedMoods.length === 0 ? (lang === "zh" ? "專注 (自評) ▾" : "FOCUS (SELF-REPORT) ▾") : `${selectedMoods.length} SELECTED ▾`}
                  </button>
                  {moodDropdownOpen && (
                    <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: "#120d28", border: "1px solid rgba(192,132,252,0.35)", borderRadius: 8, padding: "6px 0", zIndex: 50, minWidth: 200, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
                      {(["hyperfocus", "flow", "focused", "restless", "scattered", "anxious", "fatigued", "zoned-out", "crashed", "low"] as Mood[]).map(m => {
                        const label: Record<string, string> = { hyperfocus: t.moodHyperfocus, flow: t.moodFlow, focused: t.moodFocused, restless: t.moodRestless, scattered: t.moodScattered, anxious: t.moodAnxious, fatigued: t.moodFatigued, "zoned-out": t.moodZonedOut, crashed: t.moodCrashed, low: t.moodLow };
                        const active = selectedMoods.includes(m);
                        return (
                          <div key={m} onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 16px", cursor: "pointer", background: active ? "rgba(192,132,252,0.1)" : "transparent", transition: "background 0.1s" }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "rgba(192,132,252,0.05)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = active ? "rgba(192,132,252,0.1)" : "transparent"; }}
                          >
                            <div style={{ width: 14, height: 14, border: `1px solid ${active ? "#c084fc" : "rgba(192,132,252,0.35)"}`, borderRadius: 3, background: active ? "rgba(192,132,252,0.25)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {active && <div style={{ width: 8, height: 8, background: "#c084fc", borderRadius: 1 }} />}
                            </div>
                            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: active ? "#c084fc" : "#d0e8f8", letterSpacing: 0.5 }}>{label[m]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={addJournalEntry}
                  disabled={!journalInput.trim()}
                  style={{ padding: "8px 14px", background: journalInput.trim() ? "rgba(192,132,252,0.15)" : "rgba(192,132,252,0.05)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1, cursor: journalInput.trim() ? "pointer" : "not-allowed", transition: "background 0.2s", flexShrink: 0, alignSelf: "stretch" }}
                >
                  LOG
                </button>
              </div>
              )}
            </div>

          {/* TokMed panel */}
          <div style={{ background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(251,191,36,0.05)", display: "flex", flexDirection: "column", height: 480 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(251,191,36,0.15)", display: "flex", alignItems: "center", gap: 10, background: "rgba(251,191,36,0.02)", flexShrink: 0 }}>
              <Pill size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, flex: 1 }}>
                <span style={{ color: "#b45309" }}>TOK</span>
                <span style={{ color: "#fbbf24" }}>{lang === "en" ? "MED · LOG" : "MED · 紀錄"}</span>
              </span>
              <InfoButton onClick={() => setInfoModal(INFO[lang].tokMed)} />
            </div>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(251,191,36,0.1)", flexShrink: 0 }}>
              {selectedDate === todayStr() ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input value={newMedName} onChange={e => setNewMedName(e.target.value)} onKeyDown={e => e.key === "Enter" && logMed()} placeholder={t.medNamePlaceholder}
                    style={{ width: "100%", padding: "7px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(251,191,36,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(251,191,36,0.2)")} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newMedDose} onChange={e => setNewMedDose(e.target.value)} onKeyDown={e => e.key === "Enter" && logMed()} placeholder={t.medDosePlaceholder}
                      style={{ flex: 1, padding: "7px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, outline: "none", minWidth: 0 }}
                      onFocus={e => (e.target.style.borderColor = "rgba(251,191,36,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(251,191,36,0.2)")} />
                    <input type="time" value={newMedTime} onChange={e => setNewMedTime(e.target.value)}
                      style={{ width: 88, padding: "7px 8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, color: newMedTime ? "#fbbf24" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, outline: "none", colorScheme: "dark", flexShrink: 0 }}
                      onFocus={e => (e.target.style.borderColor = "rgba(251,191,36,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(251,191,36,0.2)")} />
                    <button onClick={logMed} disabled={!newMedName.trim()}
                      style={{ padding: "7px 16px", background: newMedName.trim() ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 6, color: "#fbbf24", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1, cursor: newMedName.trim() ? "pointer" : "not-allowed", flexShrink: 0 }}>
                      {t.medLogBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "4px 0", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "rgba(251,191,36,0.4)", letterSpacing: 1 }}>
                  {t.pastDayReadOnly}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleMedLog.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: "rgba(90,143,168,0.6)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: 0.5, lineHeight: 1.5 }}>
                  {selectedDate === todayStr() ? t.medEmpty : (lang === "en" ? "No entries for this day." : "此日無紀錄。")}
                </p>
              ) : visibleMedLog.map(med => selectedDate === todayStr() && editingMedId === med.id ? (
                <div key={med.id} style={{ padding: "8px 12px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <input autoFocus value={editMedName} onChange={e => setEditMedName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveMedEdit(med.id); if (e.key === "Escape") setEditingMedId(null); }}
                    style={{ flex: 1, padding: "2px 6px", background: "transparent", border: "none", borderBottom: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none", minWidth: 0 }} />
                  <button onClick={() => saveMedEdit(med.id)} style={{ background: "none", border: "none", color: "#fbbf24", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, cursor: "pointer", padding: 0, flexShrink: 0 }}>OK</button>
                  <button onClick={() => deleteMed(med.id)} style={{ background: "none", border: "none", color: "rgba(255,100,100,0.7)", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, cursor: "pointer", padding: 0, flexShrink: 0 }}>✕</button>
                </div>
              ) : (
                <div key={med.id} style={{ padding: "8px 12px", background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.14)", borderRadius: 8, cursor: selectedDate === todayStr() ? "pointer" : "default", transition: "border-color 0.15s" }}
                  onClick={() => selectedDate === todayStr() && startEditMed(med)}
                  onMouseEnter={e => { if (selectedDate === todayStr()) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(251,191,36,0.35)"; }}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(251,191,36,0.14)"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", flexShrink: 0 }}>{med.time}</span>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, color: "#fbbf24", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{med.name}{med.dose ? ` · ${med.dose}` : ""}</span>
                    {selectedDate === todayStr() && (
                      <button onClick={e => { e.stopPropagation(); deleteMed(med.id); }} style={{ background: "none", border: "none", color: "rgba(255,100,100,0.4)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                  {(() => { const delta = getMedDelta(med); return delta ? (
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: delta.delta > 0 ? "#4ade80" : delta.delta < 0 ? "#f472b6" : "#5a8fa8", letterSpacing: 0.5, marginTop: 3 }}>
                      {delta.delta > 0 ? "+" : ""}{delta.delta} focus in {delta.minutes}m
                    </div>
                  ) : null; })()}
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* TokAgent */}
          <AgentChat
            key={selectedDate}
            selectedDate={selectedDate}
            neuralState={neural}
            tasks={tasks.map(tk => ({ id: tk.id, title: tk.title, description: tk.description, done: tk.done, estimatedMinutes: tk.estimatedMinutes, createdAt: tk.createdAt, deadline: tk.deadline, emoji: tk.emoji, focusRequired: tk.focusRequired }))}
            journalEntries={journal.map(e => ({ text: e.text, time: e.time, date: e.date, focusIndex: e.focusIndex, mood: e.mood }))}
            medLog={medLog.map(m => ({ id: m.id, name: m.name, dose: m.dose, time: m.time }))}
            lang={lang}
            isMobile={isMobile}
            onInfo={() => setInfoModal(INFO[lang].tokAgent)}
            moodAssessment={moodAssessment ?? undefined}
          />

          {/* TokTodo — mobile only; desktop version lives in right panel */}
          {isMobile && (
          <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, padding: 16, boxShadow: "0 0 24px rgba(192,132,252,0.07)", minHeight: 360, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <ListChecks size={16} color="#c084fc" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, flex: 1 }}>
                    {lang === "en"
                      ? <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>TODO · CHECKLIST</span></>
                      : <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>TODO · {t.tokTodo}</span></>}
                  </span>
                  <InfoButton onClick={() => setInfoModal(INFO[lang].tokTodo)} />
                </div>
                {selectedDate === todayStr() ? (<>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={addTask} placeholder={t.taskPlaceholder}
                  style={{ width: "100%", padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: "4px 4px 0 0", color: "#c8d8e8", fontFamily: "'Rajdhani', sans-serif", fontSize: 16, boxSizing: "border-box", outline: "none" }} />
                <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder={t.descPlaceholder}
                  style={{ width: "100%", padding: "5px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(192,132,252,0.2)", borderTop: "none", borderRadius: "0 0 4px 4px", color: "#7a9ab8", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, marginBottom: 8, boxSizing: "border-box", outline: "none", fontStyle: "italic" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                  {TASK_EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewTaskEmoji(newTaskEmoji === e ? "" : e)}
                      style={{ fontSize: 18, lineHeight: 1, padding: "3px 5px", background: newTaskEmoji === e ? "rgba(192,132,252,0.2)" : "transparent", border: `1px solid ${newTaskEmoji === e ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.12)"}`, borderRadius: 4, cursor: "pointer", transition: "all 0.12s" }}>{e}</button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 1 }}>{t.estTime}:</span>
                    <input type="number" min={1} max={480} value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} placeholder="—"
                      style={{ width: 52, padding: "3px 6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c8d8e8", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none", textAlign: "center" }} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8" }}>{t.minUnit}</span>
                  </div>
                </div>
                </>) : (
                <div style={{ padding: "8px 12px", marginBottom: 10, border: "1px solid rgba(192,132,252,0.12)", borderRadius: 4, fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "rgba(90,143,168,0.5)", letterSpacing: 1 }}>
                  {t.pastDayReadOnly}
                </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                  {visibleTasks.map(task => (
                    <div key={task.id} onClick={() => setSelectedTaskId(task.id)}
                      style={{ display: "flex", flexDirection: "column", padding: "8px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 4, border: "1px solid rgba(192,132,252,0.1)", gap: 5, minWidth: 0, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.35)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(192,132,252,0.05)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.1)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.2)"; }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
                        <div onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={task.done} onChange={() => updateTask(task.id, { done: !task.done })} style={{ accentColor: "#c084fc", cursor: "pointer", flexShrink: 0, marginTop: 3 }} />
                        </div>
                        {task.emoji && <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1, opacity: task.done ? 0.5 : 1 }}>{task.emoji}</span>}
                        <span style={{ flex: 1, fontSize: 17, fontWeight: 600, color: task.done ? "#5a8fa8" : "#c8d8e8", textDecoration: task.done ? "line-through" : "none", minWidth: 0, wordBreak: "break-word" }}>{task.title}</span>
                        {task.estimatedMinutes && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", flexShrink: 0 }}>{task.estimatedMinutes}{t.minUnit}</span>}
                      </div>
                      {task.description && <p style={{ margin: 0, marginLeft: 22, fontSize: 14, color: "#5a8fa8", lineHeight: 1.5, fontStyle: "italic", fontFamily: "'Rajdhani', sans-serif", wordBreak: "break-word" }}>{task.description}</p>}
                      {task.deadline && <span style={{ marginLeft: 22, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(251,191,36,0.7)", letterSpacing: 1 }}>{t.dueLabel} {task.deadline}</span>}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "#5a8fa8", letterSpacing: 1 }}>
                  {t.progress} {visibleCompleted}/{visibleTasks.length} {visibleCompleted > 0 && visibleCompleted === visibleTasks.length ? t.complete : ""}
                </div>
          </div>
          )}

          {/* Mobile footer with session info + links */}
          {isMobile && (
            <div style={{ borderTop: "1px solid rgba(192,132,252,0.15)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8" }}>
                <span>{t.samples} {samples}</span>
                <span>{t.status}: {liveStream ? <span style={{ color: "#c084fc" }}>{t.active}</span> : <span style={{ color: "#ffa040" }}>{t.paused}</span>}</span>
              </div>
              <a href="https://github.com/TokaiApp/Tokai-Pre-Alpha" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#5a8fa8", textDecoration: "none", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1 }}>
                <Github size={16} />{t.sourceCode}
              </a>
            </div>
          )}

        </div>
      </main>

      {/* ── TokTodo right panel (desktop only) ── */}
      {!isMobile && (
        <aside style={{ width: 340, minWidth: 340, borderLeft: "1px solid rgba(192,132,252,0.15)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", background: "linear-gradient(180deg, #0c0818 0%, #0e0920 100%)" }}>
          {/* Header */}
          <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid rgba(192,132,252,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <ListChecks size={18} color="#c084fc" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, flex: 1 }}>
                {lang === "en"
                  ? <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>TODO</span></>
                  : <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>TODO · {t.tokTodo}</span></>}
              </span>
              <InfoButton onClick={() => setInfoModal(INFO[lang].tokTodo)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 2, flexShrink: 0 }}>{t.viewing}</span>
              <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                style={{ flex: 1, padding: "5px 10px", background: "#120d28", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", outline: "none", colorScheme: "dark" }}>
                {availableDates.map(date => (
                  <option key={date} value={date}>{formatDayLabel(date, lang)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Best task now */}
          <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(192,132,252,0.1)" }}>
            <button onClick={fetchBestTask} disabled={bestTaskLoading || tasks.filter(t => !t.done).length === 0}
              style={{ width: "100%", padding: "8px 0", background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1, cursor: bestTaskLoading ? "default" : "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => { if (!bestTaskLoading) e.currentTarget.style.background = "rgba(192,132,252,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(192,132,252,0.1)"; }}>
              {bestTaskLoading ? t.bestTaskLoading : t.bestTaskBtn}
            </button>
            {bestTask && (
              <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(192,132,252,0.06)", border: `1px solid ${bestTask.taskId ? "rgba(192,132,252,0.3)" : "rgba(90,143,168,0.2)"}`, borderRadius: 6 }}>
                {bestTask.taskId && (() => {
                  const task = tasks.find(t => t.id === bestTask.taskId);
                  return task ? (
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 600, color: "#c8d8e8", marginBottom: 4, cursor: "pointer" }}
                      onClick={() => setSelectedTaskId(task.id)}>
                      {task.emoji && <span style={{ marginRight: 5 }}>{task.emoji}</span>}{task.title}
                    </div>
                  ) : null;
                })()}
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 0.5, lineHeight: 1.5 }}>
                  {bestTask.reason}
                </div>
              </div>
            )}
          </div>

          {/* Task input */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(192,132,252,0.1)" }}>
            {selectedDate === todayStr() ? (<>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={addTask} placeholder={t.taskPlaceholder}
                style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: "4px 4px 0 0", color: "#c8d8e8", fontFamily: "'Rajdhani', sans-serif", fontSize: 16, boxSizing: "border-box", outline: "none" }} />
              <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder={t.descPlaceholder}
                style={{ width: "100%", padding: "6px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(192,132,252,0.2)", borderTop: "none", borderRadius: "0 0 4px 4px", color: "#7a9ab8", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, marginBottom: 8, boxSizing: "border-box", outline: "none", fontStyle: "italic" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 8, flexWrap: "wrap" }}>
                {TASK_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewTaskEmoji(newTaskEmoji === e ? "" : e)}
                    style={{ fontSize: 18, lineHeight: 1, padding: "3px 5px", background: newTaskEmoji === e ? "rgba(192,132,252,0.2)" : "transparent", border: `1px solid ${newTaskEmoji === e ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.12)"}`, borderRadius: 4, cursor: "pointer" }}>{e}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="number" min={1} max={480} value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} placeholder="—"
                    style={{ width: 52, padding: "3px 6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c8d8e8", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none", textAlign: "center" }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#5a8fa8" }}>{t.minUnit}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1, flexShrink: 0 }}>{t.minFocusLabel}</span>
                <input type="number" min={0} max={100} value={newTaskFocusRequired ?? ""}
                  onChange={e => setNewTaskFocusRequired(e.target.value ? Math.min(100, Math.max(0, parseInt(e.target.value))) : null)}
                  placeholder="auto"
                  style={{ width: 58, padding: "3px 6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none", textAlign: "center" }} />
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.4)" }}>/ 100  ({t.minFocusHint})</span>
              </div>
            </>) : (
              <div style={{ padding: "6px 0", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "rgba(90,143,168,0.5)", letterSpacing: 1 }}>
                {t.pastDayReadOnly}
              </div>
            )}
          </div>

          {/* Task list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 7 }}>
            {visibleTasks.length === 0 && (
              <p style={{ margin: 0, fontSize: 14, color: "rgba(90,143,168,0.5)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: 0.5, lineHeight: 1.6 }}>
                {t.noTasksYet}
              </p>
            )}
            {visibleTasks.map(task => (
              <div key={task.id} onClick={() => setSelectedTaskId(task.id)}
                style={{ display: "flex", flexDirection: "column", padding: "9px 11px", background: "rgba(0,0,0,0.2)", borderRadius: 6, border: "1px solid rgba(192,132,252,0.1)", gap: 5, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.35)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(192,132,252,0.05)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.1)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.2)"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7, minWidth: 0 }}>
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={task.done} onChange={() => updateTask(task.id, { done: !task.done })} style={{ accentColor: "#c084fc", cursor: "pointer", flexShrink: 0, marginTop: 3 }} />
                  </div>
                  {task.emoji && <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1, opacity: task.done ? 0.5 : 1 }}>{task.emoji}</span>}
                  <span style={{ flex: 1, fontSize: 17, fontWeight: 600, color: task.done ? "#5a8fa8" : "#c8d8e8", textDecoration: task.done ? "line-through" : "none", minWidth: 0, wordBreak: "break-word" }}>{task.title}</span>
                  {(() => { const r = focusReadiness(task.focusRequired, neural.focusIndex); return r ? <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, padding: "1px 5px", border: `1px solid ${r.color}`, color: r.color, borderRadius: 3, flexShrink: 0, opacity: task.done ? 0.4 : 1 }}>⚡{r.label}</span> : null; })()}
                </div>
                {task.description && <p style={{ margin: 0, marginLeft: 24, fontSize: 14, color: "#5a8fa8", lineHeight: 1.5, fontStyle: "italic", fontFamily: "'Rajdhani', sans-serif", wordBreak: "break-word" }}>{task.description}</p>}
                {task.deadline && <span style={{ marginLeft: 24, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(251,191,36,0.7)" }}>{t.dueLabel} {task.deadline}</span>}
                {task.estimatedMinutes && <span style={{ marginLeft: 24, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(90,143,168,0.6)" }}>{task.estimatedMinutes}{t.minUnit}</span>}
              </div>
            ))}
          </div>

          {/* Progress footer */}
          <div style={{ padding: "13px 18px", borderTop: "1px solid rgba(192,132,252,0.1)", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 1 }}>
            {t.progress} {visibleCompleted}/{visibleTasks.length} {visibleCompleted > 0 && visibleCompleted === visibleTasks.length ? t.complete : ""}
          </div>
        </aside>
      )}

      {/* ── Disclaimer modal ── */}
      {!disclaimerAccepted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 480, background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 14, padding: 28, boxShadow: "0 0 60px rgba(192,132,252,0.12)", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 3, borderBottom: "1px solid rgba(192,132,252,0.2)", paddingBottom: 10 }}>
              TOKAI · {lang === "zh" ? "使用聲明" : "DISCLAIMER"}
            </div>
            <p style={{ margin: 0, fontSize: 15, color: "#c8d8e8", lineHeight: 1.7, fontFamily: "'Rajdhani', sans-serif" }}>
              {lang === "zh"
                ? <>Tokai 是一款<strong style={{ color: "#c084fc" }}>研究原型</strong>，並非醫療裝置。Pre-alpha 版本中的神經指標均為模擬數值。本應用程式不用於診斷、治療或提供任何 ADHD 或其他疾病的臨床建議。</>
                : <>Tokai is a <strong style={{ color: "#c084fc" }}>research prototype</strong> and is not a medical device. Neural metrics in this alpha version are simulated. This app is not intended to diagnose, treat, or provide clinical guidance for ADHD or any other condition.</>}
            </p>
            <p style={{ margin: 0, fontSize: 15, color: "#c8d8e8", lineHeight: 1.7, fontFamily: "'Rajdhani', sans-serif" }}>
              {lang === "zh"
                ? "你的資料儲存於本機裝置。若提供 API 金鑰，TokAgent 將透過 Anthropic API 使用你的資料生成回應。"
                : "Your data is stored locally on your device. TokAgent may use your data to generate responses via the Anthropic API if an API key is provided."}
            </p>
            <button
              onClick={() => { localStorage.setItem("tokai_disclaimer_accepted", "1"); setDisclaimerAccepted(true); }}
              style={{ padding: "10px 0", background: "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.5)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 2, cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(192,132,252,0.28)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(192,132,252,0.15)")}
            >
              {lang === "zh" ? "我已了解 · 繼續" : "I UNDERSTAND · CONTINUE"}
            </button>
          </div>
        </div>
      )}

      {/* ── Mood consent modal ── */}
      {showMoodConsent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 350, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 420, background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 14, padding: 28, boxShadow: "0 0 60px rgba(192,132,252,0.12)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Camera size={14} color="#c084fc" />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 3 }}>
                {lang === "en" ? "MOOD CHECK-IN" : "情緒掃描"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: "#c8d8e8", lineHeight: 1.7, fontFamily: "'Rajdhani', sans-serif" }}>
              {lang === "en"
                ? "Tokai will analyze a photo to assess your mood and energy state, then personalize your task session accordingly."
                : "Tokai 將分析一張照片來評估你的情緒與能量狀態，並據此個人化你的任務工作階段。"}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#5a8fa8", lineHeight: 1.6, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 0.3 }}>
              {lang === "en"
                ? "The image is sent to Claude's API for analysis and is not stored on Tokai's servers."
                : "照片將傳送至 Claude API 進行分析，不會儲存於 Tokai 伺服器。"}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  localStorage.setItem("tokai_mood_consent", "1");
                  setShowMoodConsent(false);
                  cameraInputRef.current?.click();
                }}
                style={{ flex: 1, padding: "10px 0", background: "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.5)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(192,132,252,0.28)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(192,132,252,0.15)")}
              >
                {lang === "en" ? "ALLOW · SCAN" : "允許 · 掃描"}
              </button>
              <button
                onClick={() => setShowMoodConsent(false)}
                style={{ padding: "10px 18px", background: "transparent", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer" }}
              >
                {lang === "en" ? "NOT NOW" : "稍後"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Info modal ── */}
      {infoModal && (
        <div onClick={() => setInfoModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 12, padding: 24, boxShadow: "0 0 48px rgba(192,132,252,0.12)", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, background: "#c084fc", borderRadius: 1, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 3, flex: 1 }}>{infoModal.title}</span>
              <button onClick={() => setInfoModal(null)} style={{ background: "none", border: "none", color: "#5a8fa8", cursor: "pointer", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: "#c8d8e8", lineHeight: 1.7, fontFamily: "'Rajdhani', sans-serif" }}>
              {infoModal.body}
            </p>
          </div>
        </div>
      )}

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
                  onChange={() => updateTask(task.id, { done: !task.done })}
                  style={{ accentColor: "#c084fc", cursor: "pointer", flexShrink: 0, marginTop: 6, width: 16, height: 16 }} />
                <input
                  value={task.title}
                  onChange={e => setTasks(p => p.map(t => t.id === task.id ? { ...t, title: e.target.value } : t))}
                  style={{ flex: 1, padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#c8d8e8", fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 600, boxSizing: "border-box", outline: "none", textDecoration: task.done ? "line-through" : "none" }}
                />
              </div>

              {/* Emoji picker */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                {TASK_EMOJIS.map(e => (
                  <button key={e} onClick={() => updateTask(task.id, { emoji: task.emoji === e ? undefined : e })}
                    style={{ fontSize: 20, lineHeight: 1, padding: "4px 6px", background: task.emoji === e ? "rgba(192,132,252,0.2)" : "transparent", border: `1px solid ${task.emoji === e ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.12)"}`, borderRadius: 5, cursor: "pointer", transition: "all 0.12s" }}>
                    {e}
                  </button>
                ))}
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

              {/* Est time */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1 }}>{t.estTime}:</span>
                <input type="number" min={1} max={480}
                  value={task.estimatedMinutes ?? ""}
                  onChange={e => setTasks(p => p.map(tk => tk.id === task.id ? { ...tk, estimatedMinutes: e.target.value ? parseInt(e.target.value) : null } : tk))}
                  placeholder="—"
                  style={{ width: 52, padding: "3px 7px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c8d8e8", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, outline: "none", textAlign: "center" }}
                />
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8" }}>{t.minUnit}</span>
              </div>

              {/* Focus required */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1, flexShrink: 0 }}>{t.minFocusLabel}</span>
                <input type="number" min={0} max={100}
                  value={task.focusRequired ?? ""}
                  onChange={e => setTasks(p => p.map(tk => tk.id === task.id ? { ...tk, focusRequired: e.target.value ? Math.min(100, Math.max(0, parseInt(e.target.value))) : undefined } : tk))}
                  placeholder="0–100"
                  style={{ width: 64, padding: "3px 7px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, outline: "none", textAlign: "center" }} />
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8" }}>/ 100</span>
                {task.focusRequired != null && (() => { const r = focusReadiness(task.focusRequired, neural.focusIndex); return r ? <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: r.color, letterSpacing: 1 }}>{r.color === "#4ade80" ? t.focusReadyLabel : r.color === "#fbbf24" ? t.focusMarginalLabel : t.focusNotYetLabel}</span> : null; })()}
              </div>

              {/* Deadline */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1, flexShrink: 0 }}>{t.deadlineLabel}</span>
                <input type="date"
                  value={task.deadline ?? ""}
                  onChange={e => setTasks(p => p.map(tk => tk.id === task.id ? { ...tk, deadline: e.target.value || undefined } : tk))}
                  style={{ flex: 1, padding: "4px 8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 4, color: task.deadline ? "#c084fc" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, outline: "none", colorScheme: "dark" }}
                />
                {task.deadline && (
                  <button onClick={() => updateTask(task.id, { deadline: undefined })}
                    style={{ background: "none", border: "none", color: "rgba(90,143,168,0.5)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                )}
              </div>

              {/* Timestamp + Delete row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {task.createdAt && (
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.55)", letterSpacing: 1 }}>
                    {t.taskAddedLabel} {task.createdAt}
                  </span>
                )}
                <button
                  onClick={() => deleteTask(task.id)}
                  style={{ padding: "5px 12px", background: "transparent", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 4, color: "rgba(255,80,80,0.6)", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, cursor: "pointer", letterSpacing: 1, marginLeft: "auto" }}
                >
                  {t.deleteTask}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
