import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ModeSchema = z.enum(["chat", "summarize", "quiz", "explain"]);

const SYSTEM_PROMPTS: Record<z.infer<typeof ModeSchema>, string> = {
  chat: "You are a friendly, sharp AI study tutor. Answer the student's question using ONLY the provided study material when relevant. If the material doesn't cover it, say so briefly and then give your best general answer. Use clear markdown, short paragraphs, and bold key terms.",
  summarize:
    "You are a study coach. Produce a clean, hierarchical summary of the provided material. Use markdown: a one-sentence TL;DR, then ## Key Concepts as bullets, then ## Important Details, then ## Things to Remember. Be concise but lose no critical idea.",
  quiz: "You are a quiz generator. From the provided material create 8 quiz questions. Mix 5 multiple-choice (4 options each, mark the correct one with ✅) and 3 short-answer questions. After all questions, add an '## Answer Key' section with explanations. Use clean markdown.",
  explain:
    "You are explaining to a curious 15-year-old. Take the provided material (or topic) and explain it in plain language with vivid analogies. Use markdown, short sentences, and one real-world analogy per major idea. End with a 3-bullet 'Why this matters' section.",
};

export const askStudyAI = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      mode: ModeSchema,
      material: z.string().max(120_000).optional().default(""),
      question: z.string().max(4000).optional().default(""),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured yet." };
    }

    const system = SYSTEM_PROMPTS[data.mode];
    const userParts: string[] = [];
    if (data.material.trim()) {
      userParts.push(
        `--- STUDY MATERIAL ---\n${data.material.slice(0, 120_000)}\n--- END MATERIAL ---`,
      );
    }
    if (data.question.trim()) {
      userParts.push(`Request: ${data.question}`);
    } else {
      const fallback: Record<string, string> = {
        summarize: "Summarize the material above.",
        quiz: "Generate a quiz from the material above.",
        explain: "Explain the material above simply.",
        chat: "Give me a useful overview of this material.",
      };
      userParts.push(fallback[data.mode]);
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userParts.join("\n\n") },
          ],
        }),
      });

      if (!res.ok) {
        if (res.status === 429)
          return { ok: false as const, error: "Rate limit hit. Try again in a moment." };
        if (res.status === 402)
          return {
            ok: false as const,
            error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
          };
        const t = await res.text();
        console.error("AI gateway error", res.status, t);
        return { ok: false as const, error: "The AI service had an issue. Try again." };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content ?? "";
      return { ok: true as const, content };
    } catch (e) {
      console.error("askStudyAI failed", e);
      return { ok: false as const, error: "Network error talking to AI." };
    }
  });
