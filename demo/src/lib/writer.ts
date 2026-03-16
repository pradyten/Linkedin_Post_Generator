import { TopicSuggestion, WebSource } from "@/types";
import {
  RESEARCH_SYSTEM,
  DRAFT_SYSTEM,
  REFINE_SYSTEM,
  BRAND_VOICE,
  HOOKS_MD,
  EXAMPLES_MD,
} from "./prompts";

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

export async function tavilySearch(
  topicTitle: string,
  apiKey: string
): Promise<WebSource[]> {
  const queries = [topicTitle, `${topicTitle} latest news analysis`];
  const allResults: WebSource[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: 5,
          search_depth: "advanced",
          topic: "news",
          time_range: "day",
          include_answer: false,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const result of data.results || []) {
        const url = result.url || "";
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          allResults.push({
            title: result.title || "",
            url,
            snippet: (result.content || "").slice(0, 500),
          });
        }
      }
    } catch {
      // Skip failed queries
    }
  }
  return allResults.slice(0, 8);
}

function createClaudeStreamBody(
  system: string,
  userMessage: string,
  maxTokens: number = 4096
) {
  return {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    stream: true,
    system,
    messages: [{ role: "user", content: userMessage }],
  };
}

export function buildResearchPrompt(
  topic: TopicSuggestion,
  webSources: WebSource[]
): { system: string; user: string } {
  let userContent: string;
  if (webSources.length > 0) {
    const webText = webSources
      .map(
        (src, i) =>
          `${i + 1}. **${src.title}**\n   URL: ${src.url}\n   Content: ${src.snippet}`
      )
      .join("\n\n");
    userContent = `Research this topic for a LinkedIn post using the web sources below:

Title: ${topic.title}
Opening Hook: ${topic.hook}
Source Material: ${topic.source_material}

## Web Research Results
${webText}

Using ONLY the information from these web sources, provide a structured research brief with statistics, credible sources (preserve exact URLs), narrative angles, and strategic hashtags.`;
  } else {
    userContent = `Research this topic for a LinkedIn post:

Title: ${topic.title}
Opening Hook: ${topic.hook}
Source Material: ${topic.source_material}

Provide a structured research brief with statistics, credible sources, narrative angles, and strategic hashtags.`;
  }
  return { system: RESEARCH_SYSTEM, user: userContent };
}

export function buildDraftPrompt(
  topic: TopicSuggestion,
  research: string,
  webSources: WebSource[]
): { system: string; user: string } {
  let userContent = `## Selected Topic
Title: ${topic.title}
Opening Hook: ${topic.hook}
Source Material: ${topic.source_material}

## Research Brief
${research}

## Brand Voice Guidelines
${BRAND_VOICE}

## Learned Hooks & Patterns (what works for this audience)
${HOOKS_MD}

## Example Posts (match this style)
${EXAMPLES_MD}
`;

  if (webSources.length > 0) {
    userContent +=
      "\n## Available Source URLs (include at least 1 naturally in the post)\n";
    for (const src of webSources.slice(0, 5)) {
      userContent += `- ${src.title}: ${src.url}\n`;
    }
  }

  return { system: DRAFT_SYSTEM, user: userContent };
}

export function buildRefinePrompt(
  draft: string
): { system: string; user: string } {
  return {
    system: REFINE_SYSTEM,
    user: `## Draft Post\n${draft}\n\n## Brand Voice Guidelines\n${BRAND_VOICE}\n\n## Learned Hooks & Patterns\n${HOOKS_MD}\n`,
  };
}

export function createStreamHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
}

export { createClaudeStreamBody };
