import logging
from datetime import time
from zoneinfo import ZoneInfo

from config.settings import Settings
from bot.telegram_bot import build_bot, daily_generate

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
# Reduce noise from HTTP libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


def main() -> None:
    """Entry point: initialize bot with daily scheduler and start polling."""
    settings = Settings()

    app = build_bot(settings)

    # Schedule daily generation using python-telegram-bot's built-in job queue
    # (powered by APScheduler under the hood)
    tz = ZoneInfo(settings.timezone)
    trigger_time = time(
        hour=settings.schedule_hour,
        minute=settings.schedule_minute,
        tzinfo=tz,
    )

    app.job_queue.run_daily(
        daily_generate,
        time=trigger_time,
        chat_id=int(settings.telegram_chat_id),
        name="daily_trend_analysis",
    )

    logger.info(
        "Bot started. Daily generation scheduled at %02d:%02d %s",
        settings.schedule_hour,
        settings.schedule_minute,
        settings.timezone,
    )

    # run_polling() handles the event loop, graceful shutdown, etc.
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
