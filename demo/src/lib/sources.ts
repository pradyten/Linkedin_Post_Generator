import { TrendItem } from "@/types";

const AI_KEYWORDS = [
  "ai", "artificial intelligence", "llm", "gpt", "claude", "gemini",
  "machine learning", "deep learning", "neural", "transformer",
  "openai", "anthropic", "google ai", "meta ai", "mistral",
  "diffusion", "agent", "rag", "fine-tun", "embedding",
  "multimodal", "reasoning", "rlhf", "benchmark",
  "copilot", "cursor", "codegen",
  "alignment", "safety", "interpretability",
  "inference", "gpu", "tpu", "compute", "scaling",
  "agentic", "crew", "autogen", "langchain", "langgraph",
  "open source", "llama", "qwen", "deepseek",
  "robotics", "embodied", "regulation",
];

function isAiRelated(title: string): boolean {
  const lower = title.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
}

const WEB_QUERIES = [
  "new AI model releases this week",
  "AI agent frameworks tools launch",
  "AI coding tools updates",
  "AI safety alignment developments",
  "AI infrastructure open source",
];

export async function fetchTavilySources(
  apiKey: string
): Promise<TrendItem[]> {
  const items: TrendItem[] = [];
  const seenUrls = new Set<string>();

  for (const query of WEB_QUERIES) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: 5,
          search_depth: "basic",
          include_answer: false,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const result of data.results || []) {
        const url = result.url || "";
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          items.push({
            title: result.title || "",
            summary: (result.content || "").slice(0, 500),
            url,
            source: "tavily",
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Skip failed queries
    }
  }
  return items;
}

export async function fetchHackerNewsSources(): Promise<TrendItem[]> {
  const items: TrendItem[] = [];
  try {
    const res = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    );
    if (!res.ok) return items;
    const storyIds: number[] = (await res.json()).slice(0, 30);

    const fetches = storyIds.map(async (id) => {
      try {
        const r = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    });
    const stories = await Promise.all(fetches);

    for (const story of stories) {
      if (!story || story.type !== "story") continue;
      const title = story.title || "";
      if (!isAiRelated(title)) continue;
      const hnUrl = `https://news.ycombinator.com/item?id=${story.id}`;
      items.push({
        title,
        summary: `${title} (HN score: ${story.score || 0}, ${story.descendants || 0} comments)`,
        url: story.url || hnUrl,
        source: "hackernews",
        timestamp: story.time
          ? new Date(story.time * 1000).toISOString()
          : null,
      });
    }
  } catch {
    // Ignore
  }
  return items;
}

export async function fetchRssSources(): Promise<TrendItem[]> {
  const feeds = [
    "https://www.anthropic.com/feed.xml",
    "https://openai.com/blog/rss/",
    "https://blog.google/technology/ai/rss/",
    "https://huggingface.co/blog/feed.xml",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://deepmind.google/blog/rss.xml",
  ];

  const items: TrendItem[] = [];
  for (const feedUrl of feeds) {
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== "ok") continue;
      for (const item of (data.items || []).slice(0, 5)) {
        items.push({
          title: item.title || "",
          summary: (item.description || "")
            .replace(/<[^>]+>/g, "")
            .slice(0, 500),
          url: item.link || null,
          source: "rss",
          timestamp: item.pubDate || null,
        });
      }
    } catch {
      // Skip failed feeds
    }
  }
  return items;
}
