import logging
from datetime import datetime, timezone

from tavily import AsyncTavilyClient

from sources.models import TrendItem

logger = logging.getLogger(__name__)

WEB_QUERIES = [
    "new AI model releases this week",
    "AI agent frameworks tools launch",
    "AI coding tools updates",
    "AI safety alignment developments",
    "AI infrastructure open source",
]

TWITTER_QUERIES = [
    "AI engineering practical solutions",
    "AI paper interesting results",
    "new AI feature released",
]


async def fetch_tavily_trends(api_key: str) -> list[TrendItem]:
    """Fetch trending AI topics from Tavily web search and X/Twitter."""
    client = AsyncTavilyClient(api_key=api_key)
    items: list[TrendItem] = []
    seen_urls: set[str] = set()

    # Web searches
    for query in WEB_QUERIES:
        try:
            response = await client.search(
                query=query,
                max_results=5,
                search_depth="basic",
                include_answer=False,
            )
            for result in response.get("results", []):
                url = result.get("url", "")
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                items.append(
                    TrendItem(
                        title=result.get("title", ""),
                        summary=result.get("content", "")[:500],
                        url=url,
                        source="tavily",
                        timestamp=datetime.now(timezone.utc),
                    )
                )
        except Exception:
            logger.exception("Tavily search failed for query: %s", query)

    # X/Twitter searches
    for query in TWITTER_QUERIES:
        try:
            response = await client.search(
                query=query,
                max_results=5,
                search_depth="basic",
                include_answer=False,
                include_domains=["x.com"],
            )
            for result in response.get("results", []):
                url = result.get("url", "")
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                items.append(
                    TrendItem(
                        title=result.get("title", ""),
                        summary=result.get("content", "")[:500],
                        url=url,
                        source="twitter",
                        timestamp=datetime.now(timezone.utc),
                    )
                )
        except Exception:
            logger.exception("Tavily Twitter search failed for query: %s", query)

    logger.info("Fetched %d items from Tavily (%d web, %d twitter)",
                len(items),
                sum(1 for i in items if i.source == "tavily"),
                sum(1 for i in items if i.source == "twitter"))
    return items
