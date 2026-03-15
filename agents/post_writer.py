import logging

from anthropic import AsyncAnthropic
from google import genai
from google.genai import types
from tavily import AsyncTavilyClient

from agents.topic_suggester import TopicSuggestion

logger = logging.getLogger(__name__)

GEMINI_MODELS = {"fast": "gemini-2.5-flash", "quality": "gemini-2.5-pro"}
CLAUDE_MODELS = {"fast": "claude-sonnet-4-5-20250929"}

RESEARCH_SYSTEM = """\
You are an AI research analyst preparing a structured brief for a LinkedIn content writer. \
Your brief will be the sole factual foundation for a post seen by thousands of AI professionals.

<rules>
- Use ONLY facts, statistics, and claims that appear in the provided web sources. Every \
data point must trace back to a provided source.
- Preserve exact URLs from the web sources. Do not modify, shorten, or fabricate any URL.
- If the web sources lack strong data on a point, state that explicitly rather than filling \
gaps with assumptions.
</rules>

<process>
1. Extract the strongest data points: numbers, percentages, benchmarks, timelines, quotes \
from the web sources.
2. Identify the 2-3 most credible and relevant source URLs that directly support key claims.
3. Develop 2-3 narrative angles that would resonate with an AI engineering audience on \
LinkedIn (why should they care?).
4. Suggest strategic keywords and 5-8 hashtags for the AI/tech LinkedIn audience.
5. Surface any contrarian, surprising, or counterintuitive angles from the data that could \
drive engagement.
</process>

<output_format>
Structure your brief with these sections:

### Key Data Points
- Bullet each statistic/fact with its source

### Credible Sources
Format each as: Source Title: URL

### Narrative Angles
- 2-3 angles explaining why a LinkedIn audience of AI engineers should care

### Strategic Keywords & Hashtags
- Keywords for discoverability + 5-8 hashtags

### Contrarian/Surprising Takes
- Non-obvious insights from the data that challenge conventional thinking
</output_format>

<length_constraint>
Your research brief MUST be 2,500-4,000 characters (roughly 400-650 words).
This is the raw material the draft will draw from: be comprehensive but structured.
Below 2,500 characters: the draft will lack substance and depth.
Above 4,000 characters: the brief becomes unfocused and produces bloated drafts.
Hit this range precisely. Count carefully before finishing.
</length_constraint>

Be specific and data-driven. Every claim must have a source. No filler, no speculation."""

DRAFT_SYSTEM = """\
You are a technical LinkedIn ghostwriter for an AI engineer with a growing following. You \
write posts that combine genuine technical depth with scroll-stopping hooks. Your posts \
consistently earn high engagement because they teach something real, take a clear position, \
and invite debate.

<inputs_you_will_receive>
1. Topic details: title, opening hook, source material
2. Research brief: verified statistics, source URLs, narrative angles
3. Brand voice guidelines: the poster's exact style and tone
4. Learned hooks/patterns: what has worked well in past posts
5. Example posts: gold-standard style reference
6. Available source URLs: real links to embed in the post
</inputs_you_will_receive>

<writing_process>
Step 1 - HOOK: Open with the provided hook or a stronger variation. The first 2 lines must \
create curiosity or tension that compels the reader to click "see more."
Step 2 - CONTEXT: Bridge from the hook to why this matters right now. Ground it in a \
specific event, release, or data point.
Step 3 - DEEP DIVE: Develop your strongest 2-3 points with real technical depth. Use the \
numbered format (1, 2, 3) with emoji section markers. Each point should teach something \
specific, not just state an opinion.
Step 4 - SYNTHESIS: Connect the points into a bigger picture. What does this mean for AI \
engineers? Make a bold prediction or pose a provocative question.
Step 5 - CTA: Close with an open question that invites discussion. Use "Let's discuss in \
the comments" or similar.
Step 6 - HASHTAGS: Add 5-8 relevant hashtags at the end.
</writing_process>

<source_link_format>
Embed at least 1 source link naturally inline within sentences:
- CORRECT: "according to TechCrunch (https://techcrunch.com/article)"
- CORRECT: "a recent study (https://arxiv.org/paper) found that..."
- WRONG: "Source: https://url" or any standalone link format
Weave links into the flow of your argument. They should feel like citations, not appendices.
</source_link_format>

<style_rules>
- Follow the brand voice guidelines precisely
- Apply the learned patterns from hooks.md
- Match the structure and formatting of the example posts
- Use bold text for emphasis, emoji section markers, numbered lists
- Short paragraphs with line breaks between every idea (mobile readability)
- Write with conviction. Take a position. Avoid hedging language like "it seems" or "perhaps"
- Write a rich, detailed draft. Focus on depth over breadth. Give the refiner strong \
material to work with.
</style_rules>

<length_constraint>
Your draft MUST be 1,400-2,000 characters (roughly 230-330 words).
This draft will be refined down to 1,200-1,800 characters in the next phase: the refiner \
cuts ~15%, not 40%.
Write tight from the start. Select only the strongest material from the research brief.
Below 1,400 characters: too thin for the refiner to work with.
Above 2,000 characters: forces the refiner into cuts it cannot realistically make.
Hit this range precisely. Count carefully before finishing.
</length_constraint>

Output ONLY the post text. No meta-commentary, no explanations, no labels like "Draft:" \
or "Here's the post:"."""

REFINE_SYSTEM = """\
You are a senior LinkedIn content editor. Your sole job: take a draft post and produce a \
final version that is tight, compelling, and optimized for the LinkedIn algorithm. You have \
edited hundreds of viral AI posts.

<priority_1_length_constraint>
ABSOLUTE REQUIREMENT: The final post must be 1,200-1,800 characters (including spaces).
- If the draft exceeds 1,800 characters: cut aggressively. Remove the weakest point entirely. \
Merge redundant ideas. Shorten every sentence. Keep only the strongest 2-3 points.
- If the draft is under 1,200 characters: expand the strongest point with more specific detail.
- Before outputting, verify your character count. A post over 1,800 characters is a failure.
</priority_1_length_constraint>

<priority_2_edit_instructions>
If edit instructions are provided below the draft, apply them before any other editing. \
They override all other guidance.
</priority_2_edit_instructions>

<editing_checklist>
Work through these in order:
1. HOOK: First 2 lines must stop the scroll. Tighten to the fewest words that create \
maximum curiosity or tension. This is what appears before "see more" on LinkedIn.
2. STRUCTURE: Short paragraphs. Line break between every idea. Proper emoji section markers. \
Mobile-first formatting.
3. SOURCE LINKS: The post must contain at least 1 source link embedded naturally inline \
(e.g., "according to Source Name (https://url)"). Remove any links that feel forced, but \
always preserve at least one. Never use standalone link formats.
4. FILLER: Cut every word that doesn't earn its place. Remove qualifiers ("very", "really", \
"quite"), throat-clearing phrases, and redundant transitions.
5. CLOSING: Strengthen the call-to-action. End with a specific open question that invites \
comments.
6. BRAND VOICE: Verify the post matches the provided brand voice guidelines. Bold, \
technical, analytical with conviction.
7. HASHTAGS: Keep 3-5 relevant hashtags. Remove generic ones.
8. KEYWORDS: Ensure strategic AI/tech keywords are present for LinkedIn search discoverability.
</editing_checklist>

FORMATTING: Never use em dashes (—). Use commas, periods, colons, or parentheses instead.

Output ONLY the final polished post. No commentary, no character count, no explanations."""


async def _generate(
    system: str,
    user_content: str,
    provider: str,
    google_api_key: str | None,
    anthropic_client: AsyncAnthropic | None,
    model_tier: str = "fast",
    writing_model: str | None = None,
    max_tokens: int = 4096,
) -> str:
    """Provider-agnostic text generation. Returns the generated text."""
    if provider == "gemini":
        model = GEMINI_MODELS.get(model_tier, GEMINI_MODELS["fast"])
        client = genai.Client(api_key=google_api_key)
        # Gemini 2.5 Pro is a thinking model: internal reasoning tokens count
        # against max_output_tokens. Use higher limit and cap thinking budget.
        gemini_config = types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=max_tokens if "pro" not in model else max(max_tokens, 8192),
            thinking_config=types.ThinkingConfig(thinking_budget=1024) if "pro" in model else None,
        )
        response = await client.aio.models.generate_content(
            model=model,
            contents=user_content,
            config=gemini_config,
        )
        if response.text is None:
            raise RuntimeError(f"Gemini ({model}) returned empty response — possibly blocked by safety filters or quota exceeded")
        return response.text.strip()
    else:
        # Claude
        if model_tier == "quality" and writing_model:
            model = writing_model
        else:
            model = CLAUDE_MODELS.get(model_tier, CLAUDE_MODELS["fast"])
        message = await anthropic_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_content}],
        )
        return message.content[0].text.strip()


async def _tavily_search(
    topic_title: str,
    tavily_api_key: str,
) -> list[dict]:
    """Search Tavily for real-time web results about the topic."""
    client = AsyncTavilyClient(api_key=tavily_api_key)
    all_results: list[dict] = []
    seen_urls: set[str] = set()

    queries = [
        topic_title,
        f"{topic_title} latest news analysis",
    ]

    for query in queries:
        try:
            response = await client.search(
                query=query,
                max_results=5,
                search_depth="advanced",
                topic="news",
                time_range="day",
                include_answer=False,
            )
            for result in response.get("results", []):
                url = result.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append({
                        "title": result.get("title", ""),
                        "url": url,
                        "snippet": result.get("content", "")[:500],
                    })
        except Exception:
            logger.exception("Tavily search failed for query: %s", query)

    # Cap at 8 results
    return all_results[:8]


async def _research(
    topic: TopicSuggestion,
    provider: str,
    google_api_key: str | None,
    anthropic_client: AsyncAnthropic | None,
    tavily_api_key: str | None = None,
) -> tuple[str, list[dict]]:
    """Part 1: Research the topic using real web search results."""
    web_sources: list[dict] = []

    # Try Tavily web search first
    if tavily_api_key:
        try:
            web_sources = await _tavily_search(topic.title, tavily_api_key)
            logger.info("Tavily returned %d web sources for '%s'",
                        len(web_sources), topic.title)
        except Exception:
            logger.exception("Tavily search failed entirely, falling back to synthetic research")

    # Build user prompt with web results or fallback
    if web_sources:
        web_results_text = "\n\n".join(
            f"{i+1}. **{src['title']}**\n"
            f"   URL: {src['url']}\n"
            f"   Content: {src['snippet']}"
            for i, src in enumerate(web_sources)
        )
        user_content = f"""Research this topic for a LinkedIn post using the web sources below:

Title: {topic.title}
Opening Hook: {topic.hook}
Source Material: {topic.source_material}

## Web Research Results
{web_results_text}

Using ONLY the information from these web sources, provide a structured research brief \
with statistics, credible sources (preserve exact URLs), narrative angles, and strategic hashtags."""
    else:
        user_content = f"""Research this topic for a LinkedIn post:

Title: {topic.title}
Opening Hook: {topic.hook}
Source Material: {topic.source_material}

Provide a structured research brief with statistics, credible sources, \
narrative angles, and strategic hashtags."""

    research = await _generate(
        system=RESEARCH_SYSTEM,
        user_content=user_content,
        provider=provider,
        google_api_key=google_api_key,
        anthropic_client=anthropic_client,
        model_tier="fast",
        max_tokens=2048,
    )
    logger.info("Research phase complete (%d chars, %d web sources)",
                len(research), len(web_sources))
    return research, web_sources


async def _draft(
    topic: TopicSuggestion,
    research: str,
    web_sources: list[dict],
    brand_voice: str,
    hooks: str,
    examples: str,
    recent_posts: list[str],
    provider: str,
    google_api_key: str | None,
    anthropic_client: AsyncAnthropic | None,
) -> str:
    """Part 2: Write a full post draft using research and reference materials."""
    user_content = f"""## Selected Topic
Title: {topic.title}
Opening Hook: {topic.hook}
Source Material: {topic.source_material}

## Research Brief
{research}

## Brand Voice Guidelines
{brand_voice}

## Learned Hooks & Patterns (what works for this audience)
{hooks}

## Example Posts (match this style)
{examples}
"""

    # Add source URLs only as optional reference
    if web_sources:
        user_content += "\n## Available Source URLs (include at least 1 naturally in the post)\n"
        for src in web_sources[:5]:
            user_content += f"- {src['title']}: {src['url']}\n"

    if recent_posts:
        user_content += "\n## Recent Posts (avoid repetition, maintain continuity)\n"
        for i, post in enumerate(recent_posts[-3:], 1):
            user_content += f"\n--- Recent Post {i} ---\n{post[:300]}...\n"

    draft = await _generate(
        system=DRAFT_SYSTEM,
        user_content=user_content,
        provider=provider,
        google_api_key=google_api_key,
        anthropic_client=anthropic_client,
        model_tier="fast",
        max_tokens=1500,
    )
    logger.info("Draft phase complete (%d chars)", len(draft))
    return draft


async def _refine(
    draft: str,
    brand_voice: str,
    hooks: str,
    provider: str,
    google_api_key: str | None,
    anthropic_client: AsyncAnthropic | None,
    writing_model: str | None = None,
    tweak_instructions: str | None = None,
) -> str:
    """Part 3: Polish the draft for maximum LinkedIn engagement."""
    user_content = f"""## Draft Post
{draft}

## Brand Voice Guidelines
{brand_voice}

## Learned Hooks & Patterns
{hooks}
"""

    if tweak_instructions:
        user_content += f"\n## Edit Instructions (apply as top priority)\n{tweak_instructions}\n"

    refined = await _generate(
        system=REFINE_SYSTEM,
        user_content=user_content,
        provider=provider,
        google_api_key=google_api_key,
        anthropic_client=anthropic_client,
        model_tier="quality",
        writing_model=writing_model,
        max_tokens=1500,
    )
    logger.info("Refine phase complete (%d chars)", len(refined))
    return refined


async def write_post(
    topic: TopicSuggestion,
    brand_voice: str,
    hooks: str,
    examples: str,
    recent_posts: list[str],
    api_key: str,
    model: str,
    tweak_instructions: str | None = None,
    tavily_api_key: str | None = None,
    writing_provider: str = "gemini",
    google_api_key: str | None = None,
) -> str:
    """Write a LinkedIn post using a 3-part chain: Research -> Draft -> Refine."""
    provider = writing_provider

    # Fall back to Claude if Gemini requested but no API key
    if provider == "gemini" and not google_api_key:
        logger.warning("writing_provider is 'gemini' but GOOGLE_API_KEY is empty — falling back to Claude")
        provider = "claude"

    anthropic_client = AsyncAnthropic(api_key=api_key) if provider == "claude" else None

    logger.info("Writing post with provider=%s", provider)

    # Part 1: Research (fast model — gathers material with web search)
    research, web_sources = await _research(
        topic, provider, google_api_key, anthropic_client, tavily_api_key,
    )

    # Part 2: Draft (fast model — writes full post)
    draft = await _draft(
        topic, research, web_sources, brand_voice, hooks,
        examples, recent_posts, provider, google_api_key, anthropic_client,
    )

    # Part 3: Refine (quality model — polishes final output)
    post_text = await _refine(
        draft, brand_voice, hooks, provider, google_api_key,
        anthropic_client, writing_model=model, tweak_instructions=tweak_instructions,
    )

    logger.info("Generated post via 3-part chain (%d chars, provider=%s)", len(post_text), provider)
    return post_text


async def analyze_hooks(
    posts_with_metrics: list[dict],
    api_key: str,
    model: str,
) -> str:
    """Analyze post performance and generate updated hooks.md content."""
    system = """\
You are a LinkedIn content performance analyst specializing in AI/tech accounts. You use \
data to identify what drives engagement and translate those patterns into actionable \
writing guidelines.

<engagement_formula>
Engagement Score = (comments x 3) + (reposts x 2) + (likes x 1)
Comments are weighted highest because they signal deep engagement and boost LinkedIn's \
distribution algorithm.
</engagement_formula>

<analysis_process>
Step 1 - SEGMENT: Divide posts into quartiles by engagement score. Identify the top 25% \
(winners) and bottom 25% (underperformers).
Step 2 - COMPARE: For each dimension below, identify concrete differences between winners \
and underperformers:
  a. Opening hook style (what words, structures, or patterns appear in high-performers?)
  b. Post structure and formatting (length, use of lists, emoji density, paragraph length)
  c. Topic categories (which subject areas consistently perform?)
  d. Source usage (do posts with data/links perform better?)
  e. CTA style (which closing approaches drive more comments?)
Step 3 - EXTRACT PATTERNS: Distill findings into specific, actionable guidelines a writer \
can follow.
Step 4 - CITE EVIDENCE: Support every pattern with a concrete example (quote the actual \
hook or structural element from the data).
</analysis_process>

<output_format>
Output an updated hooks.md file in markdown with exactly these sections:

# Hooks & Patterns That Work

## Opening Hook Styles (ranked by effectiveness)
[Rank the hook patterns that correlate with highest engagement. Include a real example \
from the data for each pattern.]

## Post Structures That Perform
[Describe the structural patterns (formatting, length, flow) that winners share. Be \
specific about what to replicate.]

## Topics That Resonate
[List topic categories ranked by average engagement. Note any surprising performers \
or underperformers.]

## What Doesn't Work
[Specific patterns from bottom-quartile posts. What to actively avoid.]

## Recent Learnings
[New insights from this batch of data. Trends, shifts, or surprises compared to \
previous patterns.]
</output_format>

Be specific and data-driven. Every recommendation must reference actual post performance \
from the provided data. No generic advice."""

    posts_text = "\n\n".join(
        f"--- Post {i+1} ---\n"
        f"Topic: {p.get('topic', 'N/A')}\n"
        f"Engagement Score: {p.get('engagement_score', 0)}\n"
        f"Metrics: {p.get('metrics', {})}\n"
        f"Post:\n{p.get('full_post', 'N/A')[:500]}"
        for i, p in enumerate(posts_with_metrics)
    )

    client = AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=model,
        max_tokens=4096,
        system=system,
        messages=[
            {
                "role": "user",
                "content": f"Analyze these {len(posts_with_metrics)} posts:\n\n{posts_text}",
            }
        ],
    )

    return message.content[0].text.strip()
