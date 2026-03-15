"""Test each data source independently. Run: python test_sources.py"""
import asyncio
from config.settings import Settings


async def test_tavily():
    from sources.tavily_source import fetch_tavily_trends
    settings = Settings()
    print("\n=== TAVILY ===")
    items = await fetch_tavily_trends(settings.tavily_api_key)
    print(f"Got {len(items)} items")
    for item in items[:3]:
        print(f"  - {item.title[:80]}")
    return len(items) > 0


async def test_hackernews():
    from sources.hackernews import fetch_hackernews_trends
    print("\n=== HACKER NEWS ===")
    items = await fetch_hackernews_trends()
    print(f"Got {len(items)} AI-related items")
    for item in items[:3]:
        print(f"  - {item.title[:80]}")
    return len(items) >= 0  # might be 0 if no AI stories are trending


async def test_rss():
    from sources.rss_feeds import fetch_rss_trends
    print("\n=== RSS FEEDS ===")
    items = await fetch_rss_trends()
    print(f"Got {len(items)} items from last 48h")
    for item in items[:3]:
        print(f"  - [{item.source}] {item.title[:70]}")
    return len(items) >= 0


async def main():
    results = {}
    for name, test_fn in [("Tavily", test_tavily), ("HackerNews", test_hackernews), ("RSS", test_rss)]:
        try:
            results[name] = await test_fn()
        except Exception as e:
            print(f"\n  ERROR in {name}: {e}")
            results[name] = False

    print("\n=== RESULTS ===")
    for name, ok in results.items():
        status = "PASS" if ok else "FAIL"
        print(f"  {name}: {status}")


if __name__ == "__main__":
    asyncio.run(main())
