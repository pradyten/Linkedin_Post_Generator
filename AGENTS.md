# Repository Guidelines

## Project Structure & Module Organization
`main.py` is the runtime entry point and starts the Telegram bot plus the daily scheduler. Core logic is split by responsibility: `agents/` contains the LLM pipeline (`trend_analyzer.py`, `topic_suggester.py`, `post_writer.py`), `sources/` fetches trend data, `bot/` handles Telegram commands and interactions, and `config/` stores settings plus prompt-shaping content such as `brand_voice.md` and `hooks.md`. Runtime data and examples live under `data/`, especially `data/example_posts/examples.md` and `data/post_history.json`.

## Build, Test, and Development Commands
Use Python 3.11+.

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
python test_sources.py
python test_pipeline.py
```

`python main.py` runs the bot locally. `python test_sources.py` checks Tavily, Hacker News, and RSS fetchers independently. `python test_pipeline.py` exercises the end-to-end flow from source ingestion to post generation; it requires valid API keys in `.env`.

## Coding Style & Naming Conventions
Follow the existing Python style: 4-space indentation, type hints on public functions, `snake_case` for modules/functions/variables, and `PascalCase` for Pydantic models. Keep new code async-first where it touches I/O, matching the current use of `AsyncAnthropic`, `AsyncTavilyClient`, and `asyncio.gather()`. Prefer `logging` over `print` outside the standalone test scripts. No formatter or linter is configured, so keep imports tidy and functions small enough to scan easily.

## Testing Guidelines
This repository currently uses executable test scripts rather than `pytest` suites. Name new checks `test_*.py` at the repository root unless a fuller test package is introduced. Cover both happy-path behavior and partial-failure handling, because source fetches intentionally tolerate individual provider errors. Before opening a PR, run `python test_sources.py`; run `python test_pipeline.py` whenever you change prompt flow, model selection, or post-writing behavior.

## Commit & Pull Request Guidelines
Git history currently contains a single concise imperative commit (`Initial commit`). Continue with short, imperative subjects such as `Add Gemini fallback logging` or `Handle empty RSS timestamps`. PRs should explain the user-visible impact, note any required `.env` changes, and include screenshots or sample bot output when modifying Telegram interactions or generated post format.

## Configuration & Security Tips
Copy `.env.example` to `.env` and keep secrets out of commits. Required keys include `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `TAVILY_API_KEY`; `GOOGLE_API_KEY` is required when `WRITING_PROVIDER=gemini`.
