import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  getCachedSuggestions,
  setCachedSuggestions,
  type ClassCodeSuggestion,
} from "../lib/aiClassifyCache.js";

const router: IRouter = Router();

const MAX_DESCRIPTION_LENGTH = 2000;

const getClient = () =>
  new Anthropic({
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  });

router.post("/classify", async (req, res) => {
  const { description, state } = req.body;

  if (!description || typeof description !== "string") {
    return res.status(400).json({ success: false, error: "description is required" });
  }

  const sanitizedDesc = description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
  if (sanitizedDesc.length === 0) {
    return res.status(400).json({ success: false, error: "description cannot be empty" });
  }

  const sanitizedState = typeof state === "string" ? state.trim().toUpperCase().slice(0, 2) : "";

  const cached = getCachedSuggestions(sanitizedDesc, sanitizedState);
  if (cached) {
    return res.json({ success: true, data: cached, cached: true });
  }

  try {
    const client = getClient();
    const prompt = `You are a workers' compensation class code classification expert. Given a business/job description, suggest the most appropriate NCCI class codes.

Business/Job Description: "${sanitizedDesc}"
${sanitizedState ? `State: ${sanitizedState}` : ""}

Return a JSON array of up to 5 class code suggestions. Each object must have:
- "classCode": the 4-digit NCCI class code as a string
- "description": official class code description
- "confidence": a number 0-1 indicating confidence
- "reasoning": brief explanation of why this code fits

Return ONLY the JSON array, no other text.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: "Failed to parse AI response" });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const suggestions: ClassCodeSuggestion[] = Array.isArray(parsed)
      ? parsed.slice(0, 5).map((s: any) => ({
          classCode: String(s.classCode || "").slice(0, 10),
          description: String(s.description || "").slice(0, 200),
          confidence: Math.max(0, Math.min(1, Number(s.confidence) || 0)),
          reasoning: String(s.reasoning || "").slice(0, 500),
        }))
      : [];

    if (suggestions.length > 0) {
      setCachedSuggestions(sanitizedDesc, sanitizedState, suggestions);
    }

    res.json({ success: true, data: suggestions, cached: false });
  } catch (err: any) {
    req.log.error({ err }, "AI classify error");
    res.status(500).json({ success: false, error: "AI classification failed" });
  }
});

export default router;
