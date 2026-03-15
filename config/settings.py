from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: str
    telegram_bot_token: str
    telegram_chat_id: str
    tavily_api_key: str
    google_api_key: str = ""

    # Writing provider ("gemini" or "claude")
    writing_provider: str = "gemini"

    # Schedule
    schedule_hour: int = 8
    schedule_minute: int = 0
    timezone: str = "America/New_York"

    # Models
    analysis_model: str = "claude-sonnet-4-5-20250929"
    writing_model: str = "claude-opus-4-6"

    # Paths (resolved relative to project root)
    project_root: Path = Path(__file__).resolve().parent.parent
    brand_voice_path: Path = Path(__file__).resolve().parent / "brand_voice.md"
    hooks_path: Path = Path(__file__).resolve().parent / "hooks.md"
    examples_path: Path = (
        Path(__file__).resolve().parent.parent / "data" / "example_posts" / "examples.md"
    )
    post_history_path: Path = (
        Path(__file__).resolve().parent.parent / "data" / "post_history.json"
    )

    # Limits
    max_history_days: int = 30
    hooks_analysis_threshold: int = 10
    num_topic_suggestions: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
