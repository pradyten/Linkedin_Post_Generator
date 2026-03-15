import asyncio
import logging
import re
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

import feedparser

from sources.models import TrendItem

logger = logging.getLogger(__name__)

RSS_FEEDS = [
    ("https://www.anthropic.com/feed.xml", "Anthropic Blog"),
    ("https://openai.com/blog/rss/", "OpenAI Blog"),
    ("https://blog.google/technology/ai/rss/", "Google AI Blog"),
    ("https://huggingface.co/blog/feed.xml", "Hugging Face Blog"),
    ("https://techcrunch.com/category/artificial-intelligence/feed/", "TechCrunch AI"),
    ("https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "The Verge AI"),
    ("https://www.technologyreview.com/feed/", "MIT Technology Review"),
    ("https://rss.arxiv.org/rss/cs.AI", "ArXiv cs.AI"),
    ("https://deepmind.google/blog/rss.xml", "DeepMind Blog"),
    ("https://ai.meta.com/blog/rss/", "Meta AI Blog"),
    ("https://blogs.microsoft.com/ai/feed/", "Microsoft AI Blog"),
    ("https://blogs.nvidia.com/feed/", "NVIDIA AI Blog"),
]


def _parse_entry_date(entry: dict) -> datetime | None:
    """Try to parse the publication date from an RSS entry."""
    for field in ("published", "updated"):
        raw = entry.get(field)
        if not raw:
            continue
        try:
            return parsedate_to_datetime(raw)
        except Exception:
            pass
    return None


async def fetch_rss_trends() -> list[TrendItem]:
    """Fetch recent AI news from RSS feeds (last 48 hours)."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    items: list[TrendItem] = []

    for feed_url, feed_name in RSS_FEEDS:
        try:
            # feedparser.parse is synchronous — run in thread pool to avoid blocking
            feed = await asyncio.to_thread(feedparser.parse, feed_url)
            for entry in feed.entries[:10]:
                pub_date = _parse_entry_date(entry)

                # Skip entries older than 48 hours (if we can determine age)
                if pub_date:
                    if pub_date.tzinfo is None:
                        pub_date = pub_date.replace(tzinfo=timezone.utc)
                    if pub_date < cutoff:
                        continue

                summary = entry.get("summary", entry.get("description", ""))
                # Strip HTML tags simply
                summary = summary.replace("<br>", " ").replace("<br/>", " ")
                if "<" in summary:
                    summary = re.sub(r"<[^>]+>", "", summary)
                summary = summary[:500]

                items.append(
                    TrendItem(
                        title=entry.get("title", ""),
                        summary=summary,
                        url=entry.get("link"),
                        source="rss",
                        timestamp=pub_date,
                    )
                )
        except Exception:
            logger.exception("Failed to parse RSS feed: %s", feed_name)

    logger.info("Fetched %d items from RSS feeds", len(items))
    return items
