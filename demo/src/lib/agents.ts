import { TrendItem, AnalyzedTrend, TopicSuggestion } from "@/types";
import { TREND_ANALYZER_SYSTEM, buildTopicSuggesterPrompt } from "./prompts";

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

async function callClaude(
  apiKey: string,
  system: string,
  userMessage: string,
  maxTokens: number = 4096
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.content[0].text.trim();
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "");
}

export async function analyzeTrends(
  items: TrendItem[],
  apiKey: string
): Promise<AnalyzedTrend[]> {
  if (!items.length) return [];

  const itemsText = items
    .map(
      (item, i) =>
        `[${i + 1}] (${item.source}) ${item.title}\nSummary: ${item.summary}\nURL: ${item.url || "N/A"}`
    )
    .join("\n\n");

  const response = await callClaude(
    apiKey,
    TREND_ANALYZER_SYSTEM,
    `Analyze these ${items.length} AI news items:\n\n${itemsText}`
  );

  try {
    const data = JSON.parse(stripCodeFences(response));
    return data as AnalyzedTrend[];
  } catch {
    return [];
  }
}

export async function suggestTopics(
  trends: AnalyzedTrend[],
  apiKey: string,
  numTopics: number = 3
): Promise<TopicSuggestion[]> {
  const trendsText = trends
    .map(
      (t, i) =>
        `[${i + 1}] Theme: ${t.theme} | Relevance: ${t.relevance_score}/10\nTitle: ${t.title}\nSummary: ${t.summary}\nSources: ${t.sources.join(", ") || "N/A"}`
    )
    .join("\n\n");

  const response = await callClaude(
    apiKey,
    buildTopicSuggesterPrompt(numTopics),
    `Here are today's analyzed AI trends:\n\n${trendsText}\n\nNo recent post history.\n\nPick the ${numTopics} best topics for a LinkedIn post.`,
    2048
  );

  try {
    const data = JSON.parse(stripCodeFences(response));
    return data as TopicSuggestion[];
  } catch {
    return [];
  }
}
