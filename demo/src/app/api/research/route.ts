import { NextRequest } from "next/server";
import {
  tavilySearch,
  buildResearchPrompt,
  createClaudeStreamBody,
  createStreamHeaders,
} from "@/lib/writer";
import { isRateLimited } from "@/lib/rate-limit";
import { TopicSuggestion } from "@/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Daily rate limit reached" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { topic } = (await req.json()) as { topic: TopicSuggestion };

  // Tavily web search
  let webSources: { title: string; url: string; snippet: string }[] = [];
  if (tavilyKey) {
    try {
      webSources = await tavilySearch(topic.title, tavilyKey);
    } catch {
      // Fall back to no web sources
    }
  }

  const { system, user } = buildResearchPrompt(topic, webSources);

  // Stream from Claude
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: createStreamHeaders(anthropicKey),
    body: JSON.stringify(createClaudeStreamBody(system, user, 2048)),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return new Response(JSON.stringify({ error: err }), {
      status: claudeRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send web sources first
      if (webSources.length > 0) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "sources", data: webSources })}\n\n`
          )
        );
      }

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
            // Skip unparseable lines
          }
        }
      }

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
