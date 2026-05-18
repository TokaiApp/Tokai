import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from "recharts";
import AgentChat from "@/components/agent-chat";

interface NeuralState {
  focusIndex: number;
  bioEnergy: number;
  neuralNoise: number;
  abRatio: number;
  alpha: number;
  beta: number;
}

interface FocusPoint {
  time: string;
  value: number;
}

interface Task {
  id: string;
  text: string;
  done: boolean;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function formatTime(d: Date) {
  return d.toTimeString().slice(0, 8);
}

function getFocusLabel(f: number): { label: string; color: string } {
  if (f < 30) return { label: "LOW", color: "#ff4d4d" };
  if (f < 60) return { label: "MODERATE", color: "#ffa040" };
  if (f < 80) return { label: "HIGH", color: "#00f5d4" };
  return { label: "OPTIMAL", color: "#00ff88" };
}

function getNoiseLabel(n: number): { label: string; color: string } {
  if (n < 20) return { label: "CLEAN", color: "#00ff88" };
  if (n < 40) return { label: "NOMINAL", color: "#00f5d4" };
  if (n < 60) return { label: "ELEVATED", color: "#ffa040" };
  return { label: "HIGH", color: "#ff4d4d" };
}

function drift(val: number, amount: number, min: number, max: number) {
  return parseFloat(clamp(val + (Math.random() - 0.5) * amount, min, max).toFixed(2));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#00f5d4", letterSpacing: 3, marginBottom: 10, borderBottom: "1px solid rgba(0,245,212,0.2)", paddingBottom: 4 }}>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ width: 36, height: 20, background: checked ? "rgba(0,245,212,0.25)" : "rgba(0,0,0,0.4)", borderRadius: 10, cursor: "pointer", position: "relative", border: `1px solid ${checked ? "#00f5d4" : "rgba(0,245,212,0.2)"}`, transition: "all 0.2s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 2, left: checked ? 17 : 2, width: 14, height: 14, borderRadius: "50%", background: checked ? "#00f5d4" : "#5a8fa8", transition: "left 0.2s" }} />
    </div>
  );
}

function MetricCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #0d1b2e, #0f2035)", border: "1px solid rgba(0,245,212,0.15)", borderRadius: 10, padding: "16px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg, #00f5d4, #0066ff)" }} />
      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #0d1b2e, #0f2035)", border: "1px solid rgba(0,245,212,0.15)", borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 14, background: "#00f5d4", borderRadius: 1, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#00f5d4", letterSpacing: 3 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, padding: "2px 8px", border: `1px solid ${color}`, color, borderRadius: 3, letterSpacing: 1 }}>
      {children}
    </span>
  );
}

export default function Dashboard() {
  const [liveStream, setLiveStream] = useState(true);
  const [refreshRate, setRefreshRate] = useState(3);
  const [now, setNow] = useState(new Date());
  const sessionStart = useRef(new Date());
  const [samples, setSamples] = useState(1);

  const [neural, setNeural] = useState<NeuralState>({
    focusIndex: 35.6,
    bioEnergy: 84,
    neuralNoise: 29,
    abRatio: 0.78,
    alpha: 88.48,
    beta: 101.07,
  });
  const neuralRef = useRef(neural);
  useEffect(() => { neuralRef.current = neural; }, [neural]);

  const [focusHistory, setFocusHistory] = useState<FocusPoint[]>([
    { time: formatTime(new Date()), value: 35.6 },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Review morning notes", done: false },
    { id: "2", text: "Deep work block: project spec", done: false },
    { id: "3", text: "Reply to priority emails", done: false },
  ]);
  const [newTask, setNewTask] = useState("");

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Neural simulation
  const tick = useCallback(() => {
    const prev = neuralRef.current;
    const newAlpha = drift(prev.alpha, 6, 10, 180);
    const newBeta = drift(prev.beta, 6, 10, 180);
    const next: NeuralState = {
      focusIndex: drift(prev.focusIndex, 4, 0, 100),
      bioEnergy: drift(prev.bioEnergy, 2, 0, 100),
      neuralNoise: drift(prev.neuralNoise, 3, 0, 80),
      abRatio: parseFloat((newAlpha / newBeta).toFixed(2)),
      alpha: newAlpha,
      beta: newBeta,
    };
    setNeural(next);
    neuralRef.current = next;
    setFocusHistory(h => [...h, { time: formatTime(new Date()), value: next.focusIndex }].slice(-40));
    setSamples(s => s + 1);
  }, []);

  useEffect(() => {
    if (!liveStream) return;
    const id = setInterval(tick, refreshRate * 1000);
    return () => clearInterval(id);
  }, [liveStream, refreshRate, tick]);

  const focusInfo = getFocusLabel(neural.focusIndex);
  const noiseInfo = getNoiseLabel(neural.neuralNoise);

  function getLunaInsight() {
    const f = neural.focusIndex;
    const e = neural.bioEnergy;
    if (f > 70 && e > 70)
      return `Optimal cognitive window detected. Focus is high (${f.toFixed(1)}/100) with excellent energy reserves (${Math.round(e)}%). This is your prime window for deep work, complex problem-solving, and high-stakes creative tasks. Prioritize your hardest challenges now.`;
    if (f > 50)
      return `Neural baseline is ${noiseInfo.label.toLowerCase()}. Conditions are favorable for sustained cognitive work. Focus is moderate (${f.toFixed(1)}/100). Consider chunking tasks into 20-minute intervals. Biological energy is ${e > 60 ? "high" : "moderate"} (${Math.round(e)}%). Leverage this window for complex problem-solving.`;
    return `Focus index is low (${f.toFixed(1)}/100). Neural noise is elevated. Recommend switching to low-cognitive tasks — organizing, reviewing notes, or short breaks. Energy at ${Math.round(e)}%. Allow your neural state to recover before tackling demanding work.`;
  }

  function addTask(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && newTask.trim()) {
      setTasks(prev => [...prev, { id: Date.now().toString(), text: newTask.trim(), done: false }]);
      setNewTask("");
    }
  }

  const completedCount = tasks.filter(t => t.done).length;
  const sessionDuration = Math.floor((now.getTime() - sessionStart.current.getTime()) / 60000);

  const waveData = [
    { name: "Alpha (8-11 Hz)", value: neural.alpha },
    { name: "Beta (11-70 Hz)", value: neural.beta },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(135deg, #070d1a 0%, #0a1628 50%, #06111f 100%)", fontFamily: "'Rajdhani', sans-serif", color: "#c8d8e8" }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 200, minWidth: 200, padding: "24px 16px", borderRight: "1px solid rgba(0,245,212,0.15)", display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 28, fontWeight: 700, color: "#00f5d4", letterSpacing: 8, textShadow: "0 0 20px rgba(0,245,212,0.6), 0 0 40px rgba(0,245,212,0.2)" }}>TOKAI</div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 2 }}>NEURO OS V0.9.2</div>
        </div>

        <div>
          <SectionLabel>SYSTEM CONTROL</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#c8d8e8" }}>Live Stream</span>
            <Toggle checked={liveStream} onChange={setLiveStream} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#5a8fa8" }}>Refresh Rate (s)</span>
              <span style={{ fontSize: 11, color: "#00f5d4", fontFamily: "'Share Tech Mono', monospace" }}>{refreshRate}</span>
            </div>
            <input
              type="range" min={1} max={10} value={refreshRate}
              onChange={e => setRefreshRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#00f5d4", cursor: "pointer" }}
            />
          </div>
          <button
            onClick={tick}
            style={{ width: "100%", padding: "6px 0", background: "transparent", border: "1px solid rgba(0,245,212,0.4)", color: "#00f5d4", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, cursor: "pointer", letterSpacing: 1, borderRadius: 4 }}
          >
            ⊕ Manual Refresh
          </button>
        </div>

        <div>
          <SectionLabel>SESSION INFO</SectionLabel>
          <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <tbody>
              {([
                ["DATE", now.toISOString().slice(0, 10)],
                ["TIME", formatTime(now)],
                ["SAMPLES", String(samples)],
                ["STATUS", liveStream ? "ACTIVE" : "PAUSED"],
              ] as [string, string][]).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: "#5a8fa8", paddingRight: 8, paddingBottom: 5, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>{k}</td>
                  <td style={{ color: k === "STATUS" ? (liveStream ? "#00f5d4" : "#ffa040") : "#c8d8e8", fontFamily: "'Share Tech Mono', monospace" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <SectionLabel>ABOUT LUNA</SectionLabel>
          <p style={{ fontSize: 11, color: "#5a8fa8", lineHeight: 1.6, margin: 0 }}>
            LUNA is Tokai's embedded neural analysis model. It synthesizes EEG stream data with biological rhythms to generate adaptive cognitive recommendations.
          </p>
        </div>

        <div style={{ marginTop: "auto", fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(0,245,212,0.3)", letterSpacing: 1 }}>
          SESSION {sessionDuration}m
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, overflowX: "hidden" }}>
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 52, fontWeight: 700, color: "#00f5d4", letterSpacing: 14, textShadow: "0 0 30px rgba(0,245,212,0.5), 0 0 60px rgba(0,245,212,0.2)", margin: "0 0 4px 0" }}>TOKAI</h1>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#5a8fa8", letterSpacing: 4 }}>NEUROSUPPORTIVE DASHBOARD · ADHD MANAGEMENT SYSTEM</div>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <MetricCard title="FOCUS INDEX">
            <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
              {neural.focusIndex.toFixed(1)}<span style={{ fontSize: 16, color: "#5a8fa8" }}>/100</span>
            </div>
            <Badge color={focusInfo.color}>{focusInfo.label}</Badge>
          </MetricCard>

          <MetricCard title="BIO ENERGY">
            <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
              {Math.round(neural.bioEnergy)}<span style={{ fontSize: 16, color: "#5a8fa8" }}>%</span>
            </div>
            <div style={{ height: 4, background: "rgba(0,245,212,0.1)", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${neural.bioEnergy}%`, background: "linear-gradient(90deg, #00f5d4, #0066ff)", borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
          </MetricCard>

          <MetricCard title="NEURAL NOISE">
            <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>
              {Math.round(neural.neuralNoise)}<span style={{ fontSize: 14, color: "#5a8fa8" }}> μV²</span>
            </div>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: noiseInfo.color, letterSpacing: 2 }}>{noiseInfo.label}</span>
          </MetricCard>

          <MetricCard title="A/B WAVE RATIO">
            <div style={{ fontSize: 34, fontWeight: 700, color: "#e8f4ff", marginBottom: 8 }}>{neural.abRatio}</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1 }}>
              α:{neural.alpha.toFixed(2)}  β:{neural.beta.toFixed(2)}
            </div>
          </MetricCard>
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel title="REAL-TIME FOCUS STREAM">
              <div style={{ position: "relative", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={focusHistory} margin={{ top: 8, right: 48, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#5a8fa8", fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#5a8fa8", fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }}
                      axisLine={false} tickLine={false}
                      ticks={[0, 20, 40, 60, 80, 100]}
                    />
                    <ReferenceLine y={60} stroke="rgba(255,80,80,0.35)" strokeDasharray="4 4" />
                    <Line
                      type="monotone" dataKey="value"
                      stroke="#00f5d4" strokeWidth={2}
                      dot={false} isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                {/* Current value label */}
                <div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#00f5d4" }}>
                  {neural.focusIndex.toFixed(1)}
                </div>
              </div>
            </Panel>

            <Panel title="OPTIMAL FOCUS WINDOW PREDICTOR">
              <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "center", color: "#5a8fa8", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1 }}>
                {focusHistory.length < 6
                  ? "Collecting baseline data... stream more samples."
                  : `Next optimal window in ~${Math.max(3, Math.round((80 - neural.focusIndex) / 2))} min · Confidence ${Math.min(99, Math.round(50 + samples * 1.2))}%`}
              </div>
            </Panel>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel title="LUNA · NEURAL INSIGHTS">
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#00f5d4", letterSpacing: 2, marginBottom: 10 }}>
                ● LUNA MODEL · ADAPTIVE RESPONSE
              </div>
              <p style={{ fontSize: 13, color: "#c8d8e8", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>
                "{getLunaInsight()}"
              </p>
            </Panel>

            <Panel title="WAVE BREAKDOWN">
              <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waveData} margin={{ top: 4, right: 8, bottom: 24, left: 8 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#5a8fa8", fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis hide domain={[0, 200]} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      <Cell fill="#00f5d4" />
                      <Cell fill="#0066ff" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="TASK INTEGRATION">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={addTask}
                placeholder="Add a task and press Enter..."
                style={{ width: "100%", padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,245,212,0.2)", borderRadius: 4, color: "#c8d8e8", fontFamily: "'Rajdhani', sans-serif", fontSize: 13, marginBottom: 10, boxSizing: "border-box", outline: "none" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tasks.map(task => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "rgba(0,0,0,0.2)", borderRadius: 4, border: "1px solid rgba(0,245,212,0.1)" }}>
                    <input
                      type="checkbox" checked={task.done}
                      onChange={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                      style={{ accentColor: "#00f5d4", cursor: "pointer", flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, fontSize: 13, color: task.done ? "#5a8fa8" : "#c8d8e8", textDecoration: task.done ? "line-through" : "none" }}>
                      {task.text}
                    </span>
                    <button
                      onClick={() => setTasks(p => p.filter(t => t.id !== task.id))}
                      style={{ background: "none", border: "none", color: "#5a8fa8", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}
                    >×</button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a8fa8", letterSpacing: 1 }}>
                PROGRESS {completedCount}/{tasks.length} {completedCount > 0 && completedCount === tasks.length ? "✓ COMPLETE" : ""}
              </div>
            </Panel>
          </div>
        </div>

        {/* Agent Chat */}
        <AgentChat neuralState={neural} />
      </main>
    </div>
  );
}
