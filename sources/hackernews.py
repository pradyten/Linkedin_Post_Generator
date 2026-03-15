import logging
from datetime import datetime, timezone

import httpx

from sources.models import TrendItem

logger = logging.getLogger(__name__)

HN_TOP_STORIES = "https://hacker-news.firebaseio.com/v0/topstories.json"
HN_ITEM = "https://hacker-news.firebaseio.com/v0/item/{}.json"

AI_KEYWORDS = [
    "ai", "artificial intelligence", "llm", "gpt", "claude", "gemini",
    "machine learning", "deep learning", "neural", "transformer",
    "openai", "anthropic", "google ai", "meta ai", "mistral",
    "diffusion", "agent", "rag", "fine-tun", "embedding",
    "multimodal", "reasoning", "rlhf", "benchmark",
    # AI coding tools
    "copilot", "cursor", "codegen",
    # Safety & alignment
    "alignment", "safety", "interpretability",
    # Infrastructure & compute
    "inference", "gpu", "tpu", "compute", "scaling",
    # Agentic frameworks
    "agentic", "crew", "autogen", "langchain", "langgraph",
    # Key people
    "sam altman", "dario", "demis hassabis",
    # Open-source models
    "open source", "llama", "qwen", "deepseek",
    # Emerging domains
    "robotics", "embodied", "regulation",
]


def _is_ai_related(title: str) -> bool:
    title_lower = title.lower()
    return any(kw in title_lower for kw in AI_KEYWORDS)


async def fetch_hackernews_trends() -> list[TrendItem]:
    """Fetch AI-related stories from Hacker News top stories."""
    items: list[TrendItem] = []

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(HN_TOP_STORIES)
            resp.raise_for_status()
            story_ids = resp.json()[:30]

            for story_id in story_ids:
                try:
                    resp = await client.get(HN_ITEM.format(story_id))
                    resp.raise_for_status()
                    story = resp.json()

                    if not story or story.get("type") != "story":
                        continue

                    title = story.get("title", "")
                    if not _is_ai_related(title):
                        continue

                    timestamp = None
                    if story.get("time"):
                        timestamp = datetime.fromtimestamp(
                            story["time"], tz=timezone.utc
                        )

                    hn_url = f"https://news.ycombinator.com/item?id={story_id}"
                    items.append(
                        TrendItem(
                            title=title,
                            summary=f"{title} (HN score: {story.get('score', 0)}, "
                            f"{story.get('descendants', 0)} comments)",
                            url=story.get("url", hn_url),
                            source="hackernews",
                            timestamp=timestamp,
                        )
                    )
                except Exception:
                    logger.exception("Failed to fetch HN story %s", story_id)
    except Exception:
        logger.exception("Failed to fetch HN top stories")

    logger.info("Fetched %d AI-related items from Hacker News", len(items))
    return items
