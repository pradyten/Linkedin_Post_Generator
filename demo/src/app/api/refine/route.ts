import { NextRequest } from "next/server";
import {
  buildRefinePrompt,
  createClaudeStreamBody,
  createStreamHeaders,
} from "@/lib/writer";
import { incrementUsage } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { draft } = (await req.json()) as { draft: string };

  const { system, user } = buildRefinePrompt(draft);

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: createStreamHeaders(anthropicKey),
    body: JSON.stringify(createClaudeStreamBody(system, user, 1500)),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return new Response(JSON.stringify({ error: err }), {
      status: claudeRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      const reader = claudeRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            if (
              event.type === "content_block_delta" &&
              event.delta?.text
            ) {
              const text = event.delta.text;
              fullText += text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "chunk", text })}\n\n`
                )
              );
            }
          } catch {
            // Skip
          }
        }
      }

      // Increment rate limit on successful completion
      incrementUsage(ip);

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "done", fullText })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
