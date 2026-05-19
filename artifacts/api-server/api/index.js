const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk").default;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, neuralState, tasks, lang, userApiKey } = req.body;

    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.json({ content: "No API key provided." });
      return;
    }

    const client = new Anthropic({ apiKey });
    const { focusIndex, bioEnergy, neuralNoise, tbRatio } = neuralState;
    const focusLabel = focusIndex > 70 ? "HIGH" : focusIndex > 40 ? "MODERATE" : "LOW";
    const energyLabel = bioEnergy > 70 ? "high" : bioEnergy > 40 ? "moderate" : "low";
    const noiseLabel = neuralNoise < 20 ? "clean" : neuralNoise < 40 ? "nominal" : "elevated";

    const system = `You are TokAgent, an AI task planning assistant embedded in Tokai — a neurosupportive productivity suite designed for people with ADHD. You use real-time EEG and biological data to help users build and prioritize their to-do list based on their current cognitive state.

Current neural and biological state:
- Focus Index: ${focusIndex.toFixed(1)}/100 (${focusLabel})
- Biological Energy: ${Math.round(bioEnergy)}% (${energyLabel})
- Neural Noise: ${Math.round(neuralNoise)} μV² (${noiseLabel})
- Theta/Beta Ratio (TBR): ${tbRatio} (elevated TBR is associated with ADHD inattention)

Current TokTodo task list:
${Array.isArray(tasks) && tasks.length > 0
  ? tasks.map(t => {
      let s = `- [${t.done ? "DONE" : "TODO"}] ${t.title}`;
      if (t.description) s += `\n  Description: ${t.description}`;
      if (t.demand) s += ` [Cognitive demand: ${t.demand}]`;
      if (t.estimatedMinutes) s += ` [Estimated time: ${t.estimatedMinutes} min]`;
      return s;
    }).join("\n")
  : "- (no tasks added yet)"}

Task planning guidelines based on cognitive state:
- Focus HIGH (>70): Suggest tackling the hardest, most cognitively demanding tasks first
- Focus MODERATE (40-70): Suggest structured tasks, planning, communication, reviewing
- Focus LOW (<40): Suggest easy wins, breaks, physical movement, or administrative tasks

Your behavior:
- You can see the user's current TokTodo task list above — reference it directly when answering questions about their tasks
- Help the user decide what to add to their to-do list and in what order to tackle it
- If the task list is empty, ask what they need to get done today
- Recommend task sequencing based on their brain data and the actual tasks listed
- Keep responses concise — 2-4 sentences unless the user asks for more detail
- Be direct and actionable
- Use a calm, focused tone
- Do not use emojis
${lang === "zh" ? "- Respond in Traditional Chinese (繁體中文)" : "- Respond in English"}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
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

app.post("/api/generate-description", async (req, res) => {
  try {
    const { title, neuralState, lang, userApiKey } = req.body;
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !title) { res.json({ description: null }); return; }

    const client = new Anthropic({ apiKey });
    const { focusIndex, bioEnergy } = neuralState ?? {};

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
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

module.exports = app;
