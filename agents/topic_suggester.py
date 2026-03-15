import json
import logging
import re

from anthropic import AsyncAnthropic
from pydantic import BaseModel

from agents.trend_analyzer import AnalyzedTrends

logger = logging.getLogger(__name__)


def _build_system_prompt(num_topics: int) -> str:
    """Build the system prompt with the specified number of topics."""
    return f"""\
You are a LinkedIn content strategist who has grown multiple AI-focused accounts past \
50K followers. You understand what makes AI engineers stop scrolling: technical depth \
paired with a strong angle.

Your task: select the {num_topics} best trending AI topics for engaging LinkedIn posts from the \
provided analyzed trends.

<selection_criteria>
Apply these filters in order:
1. RECENCY: Happened in the last 24-48 hours or is actively trending right now.
2. ANGLE: Has a clear contrarian, surprising, or debate-worthy angle that invites comments.
3. DEPTH: Allows the poster to demonstrate genuine AI engineering knowledge (not \
surface-level news).
4. FRESHNESS: Not already covered in the recent post history provided below.
</selection_criteria>

<thinking_process>
For each candidate topic, mentally evaluate:
- "Would an AI engineer share this with a colleague?" (virality test)
- "Can I write 3 substantive technical points about this?" (depth test)
- "Does this have a non-obvious take?" (differentiation test)
Select the {num_topics} strongest topics that pass all three tests.
</thinking_process>

<output_format>
Return a raw JSON array of exactly {num_topics} objects (no markdown, no code fences, no commentary):
{{
  "title": "compelling topic title, 5-10 words",
  "hook": "one-line opening hook: punchy, surprising, or contrarian. Must stop the scroll.",
  "reasoning": "one sentence on why this topic is timely and would resonate with AI engineers",
  "source_material": "key facts, numbers, and details to include in the post"
}}
</output_format>

<example_output>
[{{"title": "Why Smaller Models Are Winning the Enterprise", "hook": "The biggest AI models \
aren't winning where it matters most.", "reasoning": "Enterprise adoption data shows a clear \
trend toward efficient smaller models, which challenges the scaling-maximalist narrative \
dominating LinkedIn.", "source_material": "Llama 3 8B handles 80% of enterprise use cases. \
Cost per token dropped 10x in 12 months. Three Fortune 500 companies publicly switched from \
GPT-4 to fine-tuned smaller models this quarter."}}]
</example_output>"""


class TopicSuggestion(BaseModel):
    title: str
    hook: str
    reasoning: str
    source_material: str = ""


class TopicSuggestions(BaseModel):
    topics: list[TopicSuggestion]


async def suggest_topics(
    analyzed_trends: AnalyzedTrends,
    recent_topics: list[str],
    api_key: str,
    model: str,
    num_topics: int = 5,
) -> TopicSuggestions:
    """Pick the best LinkedIn-worthy topics from analyzed trends."""
    trends_text = "\n\n".join(
        f"[{i+1}] Theme: {t.theme} | Relevance: {t.relevance_score}/10\n"
        f"Title: {t.title}\n"
        f"Summary: {t.summary}\n"
        f"Sources: {', '.join(t.sources) if t.sources else 'N/A'}"
        for i, t in enumerate(analyzed_trends.trends)
    )

    history_text = (
        "Recent topics to AVOID (already posted):\n"
        + "\n".join(f"- {t}" for t in recent_topics)
        if recent_topics
        else "No recent post history."
    )

    client = AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=model,
        max_tokens=2048,
        system=_build_system_prompt(num_topics),
        messages=[
            {
                "role": "user",
                "content": (
                    f"Here are today's analyzed AI trends:\n\n{trends_text}\n\n"
                    f"{history_text}\n\n"
                    f"Pick the {num_topics} best topics for a LinkedIn post."
                ),
            }
        ],
    )

    response_text = message.content[0].text.strip()
    # Strip markdown code fences if present
    response_text = re.sub(r"^```(?:json)?\s*\n?", "", response_text)
    response_text = re.sub(r"\n?```\s*$", "", response_text)
    try:
        topics_data = json.loads(response_text)
        topics = [TopicSuggestion(**t) for t in topics_data]
    except (json.JSONDecodeError, TypeError, KeyError):
        logger.exception("Failed to parse topic suggestions")
        topics = []

    logger.info("Suggested %d topics", len(topics))
    return TopicSuggestions(topics=topics)
