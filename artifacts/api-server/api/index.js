const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk").default;

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Turn an Anthropic SDK error into a short, user-facing reason (localized).
function aiErrorReason(err, lang) {
  const zh = lang === "zh";
  const status = err && err.status;
  const raw = String((err && err.error && err.error.error && err.error.error.message) || (err && err.message) || "");
  if (status === 401) return zh ? "AI 金鑰無效或已撤銷。" : "AI key is invalid or revoked.";
  if (status === 403) return zh ? "AI 金鑰無權使用此模型。" : "AI key isn't permitted to use this model.";
  if (status === 429) return zh ? "已達 AI 速率上限 — 請稍後再試。" : "AI rate limit reached — try again in a moment.";
  if (status === 400 && /credit balance|too low|billing|quota/i.test(raw)) return zh ? "AI 無法使用 — Anthropic 額度餘額不足。" : "AI unavailable — Anthropic credit balance is too low.";
  if (status === 400) return zh ? (raw ? `AI 拒絕了請求：${raw.slice(0, 140)}` : "AI 拒絕了請求。") : (raw ? `AI rejected the request: ${raw.slice(0, 140)}` : "AI rejected the request.");
  if (status === 404) return zh ? "此帳戶找不到該 AI 模型。" : "AI model not found for this account.";
  if (status === 503 || status === 529 || status === 500) return zh ? "AI 服務忙碌中 — 請稍後再試。" : "AI service is overloaded — try again shortly.";
  return zh ? (raw ? `AI 錯誤：${raw.slice(0, 140)}` : "無法連線到 AI 服務。") : (raw ? `AI error: ${raw.slice(0, 140)}` : "Could not reach the AI service.");
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, neuralState, tasks, journalEntries, medLog, lang, userApiKey, moodAssessment } = req.body;

    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.json({ content: "No API key provided." });
      return;
    }

    const client = new Anthropic({ apiKey });
    const { focusIndex, bioEnergy, neuralNoise, tbRatio, theta, beta } = neuralState;
    const focusLabel = focusIndex > 70 ? "HIGH" : focusIndex > 40 ? "MODERATE" : "LOW";
    const energyLabel = bioEnergy > 70 ? "high" : bioEnergy > 40 ? "moderate" : "low";
    const noiseLabel = neuralNoise < 20 ? "clean" : neuralNoise < 40 ? "nominal" : "elevated";

    const system = `You are TokAgent, an AI task planning assistant embedded in Tokai — a neurosupportive productivity suite designed for people with ADHD. You use real-time EEG and biological data to help users build and prioritize their to-do list based on their current cognitive state.

Current neural and biological state:
- Focus Index: ${focusIndex.toFixed(1)}/100 (${focusLabel})
- Biological Energy: ${Math.round(bioEnergy)}% (${energyLabel})
- Neural Noise: ${Math.round(neuralNoise)} μV² (${noiseLabel})
- Theta/Beta Ratio (TBR): ${tbRatio} (elevated TBR >3.0 is associated with ADHD inattention)${theta != null && beta != null ? `\n- Raw EEG waves: θ (theta) ${Number(theta).toFixed(1)} μV²  β (beta) ${Number(beta).toFixed(1)} μV²` : ""}

Current TokTodo task list:
${Array.isArray(tasks) && tasks.length > 0
  ? tasks.map(t => {
      let s = `- [${t.done ? "DONE" : "TODO"}]${t.emoji ? ` ${t.emoji}` : ""} ${t.title}`;
      if (t.description) s += `\n  Description: ${t.description}`;
      if (t.demand) s += ` [Cognitive demand: ${t.demand}]`;
      if (t.estimatedMinutes) s += ` [Estimated time: ${t.estimatedMinutes} min]`;
      if (t.deadline) s += ` [Deadline: ${t.deadline}]`;
      if (t.createdAt) s += ` [Added: ${t.createdAt}]`;
      return s;
    }).join("\n")
  : "- (no tasks added yet)"}

User's TokNote journal entries (most recent first):
${Array.isArray(journalEntries) && journalEntries.length > 0
  ? [...journalEntries].reverse().slice(0, 10).map(e => {
      const moods = Array.isArray(e.mood) ? e.mood : (e.mood ? [e.mood] : []);
      let s = `- [${e.date ? `${e.date} ` : ""}${e.time}] Focus ${e.focusIndex?.toFixed(1) ?? "?"} ${moods.length ? `· ${moods.join(", ")}` : ""}: ${e.text}`;
      return s;
    }).join("\n")
  : "- (no journal entries yet)"}

User's TokMed medication and supplement log (most recent first):
${Array.isArray(medLog) && medLog.length > 0
  ? [...medLog].reverse().slice(0, 10).map(m => {
      let s = `- [${m.time}] ${m.name}`;
      if (m.dose) s += ` (${m.dose})`;
      return s;
    }).join("\n")
  : "- (no medications or supplements logged)"}

Task planning guidelines based on cognitive state:
- Focus HIGH (>70): Suggest tackling the hardest, most cognitively demanding tasks first
- Focus MODERATE (40-70): Suggest structured tasks, planning, communication, reviewing
- Focus LOW (<40): Suggest easy wins, breaks, physical movement, or administrative tasks

Your behavior:
- You can see the user's full TokTodo task list, TokNote journal entries, and TokMed medication log above — reference them directly when relevant
- When medications or supplements have been logged recently, consider whether they may be affecting the user's current neural state
- Help the user decide what to add to their to-do list and in what order to tackle it
- If the task list is empty, ask what they need to get done today
- Recommend task sequencing based on their brain data and the actual tasks listed
- Keep responses concise — 2-4 sentences unless the user asks for more detail
- Be direct and actionable
- Use a calm, focused tone
- Do not use emojis
${lang === "zh" ? "- Respond in Traditional Chinese (繁體中文)" : "- Respond in English"}${moodAssessment ? `

Mood check-in (AI vision scan of user's selfie at session start):
- Apparent mood: ${moodAssessment.mood}
- Apparent energy: ${moodAssessment.energy}
- Apparent stress: ${moodAssessment.stress}
- Recommendation: ${moodAssessment.suggestion}` : ""}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system,
      messages,
    });

    if (response.stop_reason === "content_filtered" || !response.content.length) {
      res.json({ content: "TokAgent's response was blocked by Anthropic's content policy. Try rephrasing your message." });
      return;
    }

    const block = response.content[0];
    if (block.type !== "text") {
      res.json({ content: "Received an unexpected response from the AI. Please try again." });
      return;
    }

    res.json({ content: block.text });
  } catch (err) {
    console.error("Chat route error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("content") && msg.toLowerCase().includes("filter")) {
      res.json({ content: "TokAgent's response was blocked by Anthropic's content policy. Try rephrasing your message." });
    } else {
      res.status(500).json({ content: "Neural link failure. Please retry." });
    }
  }
});

app.post("/api/mood-check", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", userApiKey } = req.body;
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { res.status(503).json({ error: "No API key provided." }); return; }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: `You are a wellness assistant in Tokai, a productivity app for people with ADHD.
Analyze the person's apparent emotional and energy state from their selfie.
Reply ONLY with a valid JSON object — no prose, no markdown fences — in this exact shape:
{"mood":"positive","energy":"high","stress":"calm","suggestion":"one short actionable sentence"}
Valid values: mood = positive|neutral|low, energy = high|moderate|low, stress = calm|mild|elevated`,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
          { type: "text", text: "Here is my selfie. Please assess my state." },
        ],
      }],
    });

    const block = response.content[0];
    if (block.type !== "text") throw new Error("Unexpected content type");
    res.json(JSON.parse(block.text));
  } catch (err) {
    console.error("Mood check error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Mood check failed." });
  }
});

app.post("/api/generate-description", async (req, res) => {
  try {
    const { title, neuralState, lang, userApiKey } = req.body;
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !title) { res.json({ description: null }); return; }

    const client = new Anthropic({ apiKey });
    const { focusIndex, bioEnergy } = neuralState ?? {};

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 80,
      system: `You are TokAgent, an AI task assistant for people with ADHD. Write exactly one concise sentence (max 20 words) describing the concrete, observable outcome of completing a task. Be specific and actionable. No emojis. No quotation marks. ${lang === "zh" ? "Respond in Traditional Chinese (繁體中文)." : "Respond in English."}`,
      messages: [{
        role: "user",
        content: `Task: "${title}"\nFocus: ${focusIndex?.toFixed(1) ?? "?"}/100, Energy: ${Math.round(bioEnergy ?? 0)}%\n\nWrite one sentence describing the concrete outcome of completing this task.`,
      }],
    });

    const block = response.content[0];
    res.json({ description: block?.type === "text" ? block.text.trim() : null });
  } catch (err) {
    console.error("Generate description error:", err);
    res.status(500).json({ description: null });
  }
});

app.post("/api/best-task", async (req, res) => {
  try {
    const { neuralState, tasks, activeTaskId, userApiKey, lang } = req.body;
    const zh = lang === "zh";
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { res.json({ taskId: null, reason: zh ? "尚未設定 API 金鑰。" : "No API key configured." }); return; }

    const pending = (tasks || []).filter(t => !t.done);
    if (pending.length === 0) { res.json({ taskId: null, reason: zh ? "所有任務都已完成。" : "All tasks are complete." }); return; }

    const client = new Anthropic({ apiKey });
    const { focusIndex, bioEnergy } = neuralState || {};
    const taskList = pending.map((t, i) =>
      `${i + 1}. [ID:${t.id}] "${t.title}"${t.focusRequired != null ? ` (min focus: ${t.focusRequired})` : ""}${t.estimatedMinutes ? ` (${t.estimatedMinutes}m)` : ""}`
    ).join("\n");
    const activeTask = activeTaskId ? pending.find(t => t.id === activeTaskId) : null;
    const activeLine = activeTask
      ? `The user is currently working on: [ID:${activeTask.id}] "${activeTask.title}".`
      : `The user has not selected an active task yet.`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `Current focus: ${(focusIndex || 0).toFixed(1)}/100. Bio energy: ${Math.round(bioEnergy || 0)}%.\n\nPending tasks:\n${taskList}\n\n${activeLine}\n\nReply with ONLY a JSON object: {"taskId": "<the id of the single best task to do right now>", "reason": "<one short sentence>"}\nPick the single best task given the user's focus level. If the task they're already working on is the best choice, return its ID and briefly affirm it. Otherwise return the better task's ID and briefly say why switching helps.`
      }]
    });

    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    res.json(JSON.parse(match[0]));
  } catch (err) {
    console.error("Best task error:", err);
    res.status(500).json({ taskId: null, reason: aiErrorReason(err, req.body && req.body.lang) });
  }
});

app.post("/api/generate-profile", async (req, res) => {
  try {
    const { name, email, taskCount, completedCount, journalCount, medCount, userApiKey } = req.body;
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { res.status(503).json({ profile: null }); return; }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Write a brief neurosupportive profile summary (2-3 sentences) for a Tokai user based on their activity data. Be encouraging, specific, and clinically neutral.\n\nUser: ${name || "Anonymous"} (${email || "unknown"})\nTasks: ${completedCount || 0} of ${taskCount || 0} completed\nJournal entries: ${journalCount || 0}\nMedications logged: ${medCount || 0}\n\nFocus on observable patterns in their productivity and self-monitoring habits. Do not mention ADHD directly.`
      }]
    });

    res.json({ profile: response.content[0].text.trim() });
  } catch (err) {
    console.error("Generate profile error:", err);
    res.status(500).json({ profile: null });
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API server listening on :${port}`));
}

module.exports = app;
