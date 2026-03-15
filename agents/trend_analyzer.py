import json
import logging
import re

from anthropic import AsyncAnthropic
from pydantic import BaseModel

from sources.models import TrendItem

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a senior AI research analyst who tracks the AI/ML ecosystem daily for an audience \
of practicing AI engineers. You specialize in separating signal from noise across model \
releases, infrastructure shifts, safety research, and applied AI developments.

Your task: analyze raw AI news items, deduplicate overlapping stories, group by theme, \
and rank by relevance to working AI engineers.

<process>
1. SCAN all items. Identify which ones cover the same underlying story or announcement.
2. MERGE duplicates into a single trend, combining the best details and all source URLs \
from each duplicate.
3. GROUP remaining items into coherent themes (e.g., "Model Releases", "AI Safety", \
"Infrastructure", "Regulation", "Open Source", "Applied AI").
4. SCORE each trend 1-10 for relevance:
   - 9-10: Major model release, breakthrough result, or industry-shifting announcement (last 24h)
   - 7-8: Significant development with clear engineering implications (last 48h)
   - 5-6: Notable but incremental progress or niche interest
   - 3-4: Tangentially related or older news
   - 1-2: Low relevance to AI engineers
5. RANK by relevance_score descending. Return at most 10 trends.
</process>

<output_format>
Return a raw JSON array (no markdown, no code fences, no commentary). Each element:
{
  "theme": "short theme label",
  "title": "concise headline capturing the core development",
  "summary": "2-3 sentences on why this matters for AI engineers. Be specific about \
technical implications.",
  "sources": ["url1", "url2"],
  "relevance_score": 8
}
</output_format>

<example_output>
[{"theme": "Model Releases", "title": "Anthropic launches Claude Opus 4.6 with extended \
thinking", "summary": "Anthropic released Claude Opus 4.6 with native extended thinking \
capabilities and a 200K context window. The model shows significant reasoning improvements \
on math and code benchmarks, signaling a shift toward inference-time compute scaling.", \
"sources": ["https://example.com/article1", "https://example.com/article2"], \
"relevance_score": 9}]
</example_output>"""


class AnalyzedTrend(BaseModel):
    theme: str
    title: str
    summary: str
    sources: list[str] = []
    relevance_score: int = 5


class AnalyzedTrends(BaseModel):
    trends: list[AnalyzedTrend]


async def analyze_trends(
    items: list[TrendItem],
    api_key: str,
    model: str,
) -> AnalyzedTrends:
    """Analyze raw trend items using Claude to deduplicate, group, and rank."""
    if not items:
        return AnalyzedTrends(trends=[])

    # Format items for Claude
    items_text = "\n\n".join(
        f"[{i+1}] ({item.source}) {item.title}\n"
        f"Summary: {item.summary}\n"
        f"URL: {item.url or 'N/A'}"
        for i, item in enumerate(items)
    )

    client = AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Analyze these {len(items)} AI news items:\n\n{items_text}",
            }
        ],
    )

    response_text = message.content[0].text.strip()
    # Strip markdown code fences if present
    response_text = re.sub(r"^```(?:json)?\s*\n?", "", response_text)
    response_text = re.sub(r"\n?```\s*$", "", response_text)
    try:
        trends_data = json.loads(response_text)
        trends = [AnalyzedTrend(**t) for t in trends_data]
    except (json.JSONDecodeError, TypeError, KeyError):
        logger.exception("Failed to parse trend analysis response")
        trends = []

    logger.info("Analyzed trends: %d themes identified", len(trends))
    return AnalyzedTrends(trends=trends)
