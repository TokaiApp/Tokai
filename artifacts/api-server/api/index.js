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
    const { messages, neuralState } = req.body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.json({
        content:
          "ANTHROPIC_API_KEY is not configured. Set it in your Vercel environment variables to enable TokAgent.",
      });
      return;
    }

    const client = new Anthropic({ apiKey });
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
- Do not use emojis`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
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

module.exports = app;
