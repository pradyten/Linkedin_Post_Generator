"""Test the full pipeline: sources -> analyze -> suggest -> write. Run: python test_pipeline.py"""
import asyncio
import re
import sys

from config.settings import Settings


async def main():
    settings = Settings()

    # 1. Fetch sources
    print("1. Fetching sources...")
    from sources.tavily_source import fetch_tavily_trends
    from sources.hackernews import fetch_hackernews_trends
    from sources.rss_feeds import fetch_rss_trends

    results = await asyncio.gather(
        fetch_tavily_trends(settings.tavily_api_key),
        fetch_hackernews_trends(),
        fetch_rss_trends(),
        return_exceptions=True,
    )

    all_items = []
    for r in results:
        if isinstance(r, Exception):
            print(f"   Source error: {r}")
        else:
            all_items.extend(r)
    print(f"   Total items: {len(all_items)}")

    if not all_items:
        print("   No items fetched. Check your API keys.")
        return

    # 2. Analyze trends
    print("\n2. Analyzing trends (Claude Sonnet)...")
    from agents.trend_analyzer import analyze_trends
    analyzed = await analyze_trends(all_items, settings.anthropic_api_key, settings.analysis_model)
    print(f"   Found {len(analyzed.trends)} themes:")
    for t in analyzed.trends[:5]:
        print(f"   - [{t.relevance_score}/10] {t.title}")

    if not analyzed.trends:
        print("   Analysis returned no trends. Check Anthropic API key.")
        return

    # 3. Suggest topics
    print("\n3. Suggesting topics (Claude Sonnet)...")
    from agents.topic_suggester import suggest_topics
    suggestions = await suggest_topics(
        analyzed, [], settings.anthropic_api_key, settings.analysis_model,
        num_topics=settings.num_topic_suggestions,
    )
    print(f"   Got {len(suggestions.topics)} topic suggestions:")
    for i, t in enumerate(suggestions.topics, 1):
        print(f"   {i}. {t.title}")
        print(f"      Hook: {t.hook}")

    if not suggestions.topics:
        print("   No suggestions generated.")
        return

    # 4. Write a post for the first topic
    provider = settings.writing_provider
    print(f"\n4. Writing post (with web research + {provider.capitalize()})...")
    from agents.post_writer import write_post
    brand_voice = settings.brand_voice_path.read_text(encoding="utf-8")
    hooks = settings.hooks_path.read_text(encoding="utf-8")
    examples = settings.examples_path.read_text(encoding="utf-8")

    post = await write_post(
        topic=suggestions.topics[0],
        brand_voice=brand_voice,
        hooks=hooks,
        examples=examples,
        recent_posts=[],
        api_key=settings.anthropic_api_key,
        model=settings.writing_model,
        tavily_api_key=settings.tavily_api_key,
        writing_provider=settings.writing_provider,
        google_api_key=settings.google_api_key,
    )

    print("\n" + "=" * 60)
    print("GENERATED POST:")
    print("=" * 60)
    print(post.encode(sys.stdout.encoding or "utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8", errors="replace"))
    print("=" * 60)
    print(f"\nPost length: {len(post)} characters")

    # 5. Verify source URLs
    urls = re.findall(r'https?://[^\s)\]>]+', post)
    if urls:
        print(f"\nSource URLs found: {len(urls)}")
        for url in urls:
            print(f"   - {url}")
    else:
        print("\nNo source URLs found in the post.")

    print("\nFull pipeline test PASSED!")


if __name__ == "__main__":
    asyncio.run(main())
