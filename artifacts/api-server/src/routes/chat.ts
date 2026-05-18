import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

let client: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  client = new Anthropic();
}

router.post("/chat", async (req, res) => {
  try {
    const { messages, neuralState } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      neuralState: { focusIndex: number; bioEnergy: number; neuralNoise: number; abRatio: number };
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

    const system = `You are LUNA, an embedded AI cognitive assistant in Tokai — a neurosupportive productivity suite designed for people with ADHD. You synthesize real-time EEG and biological data to help users make smart decisions about what to work on right now.

Current neural and biological state:
- Focus Index: ${focusIndex.toFixed(1)}/100 (${focusLabel})
- Biological Energy: ${Math.round(bioEnergy)}% (${energyLabel})
- Neural Noise: ${Math.round(neuralNoise)} μV² (${noiseLabel})
- Alpha/Beta Wave Ratio: ${abRatio}

Task routing guidelines:
- Focus HIGH (>70): Recommend deep work, complex problem-solving, creative output, learning new material
- Focus MODERATE (40-70): Recommend structured tasks, meetings, emails, reviewing, planning
- Focus LOW (<40): Recommend simple tasks, breaks, physical movement, mindless processing

Your behavior:
- Ask clarifying questions about what the user needs to accomplish
- Prioritize their task list based on their current cognitive state
- Keep responses concise — 2-4 sentences max unless the user asks for detail
- Be direct and actionable, not motivational or generic
- Use a calm, precise, slightly clinical tone befitting a neural analysis system
- Do not use emojis`;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
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

export default router;
