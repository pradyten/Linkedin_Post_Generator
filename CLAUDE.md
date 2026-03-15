# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the bot
python main.py

# Test full pipeline (sources → trends → topics → post with web research)
python test_pipeline.py

# Test individual sources only
python test_sources.py
```

No linter or formatter is configured. No build step required.

## Architecture

AI-powered LinkedIn post generator that fetches trending AI/tech news, analyzes trends, and generates posts via a Telegram bot interface.

### Pipeline Flow

```
Sources (parallel)          Agents (sequential)              Bot
┌─────────────────┐    ┌──────────────────────────┐    ┌─────────────┐
│ Tavily web+X    │    │ trend_analyzer (Sonnet)   │    │ /generate   │
│ HackerNews      │───>│ topic_suggester (Sonnet)  │───>│ User picks  │
│ RSS feeds (12)  │    │ post_writer (3-phase):    │    │ Save/Tweak  │
└─────────────────┘    │  _research (Gemini/Claude)│    │ /metrics    │
                       │  _draft (Gemini/Claude)   │    │ /analyze    │
                       │  _refine (Gemini/Claude)  │    └─────────────┘
                       └──────────────────────────┘
```

### Writing Provider (agents/post_writer.py)

The post writing pipeline supports two LLM providers, switchable via `WRITING_PROVIDER` env var:

- **Gemini** (default): `gemini-2.5-flash` for research/draft, `gemini-2.5-pro` for refine
- **Claude** (fallback): `claude-sonnet-4-5` for research/draft, `claude-opus-4-6` for refine

A `_generate()` helper routes calls to the appropriate provider. If `WRITING_PROVIDER=gemini` but `GOOGLE_API_KEY` is empty, it falls back to Claude with a log warning.

Gemini 2.5 Pro is a thinking model: its internal reasoning tokens count against `max_output_tokens`. The code compensates by using a higher token limit (8192) and capping thinking budget (1024) for Pro.

Trend analysis, topic suggestion, and hooks analysis always use Claude (Anthropic) regardless of writing provider.

### Post Writing Chain (agents/post_writer.py)

The core 3-phase chain in `write_post()` with a descending length funnel:
1. **_research** (2,500-4,000 chars): Tavily web search (2 queries) → structures research brief with data points, source URLs, narrative angles
2. **_draft** (1,400-2,000 chars): Writes full post using research + brand_voice.md + hooks.md + examples.md + source URLs
3. **_refine** (1,200-1,800 chars): Polishes for engagement, enforces character limit, ensures at least 1 natural inline source link

Source links use bare URL inline format: `according to TechCrunch (https://url)` — not the `📄 Source: URL` format.

`_research()` returns `tuple[str, list[dict]]` (brief + web sources). Falls back to synthetic research if `tavily_api_key` is None or search fails.

### Prompt Engineering

All prompts use structured XML tags for clarity:
- `<rules>`, `<process>`, `<output_format>` for research
- `<writing_process>`, `<source_link_format>`, `<style_rules>`, `<length_constraint>` for draft
- `<priority_1_length_constraint>`, `<editing_checklist>` for refine
- `<selection_criteria>`, `<thinking_process>` for topic suggestion
- `<analysis_process>`, `<engagement_formula>` for hooks analysis

Key constraints enforced in prompts:
- No em dashes (—) in final output
- At least 1 source link in final post, embedded naturally inline
- Draft targets 2 strong points with depth over breadth
- Refine treats length 1,200-1,800 as #1 priority

### Data Models

- **TrendItem** (sources/models.py): Raw item from any source (title, summary, url, source, timestamp)
- **AnalyzedTrend** (agents/trend_analyzer.py): Deduplicated theme with relevance_score 1-10
- **TopicSuggestion** (agents/topic_suggester.py): Final topic with title, hook, reasoning, source_material

### Configuration

Settings loaded from `.env` via Pydantic (config/settings.py). Required keys: `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TAVILY_API_KEY`.

Optional keys: `GOOGLE_API_KEY` (required if `WRITING_PROVIDER=gemini`), `WRITING_PROVIDER` (default: `gemini`).

Models: `analysis_model` (Sonnet) for trends/topics/hooks analysis, `writing_model` (Opus) for Claude refine fallback.

Content files that shape output: `config/brand_voice.md`, `config/hooks.md`, `data/example_posts/examples.md`.

### Bot (bot/telegram_bot.py)

Single-user bot authenticated by `TELEGRAM_CHAT_ID`. Commands: /generate, /history, /brandvoice, /metrics, /analyze. Inline buttons for topic selection and post actions (save/tweak/regenerate). Daily scheduled job via APScheduler.

Hooks analysis auto-triggers every `hooks_analysis_threshold` (default 10) metric entries, updating hooks.md with learned patterns.

### Key Patterns

- All I/O is async: `AsyncAnthropic`, `AsyncTavilyClient`, `google.genai.Client`, `httpx.AsyncClient`, `asyncio.to_thread()` for sync libs
- Sources fetched in parallel with `asyncio.gather(return_exceptions=True)` — partial failures are OK
- Engagement score formula: `comments*3 + reposts*2 + likes*1`
- Post history stored in `data/post_history.json`, recent topics checked to avoid repetition (30-day window)
- `drop_pending_updates=True` in `run_polling()` to handle stale Telegram connections
