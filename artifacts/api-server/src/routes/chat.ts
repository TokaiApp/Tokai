import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

let client: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  client = new Anthropic();
}

// Turn an Anthropic SDK error into a short, user-facing reason (localized).
function aiErrorReason(err: unknown, lang?: string): string {
  const zh = lang === "zh";
  const e = err as { status?: number; message?: string; error?: { error?: { message?: string } } };
  const status = e?.status;
  const raw = String(e?.error?.error?.message ?? e?.message ?? "");
  if (status === 401) return zh ? "AI 金鑰無效或已撤銷。" : "AI key is invalid or revoked.";
  if (status === 403) return zh ? "AI 金鑰無權使用此模型。" : "AI key isn't permitted to use this model.";
  if (status === 429) return zh ? "已達 AI 速率上限 — 請稍後再試。" : "AI rate limit reached — try again in a moment.";
  if (status === 400 && /credit balance|too low|billing|quota/i.test(raw)) return zh ? "AI 無法使用 — Anthropic 額度餘額不足。" : "AI unavailable — Anthropic credit balance is too low.";
  if (status === 400) return zh ? (raw ? `AI 拒絕了請求：${raw.slice(0, 140)}` : "AI 拒絕了請求。") : (raw ? `AI rejected the request: ${raw.slice(0, 140)}` : "AI rejected the request.");
  if (status === 404) return zh ? "此帳戶找不到該 AI 模型。" : "AI model not found for this account.";
  if (status === 503 || status === 529 || status === 500) return zh ? "AI 服務忙碌中 — 請稍後再試。" : "AI service is overloaded — try again shortly.";
  return zh ? (raw ? `AI 錯誤：${raw.slice(0, 140)}` : "無法連線到 AI 服務。") : (raw ? `AI error: ${raw.slice(0, 140)}` : "Could not reach the AI service.");
}

router.post("/chat", async (req, res) => {
  try {
    const { messages, neuralState, moodAssessment } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      neuralState: { focusIndex: number; bioEnergy: number; neuralNoise: number; abRatio: number };
      moodAssessment?: { mood: string; energy: string; stress: string; suggestion: string };
    };

    if (!client) {
      res.json({
        content:
          "ANTHROPIC_API_KEY is not configured. Set it in your environment to enable LUNA's cognitive recommendations.",
      });
      return;
    }

    const { focusIndex, bioEnergy, neuralNoise, abRatio } = neuralState;
    const focusLabel = focusIndex > 70 ? "HIGH" : focusIndex > 40 ? "MODERATE" : "LOW";
    const energyLabel = bioEnergy > 70 ? "high" : bioEnergy > 40 ? "moderate" : "low";
    const noiseLabel = neuralNoise < 20 ? "clean" : neuralNoise < 40 ? "nominal" : "elevated";

    const system = `You are TokAgent, an AI task planning assistant embedded in Tokai — a neurosupportive productivity suite designed for people with ADHD. You use real-time EEG and biological data to help users build and prioritize their to-do list based on their current cognitive state.

Current neural and biological state:
- Focus Index: ${focusIndex.toFixed(1)}/100 (${focusLabel})
- Biological Energy: ${Math.round(bioEnergy)}% (${energyLabel})
- Neural Noise: ${Math.round(neuralNoise)} μV² (${noiseLabel})
- Alpha/Beta Wave Ratio: ${abRatio}

Task planning guidelines based on cognitive state:
- Focus HIGH (>70): Suggest tackling the hardest, most cognitively demanding tasks first
- Focus MODERATE (40-70): Suggest structured tasks, planning, communication, reviewing
- Focus LOW (<40): Suggest easy wins, breaks, physical movement, or administrative tasks

Your behavior:
- Help the user decide what to add to their to-do list and in what order to tackle it
- Ask what they need to get done today if they haven't said
- Recommend task sequencing based on their brain data
- Keep responses concise — 2-4 sentences unless the user asks for more detail
- Be direct and actionable
- Use a calm, focused tone
- Do not use emojis${moodAssessment ? `

Mood check-in (AI vision scan of user's selfie taken at session start):
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

    const block = response.content[0];
    if (block.type !== "text") throw new Error("Unexpected content type");

    res.json({ content: block.text });
  } catch (err) {
    console.error("Chat route error:", err);
    res.status(500).json({ content: "Neural link failure. Please retry." });
  }
});

router.post("/generate-profile", async (req, res) => {
  try {
    const { name, email, taskCount, completedCount, journalCount, medCount, userApiKey } = req.body as {
      name?: string; email?: string; taskCount: number; completedCount: number;
      journalCount: number; medCount: number; userApiKey?: string;
    };
    const anthropic = client ?? (userApiKey ? new Anthropic({ apiKey: userApiKey }) : null);
    if (!anthropic) { res.status(503).json({ profile: null }); return; }

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Write a brief neurosupportive profile summary (2-3 sentences) for a Tokai user based on their activity data. Be encouraging, specific, and clinically neutral.

User: ${name || "Anonymous"} (${email || "unknown"})
Tasks: ${completedCount} of ${taskCount} completed
Journal entries: ${journalCount}
Medications logged: ${medCount}

Focus on observable patterns in their productivity and self-monitoring habits. Do not mention ADHD directly.`
      }]
    });
    res.json({ profile: (response.content[0] as { type: string; text: string }).text.trim() });
  } catch (err) {
    console.error("Generate profile error:", err);
    res.status(500).json({ profile: null });
  }
});

router.post("/best-task", async (req, res) => {
  try {
    const { neuralState, tasks, activeTaskId, userApiKey, lang } = req.body as {
      neuralState: { focusIndex: number; bioEnergy: number };
      tasks: { id: string; title: string; description: string | null; done: boolean; focusRequired?: number; estimatedMinutes?: number | null }[];
      activeTaskId?: string;
      userApiKey?: string;
      lang?: string;
    };
    const zh = lang === "zh";

    const anthropic = client ?? (userApiKey ? new Anthropic({ apiKey: userApiKey }) : null);
    if (!anthropic) {
      res.json({ taskId: null, reason: zh ? "尚未設定 API 金鑰。" : "No API key configured." });
      return;
    }

    const pending = tasks.filter(t => !t.done);
    if (pending.length === 0) {
      res.json({ taskId: null, reason: zh ? "所有任務都已完成。" : "All tasks are complete." });
      return;
    }

    const { focusIndex, bioEnergy } = neuralState;
    const taskList = pending.map((t, i) =>
      `${i + 1}. [ID:${t.id}] "${t.title}"${t.focusRequired != null ? ` (min focus: ${t.focusRequired})` : ""}${t.estimatedMinutes ? ` (${t.estimatedMinutes}m)` : ""}`
    ).join("\n");
    const activeTask = activeTaskId ? pending.find(t => t.id === activeTaskId) : null;
    const activeLine = activeTask
      ? `The user is currently working on: [ID:${activeTask.id}] "${activeTask.title}".`
      : `The user has not selected an active task yet.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `Current focus: ${focusIndex.toFixed(1)}/100. Bio energy: ${Math.round(bioEnergy)}%.

Pending tasks:
${taskList}

${activeLine}

Reply with ONLY a JSON object: {"taskId": "<the id of the single best task to do right now>", "reason": "<one short sentence>"}
Pick the single best task given the user's focus level. If the task they're already working on is the best choice, return its ID and briefly affirm it. Otherwise return the better task's ID and briefly say why switching helps.`
      }]
    });

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const parsed = JSON.parse(match[0]);
    res.json(parsed);
  } catch (err) {
    console.error("Best task error:", err);
    res.status(500).json({ taskId: null, reason: aiErrorReason(err, (req.body as { lang?: string })?.lang) });
  }
});

router.post("/mood-check", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", userApiKey } = req.body as {
      imageBase64: string;
      mimeType?: "image/jpeg" | "image/png" | "image/webp";
      userApiKey?: string;
    };

    const anthropic = client ?? (userApiKey ? new Anthropic({ apiKey: userApiKey }) : null);
    if (!anthropic) {
      res.status(503).json({ error: "No API key configured." });
      return;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: `You are a wellness assistant in Tokai, a productivity app for people with ADHD.
Analyze the person's apparent emotional and energy state from their selfie.
Reply ONLY with a valid JSON object — no prose, no markdown fences — in this exact shape:
{"mood":"positive","energy":"high","stress":"calm","suggestion":"one short actionable sentence"}
Valid values: mood = positive|neutral|low, energy = high|moderate|low, stress = calm|mild|elevated`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
                data: imageBase64,
              },
            },
            { type: "text", text: "Here is my selfie. Please assess my state." },
          ],
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== "text") throw new Error("Unexpected content type");
    const assessment = JSON.parse(block.text);
    res.json(assessment);
  } catch (err) {
    console.error("Mood check error:", err);
    res.status(500).json({ error: "Mood check failed." });
  }
});

export default router;
