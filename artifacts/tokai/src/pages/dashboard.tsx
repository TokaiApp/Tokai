import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Github, Activity, BookOpen, ListChecks, Pill, Brain, Crosshair, Zap, Waves, BarChart2, Clock, Camera, Bot, UserCircle, Moon } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine,
} from "recharts";
import AgentChat from "@/components/agent-chat";
import ClinicianReport from "@/components/clinician-report";
import { eegDataset } from "@/data/eeg_dataset";
import type { DatasetSubject } from "@/data/eeg_dataset";

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
    tokTodo: "TOKDO",
    taskPlaceholder: "Task title...",
    descPlaceholder: "Description (optional)...",
    addTaskBtn: "+ ADD TASK", addTaskClose: "✕ CLOSE",
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
    insightsEmpty: "Keep logging journal entries, tasks, and meds — observations appear here as patterns emerge.",
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
    bioHigh: "ENERGIZED", bioMed: "STEADY", bioLow: "DEPLETED",
    fwLong: "LONG WINDOW", fwMed: "MEDIUM", fwShort: "SHORT", fwCalib: "CALIBRATING",
    workingMemory: "WORKING MEMORY", wmlHigh: "OVERLOADED", wmlMed: "MODERATE", wmlLow: "CLEAR",
    mentalFatigue: "MENTAL FATIGUE", fatHigh: "HIGH", fatMed: "BUILDING", fatLow: "FRESH",
    hyperfocusRisk: "HYPERFOCUS RISK", hfrHigh: "HIGH RISK", hfrMed: "WATCH OUT", hfrLow: "NORMAL",
    goLive: "▶▶ LIVE",
    signOut: "SIGN OUT",
    developedBy: "Developed by",
    pomodoro: "TOKTIMER",
    pomoFocus: "WORK", pomoBreak: "BREAK", pomoLongBreak: "LONG BREAK",
    pomoStart: "▶ START", pomoPause: "⏸ PAUSE",
    pomoWorkLabel: "WORK", pomoBreakLabel: "BREAK",
    bestTaskBtn: "✦ BEST TASK RIGHT NOW", bestTaskLoading: "THINKING...",
    activeTaskLabel: "▶ ACTIVE TASK",
    activeTaskNone: "— nothing selected —",
    recommendedTaskLabel: "✦ RECOMMENDED TASK",
    recAnalyzing: "TOKAI is analyzing your state…",
    recOnTrack: "✓ Matches your active task",
    recSwitchBtn: "SWITCH →",
    recSetActiveBtn: "I'M ON IT →",
    dragToReorder: "Drag to reorder",
    viewing: "VIEWING",
    pastDayReadOnly: "PAST DAY · READ ONLY",
    noTasksYet: "No tasks yet. Add one above.",
    minFocusLabel: "⚡ MIN FOCUS:",
    minFocusHint: "auto if blank",
    focusReadyLabel: "✓ READY", focusMarginalLabel: "~ MARGINAL", focusNotYetLabel: "✗ NOT YET",
    deadlineLabel: "DEADLINE:", taskAddedLabel: "ADDED",
    dueLabel: "DUE",
    selfReport: "SELF-REPORT",
    checkInTitle: "NEURAL CHECK-IN",
    checkInSubtitle: "How are you feeling right now?",
    checkInSleepLabel: "How well did you sleep last night?",
    checkInFocusLabel: "How focused do you feel?",
    checkInEnergyLabel: "How much energy do you have?",
    checkInFatigueLabel: "How mentally tired are you?",
    checkInWmlLabel: "How much are you holding in your mind?",
    checkInBtn: "CHECK IN",
    bciOnly: "BCI ONLY",
    checkInAgo: (m: number) => m < 1 ? "just now" : `${m} min ago`,
    reCheckIn: "update",
    sleepQuality: "SLEEP QUALITY",
    sleepWell: "WELL RESTED", sleepOk: "OKAY", sleepPoor: "POOR SLEEP", sleepExhausted: "EXHAUSTED",
    sleepLastNight: "LAST NIGHT",
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
    taskPlaceholder: "任務標題...",
    descPlaceholder: "描述（選填）...",
    addTaskBtn: "+ 新增任務", addTaskClose: "✕ 關閉",
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
    insightsEmpty: "持續記錄日誌、任務與用藥 — 當規律浮現時，觀察將顯示於此。",
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
    bioHigh: "充沛", bioMed: "穩定", bioLow: "耗盡",
    fwLong: "持久窗口", fwMed: "中等", fwShort: "短暫", fwCalib: "校準中",
    workingMemory: "工作記憶", wmlHigh: "超載", wmlMed: "中等", wmlLow: "清晰",
    mentalFatigue: "心理疲勞", fatHigh: "高", fatMed: "累積中", fatLow: "清醒",
    hyperfocusRisk: "過度專注風險", hfrHigh: "高風險", hfrMed: "留意", hfrLow: "正常",
    goLive: "▶▶ 即時",
    signOut: "登出",
    developedBy: "開發者",
    pomodoro: "TOKTIMER · 計時器",
    pomoFocus: "工作", pomoBreak: "短休", pomoLongBreak: "長休息",
    pomoStart: "▶ 開始", pomoPause: "⏸ 暫停",
    pomoWorkLabel: "專注時間", pomoBreakLabel: "休息時間",
    bestTaskBtn: "✦ 現在最佳任務", bestTaskLoading: "思考中...",
    activeTaskLabel: "▶ 進行中任務",
    activeTaskNone: "— 尚未選擇 —",
    recommendedTaskLabel: "✦ 建議任務",
    recAnalyzing: "TOKAI 正在分析你的狀態…",
    recOnTrack: "✓ 與進行中任務相符",
    recSwitchBtn: "切換 →",
    recSetActiveBtn: "開始這個 →",
    dragToReorder: "拖曳以重新排序",
    viewing: "檢視",
    pastDayReadOnly: "歷史日期 · 唯讀",
    noTasksYet: "尚無任務。請在上方新增。",
    minFocusLabel: "⚡ 最低專注：",
    minFocusHint: "留空自動估算",
    focusReadyLabel: "✓ 可開始", focusMarginalLabel: "~ 勉強", focusNotYetLabel: "✗ 尚未準備",
    deadlineLabel: "截止日期：", taskAddedLabel: "新增於",
    dueLabel: "截止",
    selfReport: "自我回報",
    checkInTitle: "神經自評",
    checkInSubtitle: "你現在感覺如何？",
    checkInSleepLabel: "你昨晚睡得如何？",
    checkInFocusLabel: "你目前有多專注？",
    checkInEnergyLabel: "你有多少能量？",
    checkInFatigueLabel: "你的心理疲勞程度如何？",
    checkInWmlLabel: "你的腦中同時在處理多少事情？",
    checkInBtn: "確認",
    bciOnly: "需要 BCI",
    checkInAgo: (m: number) => m < 1 ? "剛剛" : `${m} 分鐘前`,
    reCheckIn: "更新",
    sleepQuality: "睡眠品質",
    sleepWell: "充分休息", sleepOk: "尚可", sleepPoor: "睡眠不足", sleepExhausted: "極度疲憊",
    sleepLastNight: "昨晚",
  },
};

interface NeuralState {
  focusIndex: number;
  bioEnergy: number;
  neuralNoise: number;
  tbRatio: number;
  theta: number;
  beta: number;
  workingMemoryLoad: number;
  mentalFatigue: number;
  hyperfocusRisk: number;
  sleepQuality: number;
}

interface FocusPoint { time: string; value: number; }
interface Task { id: string; title: string; description: string | null; done: boolean; estimatedMinutes: number | null; createdAt?: string; deadline?: string; emoji?: string; focusRequired?: number; position?: number; }

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

function loadSleepQuality(): number {
  try {
    const s = localStorage.getItem("tokai_sleep_quality");
    if (s) { const p = JSON.parse(s); if (p.date === todayStr()) return p.value; }
  } catch {}
  return 50;
}
function saveSleepQuality(value: number) {
  try { localStorage.setItem("tokai_sleep_quality", JSON.stringify({ date: todayStr(), value })); } catch {}
}
function hasCheckedInToday(): boolean {
  try { return localStorage.getItem("tokai_checkin_date") === todayStr(); } catch { return false; }
}
function saveCheckinDate() {
  try { localStorage.setItem("tokai_checkin_date", todayStr()); } catch {}
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
    tokInsights: { title: "TOKINSIGHTS", body: "Automatic observations computed from your own history — when you focus best, which moods track your focus, task completion, and what you log. Everything is calculated on your device; nothing is sent to a server. The more you log, the sharper it gets." },
    tokTimer: { title: "TOKTIMER", body: "A Pomodoro-style focus timer. Work in focused intervals separated by short breaks, with a longer break every four cycles. Set your own work and break lengths; Tokai notifies you each time a phase ends so you can stay heads-down without watching the clock." },
    tokAgent: { title: "TOKAGENT", body: "Your AI task planning assistant, powered by Claude (Anthropic). TokAgent reads your live neural metrics, full task list, journal entries, and medication log to recommend which tasks to tackle based on your current cognitive state." },
    tokTodo: { title: "TOKDO", body: "A task manager built around cognitive demand. Tag tasks as Low, Medium, or High demand so TokAgent can match them to your focus level. Add time estimates and deadlines for realistic planning. Tasks are organized by day." },
    tokMed: { title: "TOKMED", body: "Log medications, supplements, and stimulants like coffee. Tokai tracks how your Focus Index changes in the 15–30 minutes after each entry, giving you real data on what affects your brain." },
    workingMemory: { title: "WORKING MEMORY", body: "How much cognitive load your brain is currently managing — how many things it's holding at once. High load means stick to single-step tasks. Low load is ideal for multi-step planning, reading complex material, or anything requiring you to juggle information." },
    mentalFatigue: { title: "MENTAL FATIGUE", body: "Accumulated cognitive tiredness from sustained mental work. Unlike the Focus Index, fatigue builds slowly across a session. High fatigue means you're approaching burnout — a proper break will restore your performance more than pushing through." },
    hyperfocusRisk: { title: "HYPERFOCUS RISK", body: "The likelihood you're entering or already in a hyperfocus state — intense, involuntary concentration where you lose track of time, skip meals, or miss other responsibilities. A high score is a signal to check the clock, eat something, and take a scheduled break." },
    sleepQuality: { title: "SLEEP QUALITY", body: "How well you slept last night, self-reported on a 0–100 scale. Sleep quality is one of the strongest predictors of ADHD symptom severity: poor sleep directly impairs focus, working memory, and impulse control the following day. TokAgent uses this to calibrate task recommendations — a low score means shorter tasks, more breaks, and lower cognitive demand." },
  },
  zh: {
    focusIndex: { title: "專注指數", body: "從 0 到 100 的綜合評分，源自 θ 與 β 腦波模式。70 以上代表適合深度工作的專注窗口；40 以下表示大腦需要低認知需求任務或休息。" },
    bioEnergy: { title: "生理能量", body: "估算的生理能量水平。Pre-alpha 版本為模擬數值，未來版本將整合 HRV 與穿戴裝置數據。可作為體力的粗略參考。" },
    neuralNoise: { title: "神經噪訊", body: "背景 EEG 訊號噪訊（μV²）。數值越低代表神經狀態越清晰；40 以上通常表示高喚醒、分心或環境干擾。" },
    tbRatio: { title: "θ/β 比值", body: "θ 波與 β 波的比率。TBR 高於 3.0 與研究文獻中的 ADHD 型注意力不足有關；數值較低代表更專注的腦部狀態。" },
    focusWindow: { title: "專注窗口", body: "根據近期趨勢預測目前專注狀態的剩餘時間，至少需要 6 個樣本。可用來判斷是否適合開始長時間任務。" },
    focusStream: { title: "即時專注串流", body: "即時顯示專注指數的可捲動折線圖。參考線分別代表 5 分鐘均值、階段均值與當日均值。黃色垂直線標記你記錄藥物或補充品的時間點。" },
    tokNote: { title: "TOKNOTE", body: "ADHD 友善日誌。每則條目自動標記日期、時間與當下的專注指數，幫助你追蹤感受與大腦實際表現之間的規律。" },
    tokInsights: { title: "TOKINSIGHTS", body: "根據你自身歷史自動計算的觀察 — 你何時最專注、哪些情緒對應較高專注、任務完成度與記錄習慣。全部在你的裝置上計算，不會傳送到伺服器。記錄越多，洞察越準確。" },
    tokTimer: { title: "TOKTIMER", body: "番茄鐘式專注計時器。以專注時段搭配短暫休息，每四個循環後安排較長休息。可自訂工作與休息時間；每個階段結束時 Tokai 會通知你，讓你無需盯著時鐘也能保持專注。" },
    tokAgent: { title: "TOKAGENT", body: "由 Claude（Anthropic）驅動的 AI 任務規劃助手。TokAgent 讀取你的即時神經指標、任務清單、日誌與藥物紀錄，根據當前認知狀態推薦最適合的任務。" },
    tokTodo: { title: "TOKDO", body: "以認知負荷為核心設計的任務管理器。為每個任務標記低、中、高需求，讓 TokAgent 能配對你的專注程度。加入預估時間與截止日期，制定更切實際的計畫。" },
    tokMed: { title: "TOKMED", body: "記錄藥物、補充品與咖啡等影響專注的物質。Tokai 追蹤記錄後 15–30 分鐘內專注指數的變化，為你提供有效成分的實際數據。" },
    workingMemory: { title: "工作記憶", body: "大腦目前同時處理的認知負荷量。負荷高時，建議只做單步驟任務；負荷低時，適合多步驟規劃、閱讀複雜材料或需要同時思考多件事的工作。" },
    mentalFatigue: { title: "心理疲勞", body: "持續腦力勞動累積的認知疲勞。與專注指數不同，疲勞在整個工作階段中緩慢增加。疲勞值高代表你接近認知耗盡——此時真正的休息比硬撐更能恢復表現。" },
    hyperfocusRisk: { title: "過度專注風險", body: "進入或已處於過度專注狀態的可能性——一種強烈的無意識集中，可能讓你忘記時間、跳過正餐或忽略其他責任。數值高時，請查看時鐘、吃點東西，並安排一次有計畫的休息。" },
    sleepQuality: { title: "睡眠品質", body: "昨晚的睡眠品質，以 0–100 自我評分。睡眠品質是 ADHD 症狀嚴重程度最強的預測因子之一：睡眠不足會直接損害隔天的專注力、工作記憶與衝動控制。TokAgent 將以此調整任務建議——低分代表推薦較短任務、更多休息與較低認知需求。" },
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

function MetricCard({ title, icon, onInfo, children, dimmed }: { title: string; icon?: React.ReactNode; onInfo?: () => void; children: React.ReactNode; dimmed?: boolean }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 10, padding: "16px 20px", position: "relative", overflow: "hidden", flex: "0 0 185px", minWidth: 0, opacity: dimmed ? 0.38 : 1, transition: "opacity 0.3s", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg, #c084fc, #7c3aed)" }} />
      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "#5a8fa8", letterSpacing: 2, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 6, minHeight: "2.6em", lineHeight: 1.3 }}>
        {icon && <span style={{ flexShrink: 0, marginTop: 2 }}>{icon}</span>}
        <span style={{ flex: 1 }}>{title}</span>
        {onInfo && <span style={{ flexShrink: 0 }}><InfoButton onClick={onInfo} /></span>}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
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
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, padding: "2px 8px", border: `1px solid ${color}`, color, borderRadius: 3, letterSpacing: 1, marginTop: "auto", alignSelf: "flex-start" }}>
      {children}
    </span>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      onMouseDown={e => e.preventDefault()}
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
  const [profile, setProfile] = useState<{ name: string; bciDevice: string; subscriptionTier: string; tokens: number; aiProfile: string | null } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Anthropic API key (BYOK) — single source of truth; entered in the profile, used by TokAgent + AI endpoints
  const [anthropicKey, setAnthropicKey] = useState(() => { try { return localStorage.getItem("tokai_anthropic_key") ?? ""; } catch { return ""; } });
  function saveAnthropicKey(k: string) {
    const v = k.trim();
    setAnthropicKey(v);
    try { if (v) localStorage.setItem("tokai_anthropic_key", v); else localStorage.removeItem("tokai_anthropic_key"); } catch { /* ignore */ }
  }
  const [keyInput, setKeyInput] = useState("");
  const [profileGenerating, setProfileGenerating] = useState(false);
  const tokEn = profile?.tokens ?? 100;
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];

  // Accessibility: high-legibility reading font (swaps Rajdhani → Lexend; mono labels unchanged)
  const [highLegibility, setHighLegibility] = useState(() => localStorage.getItem("tokai_legible") === "1");
  useEffect(() => {
    document.documentElement.dataset.legible = highLegibility ? "1" : "";
    try { localStorage.setItem("tokai_legible", highLegibility ? "1" : "0"); } catch { /* ignore */ }
  }, [highLegibility]);

  // Accessibility: reduce motion (transitions/animations/smooth-scroll), default to the OS preference
  const [reduceMotion, setReduceMotion] = useState(() => {
    const saved = localStorage.getItem("tokai_reduce_motion");
    if (saved != null) return saved === "1";
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? "1" : "";
    try { localStorage.setItem("tokai_reduce_motion", reduceMotion ? "1" : "0"); } catch { /* ignore */ }
  }, [reduceMotion]);

  // Accessibility: text scale (whole-UI zoom; px sizes are hardcoded so this mirrors browser zoom)
  const [textScale, setTextScale] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem("tokai_text_scale") || "1");
    return [0.9, 1, 1.15, 1.3].includes(v) ? v : 1;
  });
  useEffect(() => {
    (document.documentElement.style as CSSStyleDeclaration & { zoom?: string }).zoom = textScale === 1 ? "" : String(textScale);
    try { localStorage.setItem("tokai_text_scale", String(textScale)); } catch { /* ignore */ }
  }, [textScale]);

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
    workingMemoryLoad: 42, mentalFatigue: 18, hyperfocusRisk: 12,
    sleepQuality: loadSleepQuality(),
  });
  const neuralRef = useRef(neural);
  useEffect(() => { neuralRef.current = neural; }, [neural]);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);

  // Scroll-aware fade hints for the metric card row (left appears once scrolled, right hides at the end)
  const metricScrollRef = useRef<HTMLDivElement>(null);
  const [metricFade, setMetricFade] = useState({ left: false, right: false });
  useEffect(() => {
    const el = metricScrollRef.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 4;
      const right = el.scrollWidth - el.scrollLeft - el.clientWidth > 4;
      setMetricFade(prev => (prev.left === left && prev.right === right) ? prev : { left, right });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [isMobile]);

  // Scroll-aware fade hints for the widget row (TokNote · TokMed · TokInsights)
  const widgetScrollRef = useRef<HTMLDivElement>(null);
  const [widgetFade, setWidgetFade] = useState({ left: false, right: false });
  useEffect(() => {
    const el = widgetScrollRef.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 4;
      const right = el.scrollWidth - el.scrollLeft - el.clientWidth > 4;
      setWidgetFade(prev => (prev.left === left && prev.right === right) ? prev : { left, right });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [isMobile]);
  // Data source: simulated drift, dataset replay, or live BCI (future)
  type DataSource = "simulated" | "dataset" | "bci" | "self-report";
  const [dataSource, setDataSource] = useState<DataSource>("self-report");
  const dataSourceRef = useRef<DataSource>("self-report");
  useEffect(() => { dataSourceRef.current = dataSource; }, [dataSource]);
  const [datasetSubjectIdx, setDatasetSubjectIdx] = useState(0);
  const datasetSubjectIdxRef = useRef(0);
  useEffect(() => { datasetSubjectIdxRef.current = datasetSubjectIdx; }, [datasetSubjectIdx]);
  const datasetPlayheadRef = useRef(0);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const datasetDropdownRef = useRef<HTMLDivElement>(null);

  // Self-report mode state
  const [selfReport, setSelfReport] = useState({ focusIndex: 50, bioEnergy: 50, mentalFatigue: 50, workingMemoryLoad: 50, sleepQuality: loadSleepQuality() });
  const [showCheckIn, setShowCheckIn] = useState(() => !hasCheckedInToday());
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [checkInDraft, setCheckInDraft] = useState({ focusIndex: 50, bioEnergy: 50, mentalFatigue: 50, workingMemoryLoad: 50, sleepQuality: loadSleepQuality() });
  useEffect(() => {
    if (!datasetDropdownOpen) return;
    function handleOutside(e: MouseEvent) {
      if (datasetDropdownRef.current && !datasetDropdownRef.current.contains(e.target as Node))
        setDatasetDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [datasetDropdownOpen]);

  const [chartWrapWidth, setChartWrapWidth] = useState(600);
  const [isLive, setIsLive] = useState(true);
  const sessionStartSampleCount = useRef(0);
  useEffect(() => { sessionStartSampleCount.current = focusHistory.length; }, []);

  // Internal focus target: drifts slowly, actual focus index pulls toward it
  const focusTargetRef = useRef(55);

  // Online/offline detection
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // Notifications
  const [notifications, setNotifications] = useState<{ id: string; message: string; color: string; icon: string }[]>([]);
  const [medReminders, setMedReminders] = useState<{ medId: string; medName: string; fireAt: number }[]>([]);
  const lowFocusStartRef = useRef<number | null>(null);
  const focusWasLowRef = useRef(false);

  function sendBrowserNotification(title: string) {
    if (typeof Notification === "undefined" || Notification.permission === "denied") return;
    if (Notification.permission === "granted") {
      new Notification(title, { silent: true });
    } else {
      Notification.requestPermission().then(p => { if (p === "granted") new Notification(title, { silent: true }); });
    }
  }

  function pushNotification(message: string, color: string, icon: string) {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, color, icon }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 7000);
  }

  function dismissNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

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
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [agentDockOpen, setAgentDockOpen] = useState(false);
  useEffect(() => {
    if (!agentDockOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAgentDockOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [agentDockOpen]);
  useEffect(() => {
    if (!showCheckIn) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowCheckIn(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCheckIn]);
  function closeTaskForm() {
    setTaskFormOpen(false);
    setNewTask(""); setNewTaskDesc(""); setNewTaskTime(""); setNewTaskDeadline(""); setNewTaskEmoji(""); setNewTaskFocusRequired(null);
  }

  function applyCheckIn(values: { focusIndex: number; bioEnergy: number; mentalFatigue: number; workingMemoryLoad: number; sleepQuality: number }) {
    const next: NeuralState = { ...neuralRef.current, ...values };
    setNeural(next);
    neuralRef.current = next;
    setSelfReport(values);
    saveSleepQuality(values.sleepQuality);
    saveCheckinDate();
    setLastCheckIn(new Date());
    setShowCheckIn(false);
  }
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [medLog, setMedLog] = useState<MedEntry[]>([]);
  const medSuggestions = useMemo(() => {
    const seen = new Map<string, string>();
    [...medLog].reverse().forEach(m => { if (!seen.has(m.name)) seen.set(m.name, m.dose ?? ""); });
    return [...seen.entries()].slice(0, 8).map(([name, dose]) => ({ name, dose }));
  }, [medLog]);
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

  // Active task (user-selected "what I'm working on") — synced to profiles.active_task_id
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  function selectActiveTask(id: string | null) {
    setActiveTaskId(id);
    supabase.from("profiles").update({ active_task_id: id }).eq("user_id", userId);
  }

  // Manual task ordering (drag / arrows to reorder) — synced to tasks.position
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const orderSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist a new full ordering: assign each id its index as position and save changed rows
  function applyOrder(idOrder: string[]) {
    const changed: { id: string; position: number }[] = [];
    const next = tasks.map(tk => {
      const i = idOrder.indexOf(tk.id);
      if (i >= 0 && tk.position !== i) changed.push({ id: tk.id, position: i });
      return i >= 0 ? { ...tk, position: i } : tk;
    });
    setTasks(next);
    if (orderSaveTimeout.current) clearTimeout(orderSaveTimeout.current);
    orderSaveTimeout.current = setTimeout(() => {
      changed.forEach(c => { supabase.from("tasks").update({ position: c.position }).eq("id", c.id); });
    }, 600);
  }

  // Move a task up (-1) or down (+1) one slot within its group (incomplete / complete)
  function moveTask(id: string, dir: -1 | 1) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const groupIds = orderedVisibleTasks.filter(tk => tk.done === task.done).map(tk => tk.id);
    const from = groupIds.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= groupIds.length) return;
    [groupIds[from], groupIds[to]] = [groupIds[to], groupIds[from]];
    applyOrder(groupIds);
  }

  // Drop the dragged task at the target task's slot — only within the same group
  function reorderTask(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    const dragTask = tasks.find(t => t.id === dragId);
    const targetTask = tasks.find(t => t.id === targetId);
    if (!dragTask || !targetTask || dragTask.done !== targetTask.done) return;
    const ids = orderedVisibleTasks.filter(tk => tk.done === dragTask.done).map(tk => tk.id);
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    applyOrder(ids);
  }

  // AI recommendation ("what TOKAI thinks you should do") — auto-refreshed on a timer
  const [bestTask, setBestTask] = useState<{ taskId: string | null; reason: string } | null>(null);
  const [bestTaskLoading, setBestTaskLoading] = useState(false);
  const bestTaskInFlight = useRef(false);
  const lastRecFocusRef = useRef(0);
  const activeTaskIdRef = useRef(activeTaskId);
  useEffect(() => { activeTaskIdRef.current = activeTaskId; }, [activeTaskId]);

  async function fetchBestTask(silent = false) {
    const pending = tasks.filter(t => !t.done);
    if (pending.length === 0) { setBestTask(null); return; }
    if (bestTaskInFlight.current) return;
    bestTaskInFlight.current = true;
    lastRecFocusRef.current = neuralRef.current.focusIndex;
    if (!silent) setBestTaskLoading(true);
    try {
      const apiKey = localStorage.getItem("tokai_anthropic_key") ?? "";
      const res = await fetch(`${API_BASE}/api/best-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neuralState: { focusIndex: neuralRef.current.focusIndex, bioEnergy: neuralRef.current.bioEnergy },
          tasks: pending.map(t => ({ id: t.id, title: t.title, description: t.description, done: t.done, focusRequired: t.focusRequired, estimatedMinutes: t.estimatedMinutes })),
          activeTaskId: activeTaskIdRef.current ?? undefined,
          userApiKey: apiKey || undefined,
          lang,
        }),
      });
      const data = await res.json();
      setBestTask(data);
    } catch {
      if (!silent) setBestTask({ taskId: null, reason: lang === "en" ? "Could not reach the server." : "無法連線到伺服器。" });
    }
    if (!silent) setBestTaskLoading(false);
    bestTaskInFlight.current = false;
  }

  // Keep a ref to the latest fetchBestTask so the polling interval always calls the current closure
  const fetchBestTaskRef = useRef(fetchBestTask);
  useEffect(() => { fetchBestTaskRef.current = fetchBestTask; });

  // Drop the active selection if that task is completed or deleted
  useEffect(() => {
    if (activeTaskId && !tasks.some(t => t.id === activeTaskId && !t.done)) {
      selectActiveTask(null);
    }
  }, [tasks, activeTaskId]);

  // Refresh the recommendation only when it could actually change — on load, when the set of
  // pending tasks changes, or when focus shifts meaningfully. (No blind polling: saves API cost.)
  const pendingKey = tasks.filter(t => !t.done).map(t => t.id).sort().join(",");
  useEffect(() => {
    if (!dataLoaded) return;
    if (!pendingKey) { setBestTask(null); return; }
    fetchBestTaskRef.current(false);
  }, [dataLoaded, pendingKey]);
  useEffect(() => {
    if (!dataLoaded || !pendingKey) return;
    if (Math.abs(neural.focusIndex - lastRecFocusRef.current) >= 15) {
      fetchBestTaskRef.current(true);
    }
  }, [neural.focusIndex, dataLoaded, pendingKey]);

  // Pomodoro
  const savedTimer = (() => { try { return JSON.parse(localStorage.getItem("tokai_timer_state") || "null"); } catch { return null; } })();
  const [pomodoroWorkMins, setPomodoroWorkMins] = useState<number>(savedTimer?.workMins ?? 25);
  const [pomodoroBreakMins, setPomodoroBreakMins] = useState<number>(savedTimer?.breakMins ?? 5);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<"work" | "break">(savedTimer?.phase === "break" ? "break" : "work");
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState<number>(savedTimer?.timeLeft ?? 25 * 60);
  const [pomodoroCount, setPomodoroCount] = useState<number>(savedTimer?.count ?? 0);
  const [pomodoroAutoContinue, setPomodoroAutoContinue] = useState<boolean>(() => localStorage.getItem("tokai_timer_autocontinue") === "1");
  const [pomodoroSound, setPomodoroSound] = useState<boolean>(() => localStorage.getItem("tokai_timer_sound") !== "0");
  const [focusSessions, setFocusSessions] = useState<{ date: string; taskId: string | null; taskTitle: string | null; minutes: number; time: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("tokai_focus_sessions") || "[]"); } catch { return []; }
  });
  const pomodoroPhaseRef = useRef<"work" | "break">(savedTimer?.phase === "break" ? "break" : "work");
  const pomodoroCountRef = useRef<number>(savedTimer?.count ?? 0);
  const pomodoroWorkRef = useRef((savedTimer?.workMins ?? 25) * 60);
  const pomodoroBreakRef = useRef((savedTimer?.breakMins ?? 5) * 60);
  const pomodoroAutoContinueRef = useRef(pomodoroAutoContinue);
  const pomodoroSoundRef = useRef(pomodoroSound);
  const activeTaskRef = useRef<{ id: string; title: string } | null>(null);
  useEffect(() => { pomodoroPhaseRef.current = pomodoroPhase; }, [pomodoroPhase]);
  useEffect(() => { pomodoroCountRef.current = pomodoroCount; }, [pomodoroCount]);
  useEffect(() => { pomodoroWorkRef.current = pomodoroWorkMins * 60; }, [pomodoroWorkMins]);
  useEffect(() => { pomodoroBreakRef.current = pomodoroBreakMins * 60; }, [pomodoroBreakMins]);
  useEffect(() => { pomodoroAutoContinueRef.current = pomodoroAutoContinue; try { localStorage.setItem("tokai_timer_autocontinue", pomodoroAutoContinue ? "1" : "0"); } catch { /* ignore */ } }, [pomodoroAutoContinue]);
  useEffect(() => { pomodoroSoundRef.current = pomodoroSound; try { localStorage.setItem("tokai_timer_sound", pomodoroSound ? "1" : "0"); } catch { /* ignore */ } }, [pomodoroSound]);
  useEffect(() => { const at = activeTaskId ? tasks.find(tk => tk.id === activeTaskId) : null; activeTaskRef.current = at ? { id: at.id, title: at.title } : null; }, [activeTaskId, tasks]);
  // Persist timer runtime + settings; restored paused on reload
  useEffect(() => {
    try { localStorage.setItem("tokai_timer_state", JSON.stringify({ phase: pomodoroPhase, timeLeft: pomodoroTimeLeft, count: pomodoroCount, workMins: pomodoroWorkMins, breakMins: pomodoroBreakMins })); } catch { /* ignore */ }
  }, [pomodoroPhase, pomodoroTimeLeft, pomodoroCount, pomodoroWorkMins, pomodoroBreakMins]);
  // Show the countdown in the browser tab title while running; restore the base title otherwise
  const baseTitleRef = useRef<string>("");
  useEffect(() => { if (!baseTitleRef.current) baseTitleRef.current = document.title || "Tokai"; }, []);
  useEffect(() => {
    if (pomodoroRunning) {
      document.title = `${String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, "0")}:${String(pomodoroTimeLeft % 60).padStart(2, "0")} · ${pomodoroPhase === "work" ? (lang === "en" ? "Focus" : "專注") : (lang === "en" ? "Break" : "休息")}`;
    } else if (baseTitleRef.current) {
      document.title = baseTitleRef.current;
    }
  }, [pomodoroRunning, pomodoroTimeLeft, pomodoroPhase, lang]);
  function playChime() {
    if (!pomodoroSoundRef.current) return;
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AC();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 660;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.42); o.onended = () => ctx.close();
    } catch { /* ignore */ }
  }
  function logFocusSession(minutes: number) {
    const at = activeTaskRef.current;
    const entry = { date: todayStr(), taskId: at?.id ?? null, taskTitle: at?.title ?? null, minutes, time: formatTime(new Date()) };
    setFocusSessions(prev => {
      const next = [...prev, entry].slice(-500);
      try { localStorage.setItem("tokai_focus_sessions", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    // Sync to Supabase (best-effort; no-ops until the focus_sessions migration is applied)
    supabase.from("focus_sessions").insert({ user_id: userId, date: entry.date, time: entry.time, task_id: entry.taskId, task_title: entry.taskTitle, minutes: entry.minutes });
  }
  function extendTimer(secs: number) { setPomodoroTimeLeft(t => Math.min(t + secs, 99 * 60 + 59)); }
  function breakEarly() {
    logFocusSession(Math.max(1, Math.round((pomodoroWorkRef.current - pomodoroTimeLeft) / 60)));
    const n = pomodoroCountRef.current + 1; setPomodoroCount(n); pomodoroCountRef.current = n;
    setPomodoroPhase("break"); pomodoroPhaseRef.current = "break";
    setPomodoroTimeLeft(n % 4 === 0 ? pomodoroBreakRef.current * 3 : pomodoroBreakRef.current);
    playChime();
  }
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
          if (!pomodoroAutoContinueRef.current) setPomodoroRunning(false);
          logFocusSession(Math.round(pomodoroWorkRef.current / 60));
          playChime();
          const at = activeTaskRef.current;
          const workDoneMsg = (lang === "en" ? "Focus block done — time for a break." : "專注時段結束 — 該休息了。") + (at ? ` · ${at.title}` : "");
          pushNotification(workDoneMsg, "#6ee7b7", "☕");
          sendBrowserNotification(workDoneMsg);
          return next % 4 === 0 ? pomodoroBreakRef.current * 3 : pomodoroBreakRef.current;
        } else {
          setPomodoroPhase("work");
          pomodoroPhaseRef.current = "work";
          if (!pomodoroAutoContinueRef.current) setPomodoroRunning(false);
          playChime();
          const breakDoneMsg = lang === "en" ? "Break over — back to focus." : "休息結束 — 回到專注。";
          pushNotification(breakDoneMsg, "#c084fc", "⚡");
          sendBrowserNotification(breakDoneMsg);
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

  // Focus drop monitoring
  useEffect(() => {
    if (!dataLoaded) return;
    const f = neural.focusIndex;
    if (f < 35) {
      if (lowFocusStartRef.current === null) lowFocusStartRef.current = Date.now();
      else if (Date.now() - lowFocusStartRef.current >= 90000 && !focusWasLowRef.current) {
        focusWasLowRef.current = true;
        pushNotification(
          lang === "en" ? "Focus has been low for 90s. Consider a break or a lighter task." : "專注度已持續偏低 90 秒，建議休息或切換至輕量任務。",
          "#f472b6", "⚡"
        );
      }
    } else {
      if (f >= 35) lowFocusStartRef.current = null;
      if (focusWasLowRef.current && f >= 50) {
        focusWasLowRef.current = false;
        pushNotification(
          lang === "en" ? "Focus recovering — you may be ready for a more demanding task." : "專注度回升，可以嘗試更高難度的任務了。",
          "#4ade80", "✓"
        );
      }
    }
  }, [neural.focusIndex, dataLoaded]);

  // Med reminder check
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setMedReminders(prev => {
        const fired = prev.filter(r => r.fireAt <= now);
        fired.forEach(r => {
          const medMsg = lang === "en" ? `Reminder: ${r.medName}` : `提醒：${r.medName}`;
          pushNotification(medMsg, "#fbbf24", "💊");
          sendBrowserNotification(medMsg);
        });
        return prev.filter(r => r.fireAt > now);
      });
    }, 30000);
    return () => clearInterval(id);
  }, [lang]);

  // Load all user data from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: tData }, { data: mData }, { data: jData }, { data: profileData }, { data: fsData }] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", userId),
        supabase.from("med_log").select("*").eq("user_id", userId).order("logged_at"),
        supabase.from("journal_entries").select("*").eq("user_id", userId),
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("focus_sessions").select("*").eq("user_id", userId).order("created_at"),
      ]);
      if (cancelled) return;

      // Focus sessions: prefer the synced table; fall back to the localStorage cache (pre-migration)
      if (fsData && fsData.length > 0) {
        const mapped = fsData.map((r: Record<string, unknown>) => ({
          date: r.date as string, time: (r.time as string) ?? "",
          taskId: (r.task_id as string) ?? null, taskTitle: (r.task_title as string) ?? null,
          minutes: Number(r.minutes) || 0,
        }));
        setFocusSessions(mapped);
        try { localStorage.setItem("tokai_focus_sessions", JSON.stringify(mapped.slice(-500))); } catch { /* ignore */ }
      }

      const mappedTasks: Task[] = (tData ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, title: r.title as string, description: r.description as string | null,
        done: r.done as boolean,
        estimatedMinutes: r.estimated_minutes as number | null, createdAt: r.created_at as string | undefined,
        deadline: r.deadline as string | undefined, emoji: r.emoji as string | undefined,
        focusRequired: r.focus_required as number | undefined,
        position: r.position != null ? Number(r.position) : undefined,
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
          { id: "demo-t1", user_id: userId, title: "Write methodology section", description: "Draft the research methodology chapter for the thesis.", done: true, estimated_minutes: 90, created_at: "2026-05-18 08:45", emoji: "✍️", focus_required: 65, position: 0 },
          { id: "demo-t2", user_id: userId, title: "Review data analysis scripts", description: "Check the Python scripts for data processing and output errors.", done: true, estimated_minutes: 60, created_at: "2026-05-18 08:45", emoji: "💻", focus_required: 65, position: 1 },
          { id: "demo-t3", user_id: userId, title: "Email supervisor — weekly update", description: null, done: true, estimated_minutes: 20, created_at: "2026-05-18 08:45", emoji: "📧", focus_required: 40, position: 2 },
          { id: "demo-t4", user_id: userId, title: "Read 2 papers for lit review", description: null, done: false, estimated_minutes: 120, created_at: "2026-05-18 14:00", emoji: "📚", focus_required: 65, position: 3 },
          { id: "demo-t5", user_id: userId, title: "Organize research notes", description: "Sort and label notes from the past two weeks of reading.", done: true, estimated_minutes: 20, created_at: "2026-05-16 10:30", emoji: "📚", focus_required: 30, position: 4 },
          { id: "demo-t6", user_id: userId, title: "Rest and recharge", description: "Take the afternoon off. Watch something, go for a walk.", done: true, estimated_minutes: null, created_at: "2026-05-16 13:00", emoji: null, focus_required: null, position: 5 },
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
        setTasks(demoTasks.map(r => ({ id: r.id, title: r.title, description: r.description, done: r.done, estimatedMinutes: r.estimated_minutes, createdAt: r.created_at, emoji: r.emoji ?? undefined, focusRequired: r.focus_required ?? undefined, position: r.position })));
        setJournal(demoJournal.map(r => ({ id: r.id, text: r.text, time: r.time, date: r.date, focusIndex: r.focus_index, mood: r.mood as Mood[] })));
      } else {
        setTasks(mappedTasks);
        setMedLog(mappedMeds);
        setJournal(mappedJournal);
      }
      // Profile
      if (profileData) {
        setProfile({ name: profileData.name ?? "", bciDevice: profileData.bci_device, subscriptionTier: profileData.subscription_tier, tokens: profileData.tokens, aiProfile: profileData.ai_profile ?? null });
        if (profileData.active_task_id) setActiveTaskId(profileData.active_task_id as string);
      } else {
        const defaultName = (session.user.user_metadata?.full_name as string) ?? "";
        await supabase.from("profiles").insert({ user_id: userId, name: defaultName, bci_device: "none", subscription_tier: "free", tokens: 100 });
        setProfile({ name: defaultName, bciDevice: "none", subscriptionTier: "free", tokens: 100, aiProfile: null });
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

  async function saveProfile(updates: Partial<typeof profile>) {
    if (!profile) return;
    const next = { ...profile, ...updates };
    setProfile(next);
    await supabase.from("profiles").update({
      name: next.name, bci_device: next.bciDevice,
      subscription_tier: next.subscriptionTier, updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
  }

  async function generateAiProfile() {
    if (!profile) return;
    setProfileGenerating(true);
    try {
      const apiKey = localStorage.getItem("tokai_anthropic_key") ?? "";
      const res = await fetch(`${API_BASE}/api/generate-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name, email: session.user.email,
          taskCount: tasks.length, completedCount: tasks.filter(t => t.done).length,
          journalCount: journal.length, medCount: medLog.length,
          userApiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(p => p ? { ...p, aiProfile: data.profile } : p);
        await supabase.from("profiles").update({ ai_profile: data.profile, ai_profile_updated_at: new Date().toISOString() }).eq("user_id", userId);
      }
    } catch { /* silent */ }
    setProfileGenerating(false);
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

  // ── Agent (TokAgent tool callbacks) ─────────────────────────────────────────

  async function agentCreateTask(params: { title: string; description?: string; emoji?: string; focusRequired?: number; estimatedMinutes?: number; deadline?: string }) {
    const nextPosition = tasks.reduce((max, tk) => tk.position != null && tk.position > max ? tk.position : max, -1) + 1;
    const id = Date.now().toString();
    const task: Task = {
      id, title: params.title, description: params.description ?? null, done: false,
      estimatedMinutes: params.estimatedMinutes ?? null, createdAt: formatDateTime(new Date()),
      deadline: params.deadline || undefined, emoji: params.emoji || undefined,
      focusRequired: params.focusRequired ?? estimateFocusRequired(params.title, params.description ?? null),
      position: nextPosition,
    };
    setTasks(prev => [...prev, task]);
    await supabase.from("tasks").insert({
      id: task.id, user_id: userId, title: task.title, description: task.description,
      done: false, estimated_minutes: task.estimatedMinutes, created_at: task.createdAt,
      deadline: task.deadline ?? null, emoji: task.emoji ?? null,
      focus_required: task.focusRequired ?? null, position: task.position,
    });
    return { id };
  }

  async function agentUpdateTask(id: string, changes: { title?: string; description?: string; emoji?: string; focusRequired?: number; estimatedMinutes?: number; deadline?: string; done?: boolean }) {
    setTasks(p => p.map(t => t.id === id ? { ...t, ...changes } : t));
    const db: Record<string, unknown> = {};
    if ("title" in changes) db.title = changes.title;
    if ("description" in changes) db.description = changes.description ?? null;
    if ("emoji" in changes) db.emoji = changes.emoji ?? null;
    if ("focusRequired" in changes) db.focus_required = changes.focusRequired ?? null;
    if ("estimatedMinutes" in changes) db.estimated_minutes = changes.estimatedMinutes ?? null;
    if ("deadline" in changes) db.deadline = changes.deadline || null;
    if ("done" in changes) db.done = changes.done;
    if (Object.keys(db).length > 0) await supabase.from("tasks").update(db).eq("id", id);
  }

  async function agentDeleteAllTasks() {
    setTasks([]);
    selectActiveTask(null);
    await supabase.from("tasks").delete().eq("user_id", userId);
  }

  async function agentAddJournalEntry(text: string, moods?: string[]) {
    const entry: JournalEntry = {
      id: Date.now().toString(), text, time: formatTime(new Date()), date: todayStr(),
      focusIndex: neural.focusIndex, mood: (moods ?? []) as Mood[],
      focusTime: focusHistory[focusHistory.length - 1]?.time,
    };
    setJournal(prev => [...prev, entry]);
    await supabase.from("journal_entries").insert({
      id: entry.id, user_id: userId, text: entry.text, time: entry.time,
      date: entry.date, focus_index: entry.focusIndex, mood: entry.mood,
      focus_time: entry.focusTime ?? null,
    });
  }

  async function agentLogMedication(name: string, dose?: string) {
    const sampleIndex = focusHistory.length - 1;
    const entry: MedEntry = {
      id: Date.now().toString(), name, dose: dose ?? "",
      time: formatTime(new Date()), date: todayStr(),
      focusTime: focusHistory[Math.max(0, sampleIndex)]?.time,
      sampleIndex: Math.max(0, sampleIndex), rating: null,
    };
    setMedLog(prev => [...prev, entry]);
    await supabase.from("med_log").insert({
      id: entry.id, user_id: userId, name: entry.name, dose: entry.dose,
      time: entry.time, focus_time: entry.focusTime ?? null,
      sample_index: entry.sampleIndex, rating: null,
    });
  }

  function agentStartTimer(workMins?: number, breakMins?: number) {
    const w = workMins ?? pomodoroWorkMins;
    const b = breakMins ?? pomodoroBreakMins;
    if (workMins) setPomodoroWorkMins(w);
    if (breakMins) setPomodoroBreakMins(b);
    setPomodoroPhase("work");
    setPomodoroTimeLeft(w * 60);
    setPomodoroRunning(true);
  }

  function agentStopTimer() { setPomodoroRunning(false); }

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

  const prevJournalLenRef = useRef(0);
  useEffect(() => {
    if (!dataLoaded) { prevJournalLenRef.current = journal.length; return; }
    if (journal.length > prevJournalLenRef.current) {
      journalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevJournalLenRef.current = journal.length;
  }, [journal, dataLoaded]);

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

  // Smooth "page" scroll for the horizontal card/widget rows (dir: -1 left, +1 right)
  function scrollBox(ref: React.RefObject<HTMLDivElement | null>, dir: -1 | 1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }
  const scrollArrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute", top: "50%", transform: "translateY(-50%)", [side]: 6, zIndex: 3,
    width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(192,132,252,0.45)",
    background: "rgba(12,8,24,0.9)", color: "#c084fc", cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 13, padding: 0,
    boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
  });

  function goToLive() {
    const el = chartScrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    setIsLive(true);
  }

  const tick = useCallback(() => {
    const prev = neuralRef.current;
    let next: NeuralState;

    if (dataSourceRef.current === "self-report") {
      // Values are user-controlled — just log to history without mutating neural state
      const maxSamples = Math.round(30 * 60 / refreshRate);
      setFocusHistory(h => [...h, { time: formatTimeSec(new Date()), value: prev.focusIndex }].slice(-maxSamples));
      setSamples(s => s + 1);
      return;
    }

    if (dataSourceRef.current === "dataset") {
      const subject: DatasetSubject = eegDataset[datasetSubjectIdxRef.current];
      const sample = subject.samples[datasetPlayheadRef.current % subject.samples.length];
      datasetPlayheadRef.current++;
      // Hyperfocus risk is not in the dataset — anchor it to dataset focus + noise values
      const hfrTrend = (sample.focusIndex > 72 && sample.neuralNoise < 28) ? 0.5 : sample.focusIndex < 45 ? -0.4 : 0;
      const newHFR = parseFloat(clamp(
        prev.hyperfocusRisk + (Math.random() - 0.5) * 4 + hfrTrend, 0, 100
      ).toFixed(1));
      next = { ...sample, hyperfocusRisk: newHFR, sleepQuality: prev.sleepQuality };
    } else {
      const newTheta = drift(prev.theta, 18, 10, 180);
      const newBeta = drift(prev.beta, 18, 10, 180);

      // Mean-reverting focus simulation: target drifts slowly, focus pulls toward it
      focusTargetRef.current = clamp(
        focusTargetRef.current + (Math.random() - 0.5) * 10,
        5, 95
      );
      const focusPull = (focusTargetRef.current - prev.focusIndex) * 0.2;
      const newFocus = parseFloat(clamp(prev.focusIndex + focusPull + (Math.random() - 0.5) * 10, 0, 100).toFixed(1));

      // Working memory: higher theta = more load; drifts with slight upward pull when focus is high
      const newWML = parseFloat(clamp(
        prev.workingMemoryLoad + (Math.random() - 0.48) * 6 + (newFocus > 60 ? 0.3 : -0.2),
        0, 100
      ).toFixed(1));
      // Mental fatigue: slowly accumulates during high focus, gently recovers during low focus
      const fatigueTrend = newFocus > 65 ? 0.25 : newFocus < 30 ? -0.15 : 0.05;
      const newFatigue = parseFloat(clamp(
        prev.mentalFatigue + (Math.random() - 0.5) * 1.5 + fatigueTrend,
        0, 100
      ).toFixed(1));
      // Hyperfocus risk: spikes when focus is high + noise is low; fades otherwise
      const hfrTrend = (newFocus > 72 && prev.neuralNoise < 28) ? 0.5 : newFocus < 45 ? -0.4 : 0;
      const newHFR = parseFloat(clamp(
        prev.hyperfocusRisk + (Math.random() - 0.5) * 4 + hfrTrend,
        0, 100
      ).toFixed(1));

      next = {
        focusIndex: newFocus,
        bioEnergy: drift(prev.bioEnergy, 2, 0, 100),
        neuralNoise: drift(prev.neuralNoise, 3, 0, 80),
        tbRatio: parseFloat((newTheta / newBeta).toFixed(2)),
        theta: newTheta, beta: newBeta,
        workingMemoryLoad: newWML,
        mentalFatigue: newFatigue,
        hyperfocusRisk: newHFR,
        sleepQuality: prev.sleepQuality,
      };
    }

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

  async function submitTask() {
    if (!newTask.trim()) return;
    const title = newTask.trim();
    const description = newTaskDesc.trim() || null;
    const nextPosition = tasks.reduce((max, tk) => tk.position != null && tk.position > max ? tk.position : max, -1) + 1;
    const task: Task = {
      id: Date.now().toString(), title, description, done: false,
      estimatedMinutes: newTaskTime ? parseInt(newTaskTime) : null,
      createdAt: formatDateTime(new Date()), deadline: newTaskDeadline || undefined,
      emoji: newTaskEmoji || undefined,
      focusRequired: newTaskFocusRequired ?? estimateFocusRequired(title, description),
      position: nextPosition,
    };
    setTasks(prev => [...prev, task]);
    setNewTask(""); setNewTaskDesc("");
    setNewTaskTime(""); setNewTaskDeadline(""); setNewTaskEmoji(""); setNewTaskFocusRequired(null);
    await supabase.from("tasks").insert({
      id: task.id, user_id: userId, title: task.title, description: task.description,
      done: false, estimated_minutes: task.estimatedMinutes,
      created_at: task.createdAt, deadline: task.deadline ?? null, emoji: task.emoji ?? null,
      focus_required: task.focusRequired ?? null, position: task.position,
    });
  }

  async function addTask(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") await submitTask();
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
  // Incomplete tasks first, completed tasks at the bottom; within each group preserve position order
  const orderedVisibleTasks = useMemo(
    () => [...visibleTasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.position != null && b.position != null) return a.position - b.position;
      if (a.position != null) return -1;
      if (b.position != null) return 1;
      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    }),
    [visibleTasks]
  );
  const incompleteCount = orderedVisibleTasks.filter(t => !t.done).length;
  const canReorder = selectedDate === todayStr();
  // Map each visible task id to its list number (1-based), matching what's shown in the list
  const taskNumberById = useMemo(() => {
    const m = new Map<string, number>();
    orderedVisibleTasks.forEach((tk, i) => m.set(tk.id, i + 1));
    return m;
  }, [orderedVisibleTasks]);

  // TokInsights — deterministic observations computed from the user's own history (no API)
  const insights = useMemo<{ icon: string; text: string }[]>(() => {
    const en = lang === "en";
    const out: { icon: string; text: string }[] = [];
    const round = (n: number) => Math.round(n);
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

    // 1. Best time of day to focus (from journal entries)
    const periods = [
      { en: "the morning", zh: "早上", lo: 5, hi: 11 },
      { en: "around midday", zh: "中午", lo: 11, hi: 14 },
      { en: "the afternoon", zh: "下午", lo: 14, hi: 18 },
      { en: "the evening", zh: "晚上", lo: 18, hi: 23 },
      { en: "late at night", zh: "深夜", lo: 23, hi: 29 },
    ];
    const timed = journal.filter(e => typeof e.focusIndex === "number" && /^\d/.test(e.time ?? ""));
    if (timed.length >= 4) {
      const buckets: Record<number, number[]> = {};
      for (const e of timed) {
        let h = parseInt((e.time ?? "").slice(0, 2));
        if (isNaN(h)) continue;
        if (h < 5) h += 24;
        const pi = periods.findIndex(p => h >= p.lo && h < p.hi);
        if (pi < 0) continue;
        (buckets[pi] ??= []).push(e.focusIndex);
      }
      let best: { pi: number; avg: number } | null = null;
      for (const k of Object.keys(buckets)) {
        const pi = Number(k); const arr = buckets[pi];
        if (arr.length < 2) continue;
        const avg = mean(arr);
        if (!best || avg > best.avg) best = { pi, avg };
      }
      if (best) {
        const p = periods[best.pi];
        out.push({ icon: "⏰", text: en ? `You focus best in ${p.en} (avg ${round(best.avg)}/100).` : `你在${p.zh}最專注（平均 ${round(best.avg)}/100）。` });
      }
    }

    // 2. Which mood tracks your highest focus
    const moodFocus: Record<string, number[]> = {};
    for (const e of journal) {
      if (typeof e.focusIndex !== "number" || !Array.isArray(e.mood)) continue;
      for (const m of e.mood) (moodFocus[m] ??= []).push(e.focusIndex);
    }
    let bestMood: { m: string; avg: number } | null = null;
    for (const [m, arr] of Object.entries(moodFocus)) {
      if (arr.length < 2) continue;
      const avg = mean(arr);
      if (!bestMood || avg > bestMood.avg) bestMood = { m, avg };
    }
    if (bestMood) out.push({ icon: "🧠", text: en ? `Your focus peaks when you feel "${bestMood.m}" (avg ${round(bestMood.avg)}).` : `當你感到「${bestMood.m}」時專注力最高（平均 ${round(bestMood.avg)}）。` });

    // 3. Task completion rate
    if (tasks.length > 0) {
      const done = tasks.filter(t => t.done).length;
      out.push({ icon: "✓", text: en ? `You've completed ${done} of ${tasks.length} tasks (${round(done / tasks.length * 100)}%).` : `你已完成 ${tasks.length} 項任務中的 ${done} 項（${round(done / tasks.length * 100)}%）。` });
    }

    // 4. Pending tasks demand more focus than finished ones
    const doneFR = tasks.filter(t => t.done && t.focusRequired != null).map(t => t.focusRequired as number);
    const pendFR = tasks.filter(t => !t.done && t.focusRequired != null).map(t => t.focusRequired as number);
    if (doneFR.length >= 2 && pendFR.length >= 2) {
      const da = round(mean(doneFR)), pa = round(mean(pendFR));
      if (pa - da >= 8) out.push({ icon: "⚡", text: en ? `Your unfinished tasks need more focus than the ones you finish (${pa} vs ${da}) — save them for a peak window.` : `你未完成的任務所需專注度高於已完成的（${pa} 對 ${da}）— 留到專注高峰再做。` });
    }

    // 5. Most-logged substance
    if (medLog.length >= 2) {
      const counts: Record<string, number> = {};
      for (const m of medLog) counts[m.name] = (counts[m.name] || 0) + 1;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) out.push({ icon: "💊", text: en ? `Most logged: ${top[0]} (${top[1]}×).` : `最常記錄：${top[0]}（${top[1]} 次）。` });
    }

    // 6. This session's focus peak (live data)
    if (focusHistory.length >= 5) {
      const peak = round(Math.max(...focusHistory.map(p => p.value)));
      out.push({ icon: "📈", text: en ? `This session's focus peaked at ${peak}/100.` : `本次階段專注峰值 ${peak}/100。` });
    }

    // 7. TokTimer focus blocks today
    const todayBlocks = focusSessions.filter(s => s.date === todayStr());
    if (todayBlocks.length >= 1) {
      const mins = todayBlocks.reduce((a, s) => a + s.minutes, 0);
      out.push({ icon: "⏱", text: en ? `${todayBlocks.length} focus block${todayBlocks.length > 1 ? "s" : ""} today — ${mins} min focused.` : `今天完成 ${todayBlocks.length} 個專注時段 — 共 ${mins} 分鐘。` });
    }

    // 8. Where your focus time goes (by task)
    const byTask: Record<string, number> = {};
    for (const s of focusSessions) if (s.taskTitle) byTask[s.taskTitle] = (byTask[s.taskTitle] || 0) + s.minutes;
    const topTask = Object.entries(byTask).sort((a, b) => b[1] - a[1])[0];
    if (topTask && topTask[1] >= 25) out.push({ icon: "🎯", text: en ? `Most focus time goes to "${topTask[0]}" (${topTask[1]} min).` : `最多專注時間花在「${topTask[0]}」（${topTask[1]} 分鐘）。` });

    // 9. When you run focus blocks
    if (focusSessions.length >= 4) {
      const periods = [
        { en: "the morning", zh: "早上", lo: 5, hi: 11 },
        { en: "around midday", zh: "中午", lo: 11, hi: 14 },
        { en: "the afternoon", zh: "下午", lo: 14, hi: 18 },
        { en: "the evening", zh: "晚上", lo: 18, hi: 23 },
        { en: "late at night", zh: "深夜", lo: 23, hi: 29 },
      ];
      const counts: Record<number, number> = {};
      for (const s of focusSessions) {
        let h = parseInt((s.time ?? "").slice(0, 2)); if (isNaN(h)) continue; if (h < 5) h += 24;
        const pi = periods.findIndex(p => h >= p.lo && h < p.hi); if (pi >= 0) counts[pi] = (counts[pi] || 0) + 1;
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top && Number(top[1]) >= 2) { const p = periods[Number(top[0])]; out.push({ icon: "🗓", text: en ? `You run most focus blocks in ${p.en}.` : `你多數的專注時段在${p.zh}。` }); }
    }

    return out;
  }, [journal, tasks, medLog, focusHistory, focusSessions, lang]);

  // TokTimer derived values
  const activeTask = activeTaskId ? (tasks.find(t => t.id === activeTaskId) ?? null) : null;
  const todaySessions = focusSessions.filter(s => s.date === todayStr());
  const todayFocusMin = todaySessions.reduce((a, s) => a + s.minutes, 0);
  const timerInFlow = pomodoroRunning && pomodoroPhase === "work" && neural.focusIndex > 65;
  const timerLowFocus = pomodoroRunning && pomodoroPhase === "work" && neural.focusIndex < 35;
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
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(135deg, #0c0818 0%, #100a25 50%, #080614 100%)", fontFamily: "var(--font-body)", color: "#c8d8e8" }}>

      {/* ── Sidebar (desktop only) ── */}
      <aside style={{ width: 240, minWidth: 240, borderRight: "1px solid rgba(192,132,252,0.15)", display: isMobile ? "none" : "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
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
        </div>{/* end scrollable content */}

        {/* Pinned bottom user section */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(192,132,252,0.15)", display: "flex", flexDirection: "column", gap: 10, background: "linear-gradient(0deg, #0c0818, #0e0920)" }}>
          <div onClick={() => setShowProfileModal(true)} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.5)", letterSpacing: 0.5, wordBreak: "break-all", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#c084fc")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(90,143,168,0.5)")}>
            <UserCircle size={13} style={{ flexShrink: 0 }} />
            {session.user.email}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 8 }}>
            <img src="/tok-en.png" alt="TokEn" style={{ width: 30, height: 30, flexShrink: 0 }} />
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, letterSpacing: 2 }}>
              <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>ENS</span>
              <span style={{ color: "#c084fc" }}>: {tokEn}</span>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ width: "100%", padding: "9px 0", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#f87171", letterSpacing: 2, cursor: "pointer", transition: "background 0.2s, border-color 0.2s" }}
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {pomodoroRunning && (
                  <button onClick={() => widgetScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" })} title={lang === "en" ? "TokTimer" : "前往 TokTimer"}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: pomodoroPhase === "work" ? "rgba(192,132,252,0.12)" : "rgba(110,231,183,0.12)", border: `1px solid ${pomodoroPhase === "work" ? "rgba(192,132,252,0.5)" : "rgba(110,231,183,0.5)"}`, borderRadius: 5, color: pomodoroPhase === "work" ? "#c084fc" : "#6ee7b7", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>
                    ⏱ {String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, "0")}:{String(pomodoroTimeLeft % 60).padStart(2, "0")}
                  </button>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8" }}>{t.liveStream}</span>
                  <Toggle checked={liveStream} onChange={setLiveStream} />
                </div>
                <LangToggle lang={lang} setLang={setLang} />
              </div>
            </div>
            <div style={{ padding: "6px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div onClick={() => setShowProfileModal(true)} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(90,143,168,0.5)", letterSpacing: 0.5, cursor: "pointer" }}>
                  <UserCircle size={13} style={{ flexShrink: 0 }} />
                  {session.user.email}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <img src="/tok-en.png" alt="TokEn" style={{ width: 24, height: 24, flexShrink: 0 }} />
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 2 }}>
                    <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>ENS</span>
                    <span style={{ color: "#c084fc" }}>: {tokEn}</span>
                  </div>
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
        <div style={{ padding: isMobile ? "16px" : "24px 28px", paddingBottom: isMobile ? 74 : 70, display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>

          {/* Desktop header */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <h1 style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 52, fontWeight: 700, letterSpacing: 14, textShadow: "0 0 30px rgba(192,132,252,0.4), 0 0 60px rgba(192,132,252,0.15)", margin: 0, flexShrink: 0 }}>
                <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>AI</span>
              </h1>
              {/* Data source selector — desktop; mobile version is below */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.7)", letterSpacing: 2, flexShrink: 0 }}>
                    {lang === "en" ? "DATA SOURCE:" : "資料來源："}
                  </span>
                  <div style={{ display: "flex", background: "rgba(12,8,24,0.8)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 8, overflow: "visible" }}>
                    {/* SELF-REPORT */}
                    <button
                      onClick={() => { setDataSource("self-report"); setCheckInDraft(selfReport); setShowCheckIn(true); datasetPlayheadRef.current = 0; setDatasetDropdownOpen(false); }}
                      style={{
                        padding: "8px 20px", border: "none", borderRight: "1px solid rgba(192,132,252,0.2)", borderRadius: "8px 0 0 8px",
                        background: dataSource === "self-report" ? "rgba(192,132,252,0.18)" : "transparent",
                        color: dataSource === "self-report" ? "#c084fc" : "rgba(90,143,168,0.7)",
                        fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1.5,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {dataSource === "self-report" && <span style={{ marginRight: 6, fontSize: 9 }}>●</span>}
                      {t.selfReport}
                    </button>
                    {/* SIMULATED */}
                    <button
                      onClick={() => { setDataSource("simulated"); datasetPlayheadRef.current = 0; setDatasetDropdownOpen(false); }}
                      style={{
                        padding: "8px 20px", border: "none", borderRight: "1px solid rgba(192,132,252,0.2)",
                        background: dataSource === "simulated" ? "rgba(192,132,252,0.18)" : "transparent",
                        color: dataSource === "simulated" ? "#c084fc" : "rgba(90,143,168,0.7)",
                        fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1.5,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {dataSource === "simulated" && <span style={{ marginRight: 6, fontSize: 9 }}>●</span>}
                      SIMULATED
                    </button>
                    <div ref={datasetDropdownRef} style={{ position: "relative" }}>
                      <button
                        onClick={() => { setDataSource("dataset"); setDatasetDropdownOpen(o => !o); }}
                        style={{
                          padding: "8px 20px", border: "none", borderRight: "1px solid rgba(192,132,252,0.2)",
                          background: dataSource === "dataset" ? "rgba(192,132,252,0.18)" : "transparent",
                          color: dataSource === "dataset" ? "#c084fc" : "rgba(90,143,168,0.7)",
                          fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1.5,
                          cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 7,
                        }}
                      >
                        {dataSource === "dataset" && <span style={{ fontSize: 9 }}>●</span>}
                        DATASET
                        <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                      </button>
                      {datasetDropdownOpen && (
                        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200, background: "#120d28", border: "1px solid rgba(192,132,252,0.35)", borderRadius: 8, padding: "6px 0", minWidth: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                          {eegDataset.map((s, i) => (
                            <button
                              key={s.id}
                              onClick={() => { setDatasetSubjectIdx(i); datasetPlayheadRef.current = 0; setDatasetDropdownOpen(false); }}
                              style={{
                                width: "100%", padding: "9px 16px", border: "none", background: datasetSubjectIdx === i && dataSource === "dataset" ? "rgba(192,132,252,0.12)" : "transparent",
                                color: datasetSubjectIdx === i && dataSource === "dataset" ? "#c084fc" : "#c8d8e8",
                                fontFamily: "'Share Tech Mono', monospace", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 3,
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={e => { (e.currentTarget.style.background = "rgba(192,132,252,0.08)"); }}
                              onMouseLeave={e => { (e.currentTarget.style.background = datasetSubjectIdx === i && dataSource === "dataset" ? "rgba(192,132,252,0.12)" : "transparent"); }}
                            >
                              <span style={{ fontSize: 11, letterSpacing: 1 }}>{datasetSubjectIdx === i && dataSource === "dataset" ? "● " : "  "}{s.label}</span>
                              <span style={{ fontSize: 9, color: "rgba(90,143,168,0.6)", letterSpacing: 0.5 }}>{s.description}</span>
                            </button>
                          ))}
                          <div style={{ borderTop: "1px solid rgba(192,132,252,0.15)", margin: "6px 0 0", padding: "6px 16px 2px" }}>
                            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "rgba(90,143,168,0.45)", letterSpacing: 1 }}>SOURCE: STEW + DEAP</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      disabled
                      title={lang === "en" ? "Available in Beta — connect your EEG headset" : "Beta 版本提供 — 連接你的 EEG 裝置"}
                      style={{
                        padding: "8px 20px", border: "none", borderRadius: "0 8px 8px 0",
                        background: "transparent", color: "rgba(90,143,168,0.3)",
                        fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1.5,
                        cursor: "not-allowed",
                      }}
                    >
                      MY BCI
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {pomodoroRunning && (
                  <button onClick={() => widgetScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" })} title={lang === "en" ? "Go to TokTimer" : "前往 TokTimer"}
                    style={{ display: "flex", alignItems: "center", gap: 6, alignSelf: "stretch", padding: "0 12px", background: pomodoroPhase === "work" ? "rgba(192,132,252,0.12)" : "rgba(110,231,183,0.12)", border: `1px solid ${pomodoroPhase === "work" ? "rgba(192,132,252,0.5)" : "rgba(110,231,183,0.5)"}`, borderRadius: 6, color: pomodoroPhase === "work" ? "#c084fc" : "#6ee7b7", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1, cursor: "pointer" }}>
                    ⏱ {String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, "0")}:{String(pomodoroTimeLeft % 60).padStart(2, "0")}
                  </button>
                )}
                <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  style={{ alignSelf: "stretch", padding: "0 14px", background: "#120d28", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", outline: "none", colorScheme: "dark" }}>
                  {availableDates.map(date => (
                    <option key={date} value={date}>{formatDayLabel(date, lang)}</option>
                  ))}
                </select>
                <LangToggle lang={lang} setLang={setLang} />
              </div>
            </div>
          )}

          {/* Data source selector — mobile only; desktop version lives in the main header */}
          {isMobile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.7)", letterSpacing: 2, flexShrink: 0 }}>
                {lang === "en" ? "DATA SOURCE:" : "資料來源："}
              </span>
              <div style={{ display: "flex", background: "rgba(12,8,24,0.8)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 8, overflow: "visible" }}>

                {/* SELF-REPORT */}
                <button
                  onClick={() => { setDataSource("self-report"); setCheckInDraft(selfReport); setShowCheckIn(true); datasetPlayheadRef.current = 0; setDatasetDropdownOpen(false); }}
                  style={{
                    padding: "8px 14px", border: "none", borderRight: "1px solid rgba(192,132,252,0.2)", borderRadius: "8px 0 0 8px",
                    background: dataSource === "self-report" ? "rgba(192,132,252,0.18)" : "transparent",
                    color: dataSource === "self-report" ? "#c084fc" : "rgba(90,143,168,0.7)",
                    fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {dataSource === "self-report" && <span style={{ marginRight: 5, fontSize: 9 }}>●</span>}
                  {t.selfReport}
                </button>

                {/* SIMULATED */}
                <button
                  onClick={() => { setDataSource("simulated"); datasetPlayheadRef.current = 0; setDatasetDropdownOpen(false); }}
                  style={{
                    padding: "8px 14px", border: "none", borderRight: "1px solid rgba(192,132,252,0.2)",
                    background: dataSource === "simulated" ? "rgba(192,132,252,0.18)" : "transparent",
                    color: dataSource === "simulated" ? "#c084fc" : "rgba(90,143,168,0.7)",
                    fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {dataSource === "simulated" && <span style={{ marginRight: 5, fontSize: 9 }}>●</span>}
                  SIMULATED
                </button>

                {/* DATASET — dropdown trigger */}
                <div ref={datasetDropdownRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => { setDataSource("dataset"); setDatasetDropdownOpen(o => !o); }}
                    style={{
                      padding: "8px 14px", border: "none", borderRight: "1px solid rgba(192,132,252,0.2)",
                      background: dataSource === "dataset" ? "rgba(192,132,252,0.18)" : "transparent",
                      color: dataSource === "dataset" ? "#c084fc" : "rgba(90,143,168,0.7)",
                      fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1,
                      cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {dataSource === "dataset" && <span style={{ fontSize: 9 }}>●</span>}
                    DATASET
                    <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                  </button>
                  {datasetDropdownOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200, background: "#120d28", border: "1px solid rgba(192,132,252,0.35)", borderRadius: 8, padding: "6px 0", minWidth: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                      {eegDataset.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => { setDatasetSubjectIdx(i); datasetPlayheadRef.current = 0; setDatasetDropdownOpen(false); }}
                          style={{
                            width: "100%", padding: "9px 16px", border: "none", background: datasetSubjectIdx === i && dataSource === "dataset" ? "rgba(192,132,252,0.12)" : "transparent",
                            color: datasetSubjectIdx === i && dataSource === "dataset" ? "#c084fc" : "#c8d8e8",
                            fontFamily: "'Share Tech Mono', monospace", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 3,
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={e => { (e.currentTarget.style.background = "rgba(192,132,252,0.08)"); }}
                          onMouseLeave={e => { (e.currentTarget.style.background = datasetSubjectIdx === i && dataSource === "dataset" ? "rgba(192,132,252,0.12)" : "transparent"); }}
                        >
                          <span style={{ fontSize: 11, letterSpacing: 1 }}>{datasetSubjectIdx === i && dataSource === "dataset" ? "● " : "  "}{s.label}</span>
                          <span style={{ fontSize: 9, color: "rgba(90,143,168,0.6)", letterSpacing: 0.5 }}>{s.description}</span>
                        </button>
                      ))}
                      <div style={{ borderTop: "1px solid rgba(192,132,252,0.15)", margin: "6px 0 0", padding: "6px 16px 2px" }}>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "rgba(90,143,168,0.45)", letterSpacing: 1 }}>SOURCE: STEW + DEAP</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* MY BCI — disabled */}
                <button
                  disabled
                  title={lang === "en" ? "Available in Beta — connect your EEG headset" : "Beta 版本提供 — 連接你的 EEG 裝置"}
                  style={{
                    padding: "8px 14px", border: "none", borderRadius: "0 8px 8px 0",
                    background: "transparent", color: "rgba(90,143,168,0.3)",
                    fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1,
                    cursor: "not-allowed",
                  }}
                >
                  MY BCI
                </button>

              </div>
            </div>
          </div>
          )}

          {/* Metric cards — horizontal scroll, ~5 visible */}
          <div style={{ position: "relative" }}>
            <div ref={metricScrollRef} style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
              <MetricCard title={t.focusIndex} icon={<Crosshair size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].focusIndex)}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                  {neural.focusIndex.toFixed(1)}<span style={{ fontSize: 15, color: "#5a8fa8" }}>/100</span>
                </div>
                <Badge color={focusInfo.color}>{focusInfo.label}</Badge>
              </MetricCard>

              <MetricCard title={t.sleepQuality} icon={<Moon size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].sleepQuality)}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                  {Math.round(neural.sleepQuality)}<span style={{ fontSize: 15, color: "#5a8fa8" }}>/100</span>
                </div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.5)", letterSpacing: 1, marginBottom: 6 }}>
                  {t.sleepLastNight}
                </div>
                <Badge color={neural.sleepQuality > 70 ? "#67e8f9" : neural.sleepQuality > 45 ? "#4ade80" : neural.sleepQuality > 25 ? "#fbbf24" : "#f472b6"}>
                  {neural.sleepQuality > 70 ? t.sleepWell : neural.sleepQuality > 45 ? t.sleepOk : neural.sleepQuality > 25 ? t.sleepPoor : t.sleepExhausted}
                </Badge>
              </MetricCard>

              <MetricCard title={t.bioEnergy} icon={<Zap size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].bioEnergy)}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                  {Math.round(neural.bioEnergy)}<span style={{ fontSize: 15, color: "#5a8fa8" }}>%</span>
                </div>
                <div style={{ height: 4, background: "rgba(192,132,252,0.1)", borderRadius: 2, marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${neural.bioEnergy}%`, background: "linear-gradient(90deg, #c084fc, #7c3aed)", borderRadius: 2, transition: "width 0.5s ease" }} />
                </div>
                <Badge color={neural.bioEnergy > 65 ? "#4ade80" : neural.bioEnergy > 35 ? "#fbbf24" : "#f472b6"}>
                  {neural.bioEnergy > 65 ? t.bioHigh : neural.bioEnergy > 35 ? t.bioMed : t.bioLow}
                </Badge>
              </MetricCard>

              <MetricCard title={t.mentalFatigue} icon={<Activity size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].mentalFatigue)}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                  {neural.mentalFatigue.toFixed(1)}<span style={{ fontSize: 15, color: "#5a8fa8" }}>/100</span>
                </div>
                <div style={{ height: 4, background: "rgba(192,132,252,0.1)", borderRadius: 2, marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${neural.mentalFatigue}%`, background: neural.mentalFatigue > 65 ? "linear-gradient(90deg, #f472b6, #c084fc)" : "linear-gradient(90deg, #4ade80, #c084fc)", borderRadius: 2, transition: "width 0.5s ease" }} />
                </div>
                <Badge color={neural.mentalFatigue > 65 ? "#f472b6" : neural.mentalFatigue > 40 ? "#ffa040" : "#4ade80"}>
                  {neural.mentalFatigue > 65 ? t.fatHigh : neural.mentalFatigue > 40 ? t.fatMed : t.fatLow}
                </Badge>
              </MetricCard>

              <MetricCard title={t.workingMemory} icon={<Brain size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].workingMemory)}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                  {neural.workingMemoryLoad.toFixed(1)}<span style={{ fontSize: 15, color: "#5a8fa8" }}>/100</span>
                </div>
                <Badge color={neural.workingMemoryLoad > 65 ? "#f472b6" : neural.workingMemoryLoad > 40 ? "#ffa040" : "#4ade80"}>
                  {neural.workingMemoryLoad > 65 ? t.wmlHigh : neural.workingMemoryLoad > 40 ? t.wmlMed : t.wmlLow}
                </Badge>
              </MetricCard>

              <MetricCard title={t.neuralNoise} icon={<Waves size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].neuralNoise)} dimmed={dataSource === "self-report"}>
                {dataSource === "self-report" ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "rgba(90,143,168,0.5)", marginBottom: 8 }}>—</div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.5)", letterSpacing: 2 }}>{t.bciOnly}</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                      {Math.round(neural.neuralNoise)}<span style={{ fontSize: 13, color: "#5a8fa8" }}> μV²</span>
                    </div>
                    <Badge color={noiseInfo.color}>{noiseInfo.label}</Badge>
                  </>
                )}
              </MetricCard>

              <MetricCard title={t.tbRatio} icon={<BarChart2 size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].tbRatio)} dimmed={dataSource === "self-report"}>
                {dataSource === "self-report" ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "rgba(90,143,168,0.5)", marginBottom: 8 }}>—</div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.5)", letterSpacing: 2 }}>{t.bciOnly}</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>{neural.tbRatio}</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1, marginBottom: 6 }}>
                      θ:{neural.theta.toFixed(1)}  β:{neural.beta.toFixed(1)}
                    </div>
                    <Badge color={tbrInfo.color}>{tbrInfo.label}</Badge>
                  </>
                )}
              </MetricCard>

              <MetricCard title={t.focusWindow} icon={<Clock size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].focusWindow)} dimmed={dataSource === "self-report"}>
                {dataSource === "self-report" ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "rgba(90,143,168,0.5)", marginBottom: 8 }}>—</div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.5)", letterSpacing: 2 }}>{t.bciOnly}</span>
                  </>
                ) : (() => {
                    const windowMins = Math.max(3, Math.round((80 - neural.focusIndex) / 2));
                    return (
                      <>
                        <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8, lineHeight: 1.2 }}>
                          {focusHistory.length < 6 ? t.collectingData : `~${windowMins} min`}
                        </div>
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1, marginBottom: 8 }}>
                          {focusHistory.length < 6 ? t.streamMoreSamples : `${t.confidence} ${Math.min(99, Math.round(50 + samples * 1.2))}%`}
                        </div>
                        <Badge color={focusHistory.length < 6 ? "#5a8fa8" : windowMins >= 20 ? "#4ade80" : windowMins >= 10 ? "#fbbf24" : "#f472b6"}>
                          {focusHistory.length < 6 ? t.fwCalib : windowMins >= 20 ? t.fwLong : windowMins >= 10 ? t.fwMed : t.fwShort}
                        </Badge>
                      </>
                    );
                  })()}
              </MetricCard>

              <MetricCard title={t.hyperfocusRisk} icon={<Crosshair size={12} color="#5a8fa8" />} onInfo={() => setInfoModal(INFO[lang].hyperfocusRisk)} dimmed={dataSource === "self-report"}>
                {dataSource === "self-report" ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "rgba(90,143,168,0.5)", marginBottom: 8 }}>—</div>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.5)", letterSpacing: 2 }}>{t.bciOnly}</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
                      {neural.hyperfocusRisk.toFixed(1)}<span style={{ fontSize: 15, color: "#5a8fa8" }}>%</span>
                    </div>
                    <Badge color={neural.hyperfocusRisk > 65 ? "#f472b6" : neural.hyperfocusRisk > 35 ? "#fbbf24" : "#4ade80"}>
                      {neural.hyperfocusRisk > 65 ? t.hfrHigh : neural.hyperfocusRisk > 35 ? t.hfrMed : t.hfrLow}
                    </Badge>
                  </>
                )}
              </MetricCard>
            </div>
            {/* Fade hints — appear only when there are more cards in that direction */}
            {metricFade.left && <div style={{ position: "absolute", left: 0, top: 0, bottom: 4, width: 48, background: "linear-gradient(to left, transparent, rgba(8,6,20,0.85))", pointerEvents: "none" }} />}
            {metricFade.right && <div style={{ position: "absolute", right: 0, top: 0, bottom: 4, width: 48, background: "linear-gradient(to right, transparent, rgba(8,6,20,0.85))", pointerEvents: "none" }} />}
            {metricFade.left && <button onClick={() => scrollBox(metricScrollRef, -1)} title={lang === "en" ? "Scroll left" : "向左捲動"} style={scrollArrowStyle("left")}>◀</button>}
            {metricFade.right && <button onClick={() => scrollBox(metricScrollRef, 1)} title={lang === "en" ? "Scroll right" : "向右捲動"} style={scrollArrowStyle("right")}>▶</button>}
          </div>

          {/* Focus stream — full width */}
          <div style={{ minWidth: 0 }}>
            <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 10, padding: 10, position: "relative" }}>
              {/* Overlaid header — floats over the empty top band of the chart */}
              <div style={{ position: "absolute", top: 8, left: 12, zIndex: 2, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", maxWidth: "calc(100% - 96px)", background: "rgba(12,8,24,0.55)", borderRadius: 6, padding: "3px 9px", backdropFilter: "blur(2px)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 2 }}><Activity size={14} color="#c084fc" /><span>{t.focusStream}</span></span>
                {avgFocus !== null && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "rgba(192,132,252,0.9)", letterSpacing: 1 }}>{lang === "en" ? "5m avg" : "5分均值"} {avgFocus}</span>}
                {sessionAvg !== null && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "rgba(56,189,248,0.95)", letterSpacing: 1 }}>{lang === "en" ? "session avg" : "階段均值"} {sessionAvg}</span>}
                {dayAvg !== null && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "rgba(74,222,128,0.95)", letterSpacing: 1 }}>{lang === "en" ? "day avg" : "日均值"} {dayAvg}</span>}
              </div>
              {/* Top-right: live value + info */}
              <div style={{ position: "absolute", top: 8, right: 10, zIndex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", background: "rgba(12,8,24,0.55)", borderRadius: 5, padding: "2px 6px" }}>{neural.focusIndex.toFixed(1)}</span>
                <InfoButton onClick={() => setInfoModal(INFO[lang].focusStream)} />
              </div>
              <div ref={chartWrapRef} style={{ width: "100%", position: "relative" }}>
                <div ref={chartScrollRef} style={{ width: chartWrapWidth, height: 140, overflowX: "scroll", overflowY: "hidden" }}
                  onScroll={e => {
                    const el = e.currentTarget;
                    const atRight = el.scrollWidth - el.scrollLeft - el.clientWidth < 80;
                    if (!atRight) setIsLive(false);
                  }}>
                  <div style={{ width: chartWidth, height: 140, position: "relative" }}>
                    <LineChart width={chartWidth} height={140} data={focusHistory} margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
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
                              <div key={med.id} style={{ position: "absolute", left: x, top: 8, height: 114, width: 0, borderLeft: "1.5px dashed rgba(251,191,36,0.9)", pointerEvents: "none" }}>
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
                              <div key={"note_" + entry.id} style={{ position: "absolute", left: x, top: 8, height: 114, width: 0, borderLeft: "1.5px dashed rgba(100,220,180,0.75)", pointerEvents: "none" }}>
                                <span style={{ position: "absolute", top: 2, right: 3, fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#6ee7b7", whiteSpace: "nowrap" }}>✎</span>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
                {/* Side-overlay scroll arrows (match the metric/widget rows) */}
                <button onClick={() => scrollBox(chartScrollRef, -1)} title={lang === "en" ? "Scroll left" : "向左捲動"} style={scrollArrowStyle("left")}>◀</button>
                <button onClick={() => scrollBox(chartScrollRef, 1)} title={lang === "en" ? "Scroll right" : "向右捲動"} style={scrollArrowStyle("right")}>▶</button>
                {/* Jump-to-live (corner overlay) */}
                <button onClick={goToLive} title="Jump to live"
                  style={{ position: "absolute", bottom: 6, right: 8, zIndex: 3, padding: "3px 11px", background: isLive ? "rgba(192,132,252,0.25)" : "rgba(12,8,24,0.85)", border: `1px solid ${isLive ? "rgba(192,132,252,0.7)" : "rgba(192,132,252,0.35)"}`, borderRadius: 5, color: isLive ? "#c084fc" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1, cursor: "pointer", transition: "all 0.2s" }}>
                  {t.goLive}
                </button>
              </div>
            </div>
          </div>

          {/* Day selector — mobile only; desktop version lives in main header */}
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

          {/* Widget row — TokNote · TokMed · TokInsights (horizontal scroll) */}
          <div style={{ position: "relative" }}>
          <div ref={widgetScrollRef} style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>

          {/* TokTimer */}
          <div style={{ flex: isMobile ? "0 0 100%" : "0 0 calc(50% - 7px)", background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(192,132,252,0.07)", display: "flex", flexDirection: "column", height: 480 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(192,132,252,0.15)", display: "flex", alignItems: "center", gap: 10, background: "rgba(192,132,252,0.03)", flexShrink: 0 }}>
              <Clock size={16} color="#c084fc" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, flex: 1 }}>
                <span style={{ color: "#7c3aed" }}>TOK</span>
                <span style={{ color: "#c084fc" }}>{lang === "en" ? "TIMER" : "TIMER · 計時器"}</span>
              </span>
              <InfoButton onClick={() => setInfoModal(INFO[lang].tokTimer)} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 13, padding: "16px 22px", overflowY: "auto" }}>
              {/* Working on (active task) */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#7c3aed", letterSpacing: 1.5, flexShrink: 0 }}>{lang === "en" ? "WORKING ON" : "進行中"}</span>
                {activeTask
                  ? <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#c8d8e8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 210 }}>{activeTask.emoji ? activeTask.emoji + " " : ""}{activeTask.title}</span>
                  : <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.6)" }}>{lang === "en" ? "— none —" : "— 無 —"}</span>}
              </div>

              {/* Phase + cycle dots */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 3, color: timerInFlow ? "#fbbf24" : (pomodoroPhase === "work" ? "#c084fc" : "#6ee7b7"), transition: "color 0.3s" }}>
                  {timerInFlow ? (lang === "en" ? "🔥 IN FLOW" : "🔥 心流") : (pomodoroPhase === "work" ? t.pomoFocus : pomodoroCount % 4 === 0 ? t.pomoLongBreak : t.pomoBreak)}
                </span>
                <div style={{ display: "flex", gap: 7 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i < (pomodoroCount % 4) ? "#c084fc" : "rgba(192,132,252,0.2)", transition: "background 0.3s" }} />
                  ))}
                </div>
              </div>

              {/* Countdown */}
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 54, color: "#c8d8e8", textAlign: "center", letterSpacing: 4, lineHeight: 1, textShadow: pomodoroRunning ? "0 0 22px rgba(192,132,252,0.45)" : "none", transition: "text-shadow 0.3s" }}>
                {String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, "0")}:{String(pomodoroTimeLeft % 60).padStart(2, "0")}
              </div>

              {/* Focus-aware: low-focus early-break prompt */}
              {timerLowFocus && (
                <button onClick={breakEarly}
                  style={{ padding: "6px 12px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.5)", borderRadius: 6, color: "#fbbf24", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 0.5, cursor: "pointer" }}>
                  ⚠ {lang === "en" ? `Focus low (${neural.focusIndex.toFixed(0)}) — break early?` : `專注偏低（${neural.focusIndex.toFixed(0)}）— 提早休息？`}
                </button>
              )}

              {/* Extend (while a work block runs) */}
              {pomodoroRunning && pomodoroPhase === "work" && (
                <button onClick={() => extendTimer(5 * 60)}
                  style={{ padding: "5px 12px", background: timerInFlow ? "rgba(251,191,36,0.14)" : "transparent", border: `1px solid ${timerInFlow ? "rgba(251,191,36,0.5)" : "rgba(192,132,252,0.3)"}`, borderRadius: 6, color: timerInFlow ? "#fbbf24" : "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>
                  +5 {lang === "en" ? "min" : "分"}
                </button>
              )}

              {/* Settings (only when stopped) */}
              {!pomodoroRunning && (<>
                <div style={{ display: "flex", gap: 6 }}>
                  {[[25, 5], [50, 10], [90, 20]].map(([w, b]) => {
                    const on = pomodoroWorkMins === w && pomodoroBreakMins === b;
                    return (
                      <button key={w} onClick={() => { setPomodoroWorkMins(w); setPomodoroBreakMins(b); setPomodoroTimeLeft((pomodoroPhase === "work" ? w : b) * 60); }}
                        style={{ padding: "4px 9px", background: on ? "rgba(192,132,252,0.2)" : "transparent", border: `1px solid ${on ? "rgba(192,132,252,0.6)" : "rgba(192,132,252,0.2)"}`, borderRadius: 5, color: on ? "#c084fc" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, cursor: "pointer" }}>{w}/{b}</button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1 }}>{t.pomoWorkLabel}</span>
                  <input type="number" min={1} max={90} value={pomodoroWorkMins}
                    onChange={e => { const v = Math.max(1, Math.min(90, parseInt(e.target.value) || 1)); setPomodoroWorkMins(v); if (pomodoroPhase === "work") setPomodoroTimeLeft(v * 60); }}
                    style={{ width: 46, padding: "3px 6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none", textAlign: "center" }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1 }}>{t.pomoBreakLabel}</span>
                  <input type="number" min={1} max={30} value={pomodoroBreakMins}
                    onChange={e => { const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1)); setPomodoroBreakMins(v); if (pomodoroPhase === "break") setPomodoroTimeLeft(v * 60); }}
                    style={{ width: 40, padding: "3px 6px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 3, color: "#6ee7b7", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none", textAlign: "center" }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.5)" }}>min</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setPomodoroAutoContinue(v => !v)}
                    style={{ padding: "4px 10px", background: pomodoroAutoContinue ? "rgba(192,132,252,0.18)" : "transparent", border: `1px solid ${pomodoroAutoContinue ? "rgba(192,132,252,0.55)" : "rgba(192,132,252,0.2)"}`, borderRadius: 5, color: pomodoroAutoContinue ? "#c084fc" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 0.5, cursor: "pointer" }}>
                    ↻ {lang === "en" ? "auto-continue" : "自動接續"} {pomodoroAutoContinue ? "ON" : "OFF"}
                  </button>
                  <button onClick={() => setPomodoroSound(v => !v)} title={lang === "en" ? "Sound" : "音效"}
                    style={{ padding: "4px 9px", background: "transparent", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 5, fontSize: 13, cursor: "pointer", lineHeight: 1 }}>
                    {pomodoroSound ? "🔔" : "🔕"}
                  </button>
                </div>
              </>)}

              {/* Start/pause + reset */}
              <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 280 }}>
                <button onClick={() => setPomodoroRunning(r => !r)}
                  style={{ flex: 1, padding: "10px 0", background: pomodoroRunning ? "rgba(192,132,252,0.12)" : "rgba(192,132,252,0.18)", border: "1px solid rgba(192,132,252,0.5)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1, cursor: "pointer", transition: "background 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(192,132,252,0.28)")}
                  onMouseLeave={e => (e.currentTarget.style.background = pomodoroRunning ? "rgba(192,132,252,0.12)" : "rgba(192,132,252,0.18)")}>
                  {pomodoroRunning ? t.pomoPause : t.pomoStart}
                </button>
                <button onClick={() => { setPomodoroRunning(false); setPomodoroPhase("work"); pomodoroPhaseRef.current = "work"; setPomodoroTimeLeft(pomodoroWorkMins * 60); setPomodoroCount(0); pomodoroCountRef.current = 0; }}
                  style={{ padding: "10px 16px", background: "transparent", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(192,132,252,0.5)"; e.currentTarget.style.color = "#c084fc"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(192,132,252,0.25)"; e.currentTarget.style.color = "#5a8fa8"; }}>
                  ↺
                </button>
              </div>

              {/* Today's focus blocks */}
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1 }}>
                {lang === "en" ? `TODAY · ${todaySessions.length} block${todaySessions.length === 1 ? "" : "s"} · ${todayFocusMin} min` : `今天 · ${todaySessions.length} 段 · ${todayFocusMin} 分鐘`}
              </div>
            </div>
          </div>

          {/* TokNote */}
          <div style={{ flex: isMobile ? "0 0 100%" : "0 0 calc(50% - 7px)", background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(192,132,252,0.07)", display: "flex", flexDirection: "column", height: 480 }}>
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
              <p style={{ margin: 0, fontSize: 15, color: "rgba(200,216,232,0.7)", lineHeight: 1.6, fontStyle: "italic", fontFamily: "var(--font-body)" }}>
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
                  <span style={{ fontSize: 13, color: "rgba(200,216,232,0.7)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>{moodAssessment.suggestion}</span>
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
                        style={{ width: "100%", minHeight: 60, padding: "4px 0", background: "transparent", border: "none", borderBottom: "1px solid rgba(192,132,252,0.4)", color: "#d0e8f8", fontFamily: "var(--font-body)", fontSize: 15, outline: "none", resize: "none", boxSizing: "border-box" }}
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
                      <p style={{ margin: 0, fontSize: 16, color: "#c8d8e8", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>{entry.text}</p>
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
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(192,132,252,0.15)", display: "flex", flexDirection: "column", gap: 6, background: "rgba(0,0,0,0.15)", flexShrink: 0 }}>
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
                  style={{ width: "100%", padding: "8px 12px", background: "#0d0a1e", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "var(--font-body)", fontSize: 15, outline: "none", transition: "border-color 0.2s", boxSizing: "border-box", colorScheme: "dark" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(192,132,252,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(192,132,252,0.2)")}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                  style={{ padding: "8px 14px", background: journalInput.trim() ? "rgba(192,132,252,0.15)" : "rgba(192,132,252,0.05)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1, cursor: journalInput.trim() ? "pointer" : "not-allowed", transition: "background 0.2s", flexShrink: 0, marginLeft: "auto" }}
                >
                  LOG
                </button>
                </div>
              </div>
              )}
            </div>

          {/* TokMed panel */}
          <div style={{ flex: isMobile ? "0 0 100%" : "0 0 calc(50% - 7px)", background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(251,191,36,0.05)", display: "flex", flexDirection: "column", height: 480 }}>
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
                    style={{ width: "100%", padding: "7px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "var(--font-body)", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(251,191,36,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(251,191,36,0.2)")} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newMedDose} onChange={e => setNewMedDose(e.target.value)} onKeyDown={e => e.key === "Enter" && logMed()} placeholder={t.medDosePlaceholder}
                      style={{ flex: 1, padding: "7px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, color: "#d0e8f8", fontFamily: "var(--font-body)", fontSize: 15, outline: "none", minWidth: 0 }}
                      onFocus={e => (e.target.style.borderColor = "rgba(251,191,36,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(251,191,36,0.2)")} />
                    <input type="time" value={newMedTime} onChange={e => setNewMedTime(e.target.value)}
                      style={{ width: 88, padding: "7px 8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, color: newMedTime ? "#fbbf24" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, outline: "none", colorScheme: "dark", flexShrink: 0 }}
                      onFocus={e => (e.target.style.borderColor = "rgba(251,191,36,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(251,191,36,0.2)")} />
                    <button onClick={logMed} disabled={!newMedName.trim()}
                      style={{ padding: "7px 16px", background: newMedName.trim() ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 6, color: "#fbbf24", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1, cursor: newMedName.trim() ? "pointer" : "not-allowed", flexShrink: 0 }}>
                      {t.medLogBtn}
                    </button>
                  </div>
                  {medSuggestions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {medSuggestions.map(s => (
                        <button key={s.name} onClick={() => { setNewMedName(s.name); setNewMedDose(s.dose); }}
                          style={{ padding: "3px 9px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 12, color: "rgba(251,191,36,0.8)", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 0.3, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(251,191,36,0.16)"; (e.currentTarget as HTMLButtonElement).style.color = "#fbbf24"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(251,191,36,0.07)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(251,191,36,0.8)"; }}
                        >
                          {s.name}{s.dose ? ` · ${s.dose}` : ""}
                        </button>
                      ))}
                    </div>
                  )}
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
                    {selectedDate === todayStr() && (<>
                      {medReminders.find(r => r.medId === med.id) ? (
                        <span onClick={e => { e.stopPropagation(); setMedReminders(p => p.filter(r => r.medId !== med.id)); }}
                          style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#fbbf24", cursor: "pointer", flexShrink: 0, border: "1px solid rgba(251,191,36,0.4)", borderRadius: 3, padding: "1px 5px" }}>
                          ⏰ {Math.round((medReminders.find(r => r.medId === med.id)!.fireAt - Date.now()) / 3600000)}h
                        </span>
                      ) : (
                        <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                          {[1, 2, 4, 6].map(h => (
                            <button key={h} onClick={e => { e.stopPropagation(); setMedReminders(p => [...p.filter(r => r.medId !== med.id), { medId: med.id, medName: med.name, fireAt: Date.now() + h * 3600000 }]); }}
                              style={{ background: "none", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 3, color: "rgba(251,191,36,0.5)", fontFamily: "'Share Tech Mono', monospace", fontSize: 9, padding: "1px 4px", cursor: "pointer" }}>
                              {h}h
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteMed(med.id); }} style={{ background: "none", border: "none", color: "rgba(255,100,100,0.4)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
                    </>)}
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

          {/* TokInsights */}
          <div style={{ flex: isMobile ? "0 0 100%" : "0 0 calc(50% - 7px)", background: "linear-gradient(135deg, #100a25, #120d28)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 24px rgba(192,132,252,0.07)", display: "flex", flexDirection: "column", height: 480 }}>
            {/* Header */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(192,132,252,0.15)", display: "flex", alignItems: "center", gap: 10, background: "rgba(192,132,252,0.03)", flexShrink: 0 }}>
              <Brain size={16} color="#c084fc" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, flex: 1 }}>
                <span style={{ color: "#7c3aed" }}>TOK</span>
                <span style={{ color: "#c084fc" }}>{lang === "en" ? "INSIGHTS · OBSERVATIONS" : "INSIGHTS · 觀察"}</span>
              </span>
              <InfoButton onClick={() => setInfoModal(INFO[lang].tokInsights)} />
            </div>
            {/* Observations */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.length === 0 ? (
                <p style={{ margin: 0, fontSize: 14, color: "rgba(90,143,168,0.6)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: 0.4, lineHeight: 1.7 }}>
                  {t.insightsEmpty}
                </p>
              ) : insights.map((ins, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 11px", background: "rgba(192,132,252,0.05)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 8 }}>
                  <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>{ins.icon}</span>
                  <span style={{ fontSize: 15, color: "#c8d8e8", fontFamily: "var(--font-body)", lineHeight: 1.45 }}>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>
          </div>
          {/* Fade hints — appear only when there are more widgets in that direction */}
          {widgetFade.left && <div style={{ position: "absolute", left: 0, top: 0, bottom: 4, width: 48, background: "linear-gradient(to left, transparent, rgba(8,6,20,0.85))", pointerEvents: "none" }} />}
          {widgetFade.right && <div style={{ position: "absolute", right: 0, top: 0, bottom: 4, width: 48, background: "linear-gradient(to right, transparent, rgba(8,6,20,0.85))", pointerEvents: "none" }} />}
          {widgetFade.left && <button onClick={() => scrollBox(widgetScrollRef, -1)} title={lang === "en" ? "Scroll left" : "向左捲動"} style={scrollArrowStyle("left")}>◀</button>}
          {widgetFade.right && <button onClick={() => scrollBox(widgetScrollRef, 1)} title={lang === "en" ? "Scroll right" : "向右捲動"} style={scrollArrowStyle("right")}>▶</button>}
          </div>

          {/* TokAgent now lives in the fixed bottom dock (see end of component) */}

          {/* TokDo — mobile only; desktop version lives in right panel */}
          {isMobile && (
          <div style={{ background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 10, padding: 16, boxShadow: "0 0 24px rgba(192,132,252,0.07)", minHeight: 360, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <ListChecks size={16} color="#c084fc" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, flex: 1 }}>
                    {lang === "en"
                      ? <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>DO · CHECKLIST</span></>
                      : <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>DO · {t.tokTodo}</span></>}
                  </span>
                  <InfoButton onClick={() => setInfoModal(INFO[lang].tokTodo)} />
                </div>
                {selectedDate === todayStr() ? (taskFormOpen ? (<>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                  <button onClick={closeTaskForm} style={{ background: "none", border: "none", color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", padding: 0 }}>{t.addTaskClose}</button>
                </div>
                <input value={newTask} autoFocus onChange={e => setNewTask(e.target.value)} onKeyDown={addTask} placeholder={t.taskPlaceholder}
                  style={{ width: "100%", padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: "4px 4px 0 0", color: "#c8d8e8", fontFamily: "var(--font-body)", fontSize: 16, boxSizing: "border-box", outline: "none" }} />
                <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder={t.descPlaceholder}
                  style={{ width: "100%", padding: "5px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(192,132,252,0.2)", borderTop: "none", borderRadius: "0 0 4px 4px", color: "#7a9ab8", fontFamily: "var(--font-body)", fontSize: 15, marginBottom: 8, boxSizing: "border-box", outline: "none", fontStyle: "italic" }} />
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
                <button onClick={submitTask} disabled={!newTask.trim()}
                  style={{ width: "100%", padding: "8px 0", background: newTask.trim() ? "rgba(192,132,252,0.18)" : "rgba(192,132,252,0.05)", border: `1px solid ${newTask.trim() ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.15)"}`, borderRadius: 6, color: newTask.trim() ? "#c084fc" : "rgba(192,132,252,0.3)", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1, cursor: newTask.trim() ? "pointer" : "default", transition: "all 0.15s" }}>
                  {t.addTaskBtn}
                </button>
                </>) : (
                <button onClick={() => setTaskFormOpen(true)}
                  style={{ width: "100%", padding: "9px 0", marginBottom: 4, background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1, cursor: "pointer" }}>
                  {t.addTaskBtn}
                </button>
                )) : (
                <div style={{ padding: "8px 12px", marginBottom: 10, border: "1px solid rgba(192,132,252,0.12)", borderRadius: 4, fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "rgba(90,143,168,0.5)", letterSpacing: 1 }}>
                  {t.pastDayReadOnly}
                </div>
                )}

                {/* Active task + AI recommendation (mobile) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#7c3aed", letterSpacing: 1.5, marginBottom: 5 }}>{t.activeTaskLabel}</div>
                    <select value={activeTaskId ?? ""} onChange={e => selectActiveTask(e.target.value || null)}
                      disabled={tasks.filter(t => !t.done).length === 0}
                      style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.35)", border: `1px solid ${activeTaskId ? "rgba(192,132,252,0.55)" : "rgba(192,132,252,0.2)"}`, borderRadius: 6, color: activeTaskId ? "#c8d8e8" : "#5a8fa8", fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                      <option value="" style={{ background: "#120d28", color: "#5a8fa8" }}>{t.activeTaskNone}</option>
                      {tasks.filter(t => !t.done).map(tk => { const n = taskNumberById.get(tk.id); return (
                        <option key={tk.id} value={tk.id} style={{ background: "#120d28", color: "#c8d8e8" }}>{n ? `${n}. ` : ""}{tk.emoji ? `${tk.emoji} ` : ""}{tk.title}</option>
                      ); })}
                    </select>
                  </div>
                  {tasks.some(t => !t.done) && (() => {
                    if (!bestTask) {
                      return (
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 0.5, opacity: 0.8 }}>
                          {t.recAnalyzing}
                        </div>
                      );
                    }
                    if (!bestTask.taskId) {
                      return (
                        <div style={{ padding: "8px 10px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 0.5, lineHeight: 1.5 }}>
                          {bestTask.reason}
                        </div>
                      );
                    }
                    const recTask = tasks.find(t => t.id === bestTask.taskId);
                    if (!recTask) return null;
                    const onTrack = activeTaskId != null && bestTask.taskId === activeTaskId;
                    const recNum = taskNumberById.get(recTask.id);
                    return (
                      <div style={{ padding: "9px 11px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6 }}>
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10.5, color: "#c084fc", letterSpacing: 1, marginBottom: 5 }}>
                          {t.recommendedTaskLabel}
                        </div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#c8d8e8", marginBottom: 4, cursor: "pointer" }}
                          onClick={() => setSelectedTaskId(recTask.id)}>
                          {recNum && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 700, color: "#7c3aed", marginRight: 6 }}>{recNum}.</span>}
                          {recTask.emoji && <span style={{ marginRight: 5 }}>{recTask.emoji}</span>}{recTask.title}
                        </div>
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 0.3, lineHeight: 1.5 }}>
                          {bestTask.reason}
                        </div>
                        {onTrack ? (
                          <div style={{ marginTop: 7, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc", letterSpacing: 0.5 }}>
                            {t.recOnTrack}
                          </div>
                        ) : (
                          <button onClick={() => selectActiveTask(recTask.id)}
                            style={{ marginTop: 7, width: "100%", padding: "6px 0", background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 5, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>
                            {activeTaskId ? t.recSwitchBtn : t.recSetActiveBtn}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                  {orderedVisibleTasks.map((task, idx) => (
                    <div key={task.id} onClick={() => setSelectedTaskId(task.id)}
                      style={{ display: "flex", flexDirection: "column", padding: "8px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 4, border: "1px solid rgba(192,132,252,0.1)", gap: 5, minWidth: 0, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.35)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(192,132,252,0.05)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.1)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.2)"; }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 700, color: task.done ? "rgba(124,58,237,0.4)" : "#7c3aed", flexShrink: 0, marginTop: 3, minWidth: 15, textAlign: "right" }}>{idx + 1}</span>
                        <div onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={task.done} onChange={() => updateTask(task.id, { done: !task.done })} style={{ accentColor: "#c084fc", cursor: "pointer", flexShrink: 0, marginTop: 3 }} />
                        </div>
                        {task.emoji && <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1, opacity: task.done ? 0.5 : 1 }}>{task.emoji}</span>}
                        <span style={{ flex: 1, fontSize: 17, fontWeight: 600, color: task.done ? "#5a8fa8" : "#c8d8e8", textDecoration: task.done ? "line-through" : "none", minWidth: 0, wordBreak: "break-word" }}>{task.title}</span>
                        {task.estimatedMinutes && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", flexShrink: 0 }}>{task.estimatedMinutes}{t.minUnit}</span>}
                        {canReorder && (
                          <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                            <button onClick={() => moveTask(task.id, -1)} disabled={task.done ? idx === incompleteCount : idx === 0}
                              style={{ background: "none", border: "none", padding: 0, lineHeight: 0.8, fontSize: 11, color: (task.done ? idx === incompleteCount : idx === 0) ? "rgba(192,132,252,0.2)" : "#c084fc", cursor: (task.done ? idx === incompleteCount : idx === 0) ? "default" : "pointer" }}>▲</button>
                            <button onClick={() => moveTask(task.id, 1)} disabled={task.done ? idx === orderedVisibleTasks.length - 1 : idx === incompleteCount - 1}
                              style={{ background: "none", border: "none", padding: 0, lineHeight: 0.8, fontSize: 11, color: (task.done ? idx === orderedVisibleTasks.length - 1 : idx === incompleteCount - 1) ? "rgba(192,132,252,0.2)" : "#c084fc", cursor: (task.done ? idx === orderedVisibleTasks.length - 1 : idx === incompleteCount - 1) ? "default" : "pointer" }}>▼</button>
                          </div>
                        )}
                      </div>
                      {task.description && <p style={{ margin: 0, marginLeft: 37, fontSize: 14, color: "#5a8fa8", lineHeight: 1.5, fontStyle: "italic", fontFamily: "var(--font-body)", wordBreak: "break-word" }}>{task.description}</p>}
                      {task.deadline && <span style={{ marginLeft: 37, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(251,191,36,0.7)", letterSpacing: 1 }}>{t.dueLabel} {task.deadline}</span>}
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

      {/* ── TokDo right panel (desktop only) ── */}
      {!isMobile && (
        <aside style={{ width: 380, minWidth: 380, borderLeft: "1px solid rgba(192,132,252,0.15)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", background: "linear-gradient(180deg, #0c0818 0%, #0e0920 100%)" }}>
          {/* Header */}
          <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid rgba(192,132,252,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ListChecks size={18} color="#c084fc" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: 3, flex: 1 }}>
                {lang === "en"
                  ? <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>DO</span></>
                  : <><span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>DO · {t.tokTodo}</span></>}
              </span>
              <InfoButton onClick={() => setInfoModal(INFO[lang].tokTodo)} />
            </div>
          </div>

          {/* Active task + AI recommendation */}
          <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(192,132,252,0.1)", display: "flex", flexDirection: "column", gap: 9 }}>
            {/* User-selected active task */}
            <div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#7c3aed", letterSpacing: 1.5, marginBottom: 5 }}>{t.activeTaskLabel}</div>
              <select value={activeTaskId ?? ""} onChange={e => selectActiveTask(e.target.value || null)}
                disabled={tasks.filter(t => !t.done).length === 0}
                style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.35)", border: `1px solid ${activeTaskId ? "rgba(192,132,252,0.55)" : "rgba(192,132,252,0.2)"}`, borderRadius: 6, color: activeTaskId ? "#c8d8e8" : "#5a8fa8", fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                <option value="" style={{ background: "#120d28", color: "#5a8fa8" }}>{t.activeTaskNone}</option>
                {tasks.filter(t => !t.done).map(tk => { const n = taskNumberById.get(tk.id); return (
                  <option key={tk.id} value={tk.id} style={{ background: "#120d28", color: "#c8d8e8" }}>{n ? `${n}. ` : ""}{tk.emoji ? `${tk.emoji} ` : ""}{tk.title}</option>
                ); })}
              </select>
            </div>

            {/* TOKAI's recommendation, right under the active task */}
            {tasks.some(t => !t.done) && (() => {
              if (!bestTask) {
                return (
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 0.5, opacity: 0.8 }}>
                    {t.recAnalyzing}
                  </div>
                );
              }
              if (!bestTask.taskId) {
                return (
                  <div style={{ padding: "8px 10px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 0.5, lineHeight: 1.5 }}>
                    {bestTask.reason}
                  </div>
                );
              }
              const recTask = tasks.find(t => t.id === bestTask.taskId);
              if (!recTask) return null;
              const onTrack = activeTaskId != null && bestTask.taskId === activeTaskId;
              const recNum = taskNumberById.get(recTask.id);
              return (
                <div style={{ padding: "9px 11px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 6 }}>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10.5, color: "#c084fc", letterSpacing: 1, marginBottom: 5 }}>
                    {t.recommendedTaskLabel}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#c8d8e8", marginBottom: 4, cursor: "pointer" }}
                    onClick={() => setSelectedTaskId(recTask.id)}>
                    {recNum && <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 700, color: "#7c3aed", marginRight: 6 }}>{recNum}.</span>}
                    {recTask.emoji && <span style={{ marginRight: 5 }}>{recTask.emoji}</span>}{recTask.title}
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 0.3, lineHeight: 1.5 }}>
                    {bestTask.reason}
                  </div>
                  {onTrack ? (
                    <div style={{ marginTop: 7, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c084fc", letterSpacing: 0.5 }}>
                      {t.recOnTrack}
                    </div>
                  ) : (
                    <button onClick={() => selectActiveTask(recTask.id)}
                      style={{ marginTop: 7, width: "100%", padding: "5px 0", background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 5, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>
                      {activeTaskId ? t.recSwitchBtn : t.recSetActiveBtn}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Task input */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(192,132,252,0.1)" }}>
            {selectedDate === todayStr() ? (taskFormOpen ? (<>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <button onClick={closeTaskForm} style={{ background: "none", border: "none", color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer", padding: 0 }}>{t.addTaskClose}</button>
              </div>
              <input value={newTask} autoFocus onChange={e => setNewTask(e.target.value)} onKeyDown={addTask} placeholder={t.taskPlaceholder}
                style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: "4px 4px 0 0", color: "#c8d8e8", fontFamily: "var(--font-body)", fontSize: 16, boxSizing: "border-box", outline: "none" }} />
              <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder={t.descPlaceholder}
                style={{ width: "100%", padding: "6px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(192,132,252,0.2)", borderTop: "none", borderRadius: "0 0 4px 4px", color: "#7a9ab8", fontFamily: "var(--font-body)", fontSize: 15, marginBottom: 8, boxSizing: "border-box", outline: "none", fontStyle: "italic" }} />
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
              <button onClick={submitTask} disabled={!newTask.trim()}
                style={{ width: "100%", marginTop: 10, padding: "8px 0", background: newTask.trim() ? "rgba(192,132,252,0.18)" : "rgba(192,132,252,0.05)", border: `1px solid ${newTask.trim() ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.15)"}`, borderRadius: 6, color: newTask.trim() ? "#c084fc" : "rgba(192,132,252,0.3)", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1, cursor: newTask.trim() ? "pointer" : "default", transition: "all 0.15s" }}>
                {t.addTaskBtn}
              </button>
            </>) : (
              <button onClick={() => setTaskFormOpen(true)}
                style={{ width: "100%", padding: "9px 0", background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 1, cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(192,132,252,0.2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(192,132,252,0.12)")}>
                {t.addTaskBtn}
              </button>
            )) : (
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
            {orderedVisibleTasks.map((task, idx) => (
              <div key={task.id} onClick={() => setSelectedTaskId(task.id)}
                draggable={canReorder}
                onDragStart={canReorder ? (() => setDragTaskId(task.id)) : undefined}
                onDragOver={canReorder ? (e => e.preventDefault()) : undefined}
                onDrop={canReorder ? (() => { if (dragTaskId) reorderTask(dragTaskId, task.id); setDragTaskId(null); }) : undefined}
                onDragEnd={() => setDragTaskId(null)}
                style={{ display: "flex", flexDirection: "column", padding: "9px 11px", background: "rgba(0,0,0,0.2)", borderRadius: 6, border: "1px solid rgba(192,132,252,0.1)", gap: 5, cursor: "pointer", transition: "border-color 0.15s, background 0.15s", opacity: dragTaskId === task.id ? 0.4 : 1 }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.35)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(192,132,252,0.05)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(192,132,252,0.1)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.2)"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7, minWidth: 0 }}>
                  {canReorder && <span title={t.dragToReorder} style={{ flexShrink: 0, marginTop: 1, color: "rgba(192,132,252,0.45)", cursor: "grab", fontSize: 13, lineHeight: 1.3, userSelect: "none" }}>⠿</span>}
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 700, color: task.done ? "rgba(124,58,237,0.4)" : "#7c3aed", flexShrink: 0, marginTop: 3, minWidth: 16, textAlign: "right" }}>{idx + 1}</span>
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={task.done} onChange={() => updateTask(task.id, { done: !task.done })} style={{ accentColor: "#c084fc", cursor: "pointer", flexShrink: 0, marginTop: 3 }} />
                  </div>
                  {task.emoji && <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1, opacity: task.done ? 0.5 : 1 }}>{task.emoji}</span>}
                  <span style={{ flex: 1, fontSize: 17, fontWeight: 600, color: task.done ? "#5a8fa8" : "#c8d8e8", textDecoration: task.done ? "line-through" : "none", minWidth: 0, wordBreak: "break-word" }}>{task.title}</span>
                  {(() => { const r = focusReadiness(task.focusRequired, neural.focusIndex); return r ? <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, padding: "1px 5px", border: `1px solid ${r.color}`, color: r.color, borderRadius: 3, flexShrink: 0, opacity: task.done ? 0.4 : 1 }}>⚡{r.label}</span> : null; })()}
                </div>
                {task.description && <p style={{ margin: 0, marginLeft: 47, fontSize: 14, color: "#5a8fa8", lineHeight: 1.5, fontStyle: "italic", fontFamily: "var(--font-body)", wordBreak: "break-word" }}>{task.description}</p>}
                {task.deadline && <span style={{ marginLeft: 47, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(251,191,36,0.7)" }}>{t.dueLabel} {task.deadline}</span>}
                {task.estimatedMinutes && <span style={{ marginLeft: 47, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "rgba(90,143,168,0.6)" }}>{task.estimatedMinutes}{t.minUnit}</span>}
              </div>
            ))}
          </div>

          {/* Progress footer */}
          <div style={{ padding: "13px 18px", borderTop: "1px solid rgba(192,132,252,0.1)", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#5a8fa8", letterSpacing: 1 }}>
            {t.progress} {visibleCompleted}/{visibleTasks.length} {visibleCompleted > 0 && visibleCompleted === visibleTasks.length ? t.complete : ""}
          </div>
        </aside>
      )}

      {/* ── TokAgent bottom dock ── */}
      {!agentDockOpen && (
        <button onClick={() => setAgentDockOpen(true)}
          style={{ position: "fixed", left: isMobile ? 0 : 240, right: isMobile ? 0 : 380, bottom: 0, zIndex: 150, height: 46, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", background: "linear-gradient(180deg, #140d2e, #0c0818)", borderTop: "1px solid rgba(192,132,252,0.5)", boxShadow: "0 -6px 24px rgba(0,0,0,0.4)", cursor: "pointer", transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s", border: "none" }}
          onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(180deg, #1e1040, #120d28)"; e.currentTarget.style.borderTop = "1px solid rgba(192,132,252,0.9)"; e.currentTarget.style.boxShadow = "0 -8px 32px rgba(192,132,252,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(180deg, #140d2e, #0c0818)"; e.currentTarget.style.borderTop = "1px solid rgba(192,132,252,0.5)"; e.currentTarget.style.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"; }}
        >
          <span style={{ fontSize: 14, color: "rgba(192,132,252,0.9)" }}>▲</span>
          <Bot size={15} color="#c084fc" style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>
            <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>AGENT</span>
          </span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.55)", letterSpacing: 1.5 }}>
            {lang === "en" ? "· CLICK TO EXPAND" : "· 點擊展開"}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#c084fc", letterSpacing: 1 }}>
            {lang === "en" ? "ASK →" : "詢問 →"}
          </span>
        </button>
      )}
      {agentDockOpen && (<>
        <div onClick={() => setAgentDockOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 140 }} />
        <div style={{ position: "fixed", left: isMobile ? 0 : 240, right: isMobile ? 0 : 380, bottom: 0, zIndex: 150, height: "min(72vh, 580px)", padding: isMobile ? 0 : "0 16px", boxSizing: "border-box" }}>
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
            onClose={() => setAgentDockOpen(false)}
            onOpenSettings={() => setShowProfileModal(true)}
            apiKey={anthropicKey}
            moodAssessment={moodAssessment ?? undefined}
            tools={{
              createTask: agentCreateTask,
              updateTask: agentUpdateTask,
              deleteTask: id => deleteTask(id),
              completeTask: id => updateTask(id, { done: true }),
              setActiveTask: async id => selectActiveTask(id),
              deleteAllTasks: agentDeleteAllTasks,
              addJournalEntry: agentAddJournalEntry,
              logMedication: agentLogMedication,
              startTimer: agentStartTimer,
              stopTimer: agentStopTimer,
            }}
          />
        </div>
      </>)}

      {/* ── Clinician report ── */}
      {showReport && profile && (
        <ClinicianReport
          name={profile.name}
          email={session.user.email ?? ""}
          lang={lang}
          journal={journal.map(e => ({ date: e.date, time: e.time, text: e.text, focusIndex: e.focusIndex, mood: e.mood }))}
          meds={medLog.map(m => { const d = getMedDelta(m); return { date: m.date ?? todayStr(), time: m.time, name: m.name, dose: m.dose, delta: d?.delta ?? null, deltaMin: d?.minutes ?? null }; })}
          tasks={tasks.map(tk => ({ title: tk.title, done: tk.done, createdAt: tk.createdAt, focusRequired: tk.focusRequired, estimatedMinutes: tk.estimatedMinutes }))}
          sessions={focusSessions.map(s => ({ date: s.date, time: s.time, taskTitle: s.taskTitle, minutes: s.minutes }))}
          insights={insights}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, background: "#7f1d1d", borderBottom: "1px solid #ef4444", padding: "8px 16px", textAlign: "center", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#fca5a5", letterSpacing: 1 }}>
          {lang === "en" ? "No internet connection — changes may not save." : "目前離線 — 變更可能無法儲存。"}
        </div>
      )}

      {/* ── Notification banners ── */}
      {notifications.length > 0 && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 400, display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
          {notifications.map(n => (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "linear-gradient(135deg, #120d28, #160f30)", border: `1px solid ${n.color}44`, borderLeft: `3px solid ${n.color}`, borderRadius: 8, padding: "12px 14px", boxShadow: `0 4px 24px ${n.color}22`, animation: "slideIn 0.2s ease" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#c8d8e8", lineHeight: 1.5, flex: 1 }}>{n.message}</span>
              <button onClick={() => dismissNotification(n.id)} style={{ background: "none", border: "none", color: "rgba(90,143,168,0.5)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Profile modal ── */}
      {showProfileModal && profile && (
        <div onClick={() => setShowProfileModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 0 60px rgba(192,132,252,0.12)", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 18, background: "#c084fc", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 3, flex: 1 }}>
                <span style={{ color: "#7c3aed" }}>TOK</span>USER · PROFILE
              </span>
              <button onClick={() => setShowProfileModal(false)} style={{ background: "none", border: "none", color: "#5a8fa8", cursor: "pointer", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
            </div>

            {/* Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>{lang === "en" ? "DISPLAY NAME" : "顯示名稱"}</span>
              <input value={profile.name} onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)}
                onBlur={() => saveProfile({ name: profile.name })}
                placeholder={lang === "en" ? "Your name..." : "你的名字..."}
                style={{ padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#c8d8e8", fontFamily: "var(--font-body)", fontSize: 16, outline: "none" }} />
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>{lang === "en" ? "EMAIL" : "電子郵件"}</span>
              <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(192,132,252,0.1)", borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "rgba(90,143,168,0.7)" }}>
                {session.user.email}
              </div>
            </div>

            {/* BCI Device */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>{lang === "en" ? "BCI DEVICE" : "腦機介面裝置"}</span>
              <select value={profile.bciDevice} onChange={e => saveProfile({ bciDevice: e.target.value })}
                style={{ padding: "8px 12px", background: "#120d28", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#c8d8e8", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none", cursor: "pointer", colorScheme: "dark" }}>
                <option value="none">{lang === "en" ? "None (Simulated)" : "無（模擬）"}</option>
                <option value="muse2">Muse 2</option>
                <option value="muse_s">Muse S</option>
                <option value="openbci">OpenBCI Cyton</option>
                <option value="neurosky">NeuroSky MindWave</option>
                <option value="emotiv">Emotiv EPOC X</option>
                <option value="other">{lang === "en" ? "Other" : "其他"}</option>
              </select>
            </div>

            {/* Anthropic API key (BYOK) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>{lang === "en" ? "ANTHROPIC API KEY · TOKAGENT" : "ANTHROPIC API 金鑰 · TOKAGENT"}</span>
              {anthropicKey ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, padding: "8px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(110,231,183,0.3)", borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#6ee7b7" }}>✓ {lang === "en" ? "Connected" : "已連接"} · ••••{anthropicKey.slice(-4)}</span>
                  <button onClick={() => saveAnthropicKey("")}
                    style={{ padding: "8px 14px", background: "transparent", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 6, color: "#f87171", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>{lang === "en" ? "CLEAR" : "清除"}</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && keyInput.trim()) { saveAnthropicKey(keyInput); setKeyInput(""); } }}
                    placeholder="sk-ant-..."
                    style={{ flex: 1, padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#c8d8e8", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, outline: "none" }} />
                  <button onClick={() => { if (keyInput.trim()) { saveAnthropicKey(keyInput); setKeyInput(""); } }} disabled={!keyInput.trim()}
                    style={{ padding: "8px 16px", background: keyInput.trim() ? "rgba(192,132,252,0.18)" : "rgba(192,132,252,0.05)", border: "1px solid rgba(192,132,252,0.4)", borderRadius: 6, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: keyInput.trim() ? "pointer" : "not-allowed" }}>{lang === "en" ? "SAVE" : "儲存"}</button>
                </div>
              )}
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.7)", letterSpacing: 0.3, lineHeight: 1.5 }}>
                {lang === "en" ? "Stored only in your browser, never on Tokai's servers. " : "僅儲存在你的瀏覽器，不會儲存於 Tokai 伺服器。"}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: "#c084fc", textDecoration: "none" }}>{lang === "en" ? "Get a key →" : "取得金鑰 →"}</a>
              </span>
            </div>

            {/* Accessibility */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>{lang === "en" ? "ACCESSIBILITY" : "無障礙"}</span>
              <button onClick={() => setHighLegibility(v => !v)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 12px", background: highLegibility ? "rgba(192,132,252,0.12)" : "rgba(0,0,0,0.25)", border: `1px solid ${highLegibility ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.2)"}`, borderRadius: 6, cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#c8d8e8" }}>{lang === "en" ? "High-legibility font" : "高易讀字體"}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.7)", letterSpacing: 0.3 }}>{lang === "en" ? "Swaps reading text to Lexend (keeps the mono labels)" : "將閱讀文字換成 Lexend（保留等寬標籤）"}</span>
                </span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: highLegibility ? "#c084fc" : "#5a8fa8", letterSpacing: 1, flexShrink: 0 }}>{highLegibility ? "ON" : "OFF"}</span>
              </button>
              <button onClick={() => setReduceMotion(v => !v)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 12px", background: reduceMotion ? "rgba(192,132,252,0.12)" : "rgba(0,0,0,0.25)", border: `1px solid ${reduceMotion ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.2)"}`, borderRadius: 6, cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#c8d8e8" }}>{lang === "en" ? "Reduce motion" : "減少動態效果"}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.7)", letterSpacing: 0.3 }}>{lang === "en" ? "Minimizes transitions, animations, and smooth scrolling" : "減少過渡、動畫與平滑捲動"}</span>
                </span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: reduceMotion ? "#c084fc" : "#5a8fa8", letterSpacing: 1, flexShrink: 0 }}>{reduceMotion ? "ON" : "OFF"}</span>
              </button>
              <div style={{ padding: "9px 12px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#c8d8e8" }}>{lang === "en" ? "Text size" : "文字大小"}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {([[0.9, lang === "en" ? "S" : "小"], [1, lang === "en" ? "M" : "中"], [1.15, lang === "en" ? "L" : "大"], [1.3, "XL"]] as [number, string][]).map(([v, label]) => (
                    <button key={v} onClick={() => setTextScale(v)}
                      style={{ flex: 1, padding: "6px 0", background: textScale === v ? "rgba(192,132,252,0.2)" : "transparent", border: `1px solid ${textScale === v ? "rgba(192,132,252,0.6)" : "rgba(192,132,252,0.2)"}`, borderRadius: 5, color: textScale === v ? "#c084fc" : "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1, cursor: "pointer" }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clinician report */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>{lang === "en" ? "SHARE" : "分享"}</span>
              <button onClick={() => { setShowProfileModal(false); setShowReport(true); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(192,132,252,0.5)", borderRadius: 6, cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#c8d8e8" }}>{lang === "en" ? "Clinician report" : "臨床報告"}</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.7)", letterSpacing: 0.3 }}>{lang === "en" ? "Printable focus, medication & activity summary to share" : "可列印的專注、用藥與活動摘要，方便分享"}</span>
                </span>
                <span style={{ fontSize: 16, color: "#c084fc", flexShrink: 0 }}>📄</span>
              </button>
            </div>

            {/* Subscription */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>{lang === "en" ? "SUBSCRIPTION" : "訂閱方案"}</span>
              <div style={{ display: "flex", gap: 8 }}>
                {(["free", "pro"] as const).map(tier => (
                  <div key={tier} style={{ flex: 1, padding: "10px 0", textAlign: "center", background: profile.subscriptionTier === tier ? "rgba(192,132,252,0.15)" : "rgba(0,0,0,0.2)", border: `1px solid ${profile.subscriptionTier === tier ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.1)"}`, borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: profile.subscriptionTier === tier ? "#c084fc" : "#5a8fa8", letterSpacing: 2 }}>
                    {tier === "free" ? (lang === "en" ? "FREE" : "免費") : "PRO"}
                    {profile.subscriptionTier === tier && <div style={{ fontSize: 9, color: "rgba(192,132,252,0.6)", marginTop: 3, letterSpacing: 1 }}>{lang === "en" ? "CURRENT" : "目前方案"}</div>}
                    {tier === "pro" && profile.subscriptionTier !== "pro" && <div style={{ fontSize: 9, color: "rgba(90,143,168,0.5)", marginTop: 3, letterSpacing: 0 }}>{lang === "en" ? "Coming in Beta" : "Beta 開放"}</div>}
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.4)", letterSpacing: 1, textAlign: "center" }}>
                {lang === "en" ? "Alpha users get full access — subscriptions launch in Beta." : "Alpha 用戶享有完整功能——訂閱制度將於 Beta 啟動。"}
              </div>
            </div>

            {/* Tokens */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>
                  <span style={{ color: "#7c3aed" }}>TOK</span><span style={{ color: "#c084fc" }}>ENS</span>
                </span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc" }}>{profile.tokens}</span>
              </div>
              <div style={{ height: 4, background: "rgba(192,132,252,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, profile.tokens)}%`, background: "linear-gradient(90deg, #7c3aed, #c084fc)", borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>

            {/* AI Profile Summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>{lang === "en" ? "AI PROFILE SUMMARY" : "AI 個人摘要"}</span>
              {profile.aiProfile ? (
                <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 6, fontFamily: "var(--font-body)", fontSize: 15, color: "#c8d8e8", lineHeight: 1.6, fontStyle: "italic" }}>
                  {profile.aiProfile}
                </div>
              ) : (
                <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.15)", border: "1px dashed rgba(192,132,252,0.15)", borderRadius: 6, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(90,143,168,0.5)", letterSpacing: 0.5 }}>
                  {lang === "en" ? "No profile generated yet." : "尚未生成個人摘要。"}
                </div>
              )}
              <button onClick={generateAiProfile} disabled={profileGenerating}
                style={{ alignSelf: "flex-start", padding: "6px 14px", background: "none", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 4, color: profileGenerating ? "#5a8fa8" : "rgba(192,132,252,0.7)", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1, cursor: profileGenerating ? "default" : "pointer", transition: "all 0.2s" }}>
                {profileGenerating ? (lang === "en" ? "GENERATING..." : "生成中...") : (lang === "en" ? "✦ GENERATE SUMMARY" : "✦ 生成摘要")}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Disclaimer modal ── */}
      {!disclaimerAccepted && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 480, background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 14, padding: 28, boxShadow: "0 0 60px rgba(192,132,252,0.12)", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 3, borderBottom: "1px solid rgba(192,132,252,0.2)", paddingBottom: 10 }}>
              TOKAI · {lang === "zh" ? "使用聲明" : "DISCLAIMER"}
            </div>
            <p style={{ margin: 0, fontSize: 15, color: "#c8d8e8", lineHeight: 1.7, fontFamily: "var(--font-body)" }}>
              {lang === "zh"
                ? <>Tokai 是一款<strong style={{ color: "#c084fc" }}>研究原型</strong>，並非醫療裝置。Pre-alpha 版本中的神經指標均為模擬數值。本應用程式不用於診斷、治療或提供任何 ADHD 或其他疾病的臨床建議。</>
                : <>Tokai is a <strong style={{ color: "#c084fc" }}>research prototype</strong> and is not a medical device. Neural metrics in this alpha version are simulated. This app is not intended to diagnose, treat, or provide clinical guidance for ADHD or any other condition.</>}
            </p>
            <p style={{ margin: 0, fontSize: 15, color: "#c8d8e8", lineHeight: 1.7, fontFamily: "var(--font-body)" }}>
              {lang === "zh"
                ? "你的任務、日誌與個人檔案儲存在你的私人 Tokai 帳戶中（透過列級安全性逐一隔離）；API 金鑰與對話紀錄留在你的瀏覽器。使用 AI 功能時，相關資料會傳送至 Anthropic API 以生成回應。"
                : "Your tasks, journal, and profile are kept in your private Tokai account (isolated per user via row-level security); your API key and chat history stay in your browser. When you use AI features, the relevant data is sent to Anthropic's API to generate a response."}
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
            <p style={{ margin: 0, fontSize: 15, color: "#c8d8e8", lineHeight: 1.7, fontFamily: "var(--font-body)" }}>
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

      {/* ── Self-report check-in modal ── */}
      {showCheckIn && dataSource === "self-report" && (
        <div onClick={() => setShowCheckIn(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 260, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "linear-gradient(135deg, #120d28, #160f30)", border: "1px solid rgba(192,132,252,0.45)", borderRadius: 14, padding: 28, boxShadow: "0 0 64px rgba(192,132,252,0.18)", display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 3, height: 18, background: "#c084fc", borderRadius: 1, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#c084fc", letterSpacing: 3, flex: 1 }}>{t.checkInTitle}</span>
              <button onClick={() => setShowCheckIn(false)} style={{ background: "none", border: "none", color: "#5a8fa8", cursor: "pointer", fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: 0, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 1 }}>{t.checkInSubtitle}</p>

            {([
              { key: "sleepQuality",      title: t.sleepQuality,  label: t.checkInSleepLabel,   unit: "/100", color: "#67e8f9" },
              { key: "focusIndex",        title: t.focusIndex,    label: t.checkInFocusLabel,   unit: "/100", color: "#c084fc" },
              { key: "bioEnergy",         title: t.bioEnergy,     label: t.checkInEnergyLabel,  unit: "%",    color: "#4ade80" },
              { key: "mentalFatigue",     title: t.mentalFatigue, label: t.checkInFatigueLabel, unit: "/100", color: "#f472b6" },
              { key: "workingMemoryLoad", title: t.workingMemory, label: t.checkInWmlLabel,     unit: "/100", color: "#fbbf24" },
            ] as const).map(({ key, title, label, unit, color }) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color, letterSpacing: 2 }}>{title}:</span>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(90,143,168,0.75)", letterSpacing: 0.5 }}>{label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <input
                      type="number" min={0} max={100}
                      value={checkInDraft[key]}
                      onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value) || 0)); setCheckInDraft(d => ({ ...d, [key]: v })); }}
                      style={{ width: 52, fontFamily: "'Share Tech Mono', monospace", fontSize: 18, fontWeight: 700, color, background: "transparent", border: "none", borderBottom: `1px solid ${color}55`, outline: "none", textAlign: "right", padding: "0 2px", colorScheme: "dark", MozAppearance: "textfield" } as React.CSSProperties}
                    />
                    <span style={{ fontSize: 12, color: "#5a8fa8" }}>{unit}</span>
                  </div>
                </div>
                <input
                  type="range" min={0} max={100} step={1}
                  value={checkInDraft[key]}
                  onChange={e => setCheckInDraft(d => ({ ...d, [key]: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: color, cursor: "pointer" }}
                />
              </div>
            ))}

            <button
              onClick={() => applyCheckIn(checkInDraft)}
              style={{ width: "100%", padding: "11px 0", background: "rgba(192,132,252,0.18)", border: "1px solid rgba(192,132,252,0.5)", borderRadius: 8, color: "#c084fc", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: 2, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(192,132,252,0.28)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(192,132,252,0.18)"; }}
            >
              {t.checkInBtn}
            </button>
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
            <p style={{ margin: 0, fontSize: 15, color: "#c8d8e8", lineHeight: 1.7, fontFamily: "var(--font-body)" }}>
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
                  style={{ flex: 1, padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, color: "#c8d8e8", fontFamily: "var(--font-body)", fontSize: 20, fontWeight: 600, boxSizing: "border-box", outline: "none", textDecoration: task.done ? "line-through" : "none" }}
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
                style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 6, color: "#7a9ab8", fontFamily: "var(--font-body)", fontSize: 15, fontStyle: "italic", resize: "vertical", boxSizing: "border-box", outline: "none", lineHeight: 1.5 }}
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
