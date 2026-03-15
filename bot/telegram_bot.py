import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from agents.post_writer import analyze_hooks, write_post
from agents.topic_suggester import TopicSuggestion, suggest_topics
from agents.trend_analyzer import analyze_trends
from config.settings import Settings
from sources.hackernews import fetch_hackernews_trends
from sources.rss_feeds import fetch_rss_trends
from sources.tavily_source import fetch_tavily_trends

logger = logging.getLogger(__name__)


def _load_file(path) -> str:
    """Load a text file, returning empty string if not found."""
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def _load_history(path) -> list[dict]:
    """Load post history from JSON file."""
    try:
        data = path.read_text(encoding="utf-8")
        return json.loads(data) if data.strip() else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _save_history(path, history: list[dict]) -> None:
    """Save post history to JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(history, indent=2, default=str), encoding="utf-8")


def _get_recent_topics(history: list[dict], days: int = 30) -> list[str]:
    """Get topic titles from the last N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    topics = []
    for entry in history:
        try:
            entry_date = datetime.fromisoformat(entry["date"])
            if entry_date.tzinfo is None:
                entry_date = entry_date.replace(tzinfo=timezone.utc)
            if entry_date >= cutoff:
                topics.append(entry.get("topic", ""))
        except (KeyError, ValueError):
            pass
    return topics


def _compute_engagement_score(metrics: dict) -> int:
    """Compute weighted engagement score: comments*3 + reposts*2 + likes*1."""
    return (
        metrics.get("comments", 0) * 3
        + metrics.get("reposts", 0) * 2
        + metrics.get("likes", 0)
    )


def _check_authorized(update: Update, settings: Settings) -> bool:
    """Check if the message is from the authorized chat."""
    chat_id = str(update.effective_chat.id)
    return chat_id == settings.telegram_chat_id


# ─── Command Handlers ───────────────────────────────────────────────


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command."""
    settings: Settings = context.bot_data["settings"]
    if not _check_authorized(update, settings):
        return

    await update.message.reply_text(
        "🚀 <b>LinkedIn Post Generator Bot</b>\n\n"
        "I analyze AI trends daily and help you write LinkedIn posts.\n\n"
        "<b>Commands:</b>\n"
        "/generate — Analyze trends &amp; suggest topics now\n"
        "/history — Show recent post topics\n"
        "/brandvoice — Show current brand voice\n"
        "/metrics — Log post performance (likes comments reposts)\n"
        "/analyze — Force hooks analysis from collected metrics\n\n"
        f"⏰ Auto-generates daily at {settings.schedule_hour}:{settings.schedule_minute:02d} "
        f"({settings.timezone})",
        parse_mode="HTML",
    )


async def generate_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle /generate command — run the full pipeline."""
    settings: Settings = context.bot_data["settings"]
    if not _check_authorized(update, settings):
        return

    await _run_generate_pipeline(update.effective_chat.id, context)


async def history_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle /history command — show recent posts."""
    settings: Settings = context.bot_data["settings"]
    if not _check_authorized(update, settings):
        return

    history = _load_history(settings.post_history_path)

    if not history:
        await update.message.reply_text("No post history yet. Use /generate to start!")
        return

    lines = []
    for entry in history[-10:]:
        date = entry.get("date", "?")
        topic = entry.get("topic", "Unknown")
        metrics = entry.get("metrics")
        score = entry.get("engagement_score", "—")
        if metrics:
            lines.append(
                f"📅 {date} — {topic}\n"
                f"   👍 {metrics.get('likes', 0)} | 💬 {metrics.get('comments', 0)} | "
                f"🔄 {metrics.get('reposts', 0)} | Score: {score}"
            )
        else:
            lines.append(f"📅 {date} — {topic}")

    await update.message.reply_text(
        "<b>Recent Posts:</b>\n\n" + "\n\n".join(lines),
        parse_mode="HTML",
    )


async def brandvoice_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle /brandvoice command — show current brand voice."""
    settings: Settings = context.bot_data["settings"]
    if not _check_authorized(update, settings):
        return

    voice = _load_file(settings.brand_voice_path)
    if voice:
        # Truncate if too long for Telegram
        if len(voice) > 4000:
            voice = voice[:4000] + "\n\n... (truncated)"
        await update.message.reply_text(voice)
    else:
        await update.message.reply_text("Brand voice file not found.")


async def metrics_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle /metrics command — log engagement for the last post."""
    settings: Settings = context.bot_data["settings"]
    if not _check_authorized(update, settings):
        return

    text = update.message.text.strip()
    # Parse: /metrics 45 12 3  OR  /metrics likes:45 comments:12 reposts:3
    parts = text.split()[1:]  # remove /metrics

    likes = comments = reposts = 0

    if any(":" in p for p in parts):
        # Key:value format
        for part in parts:
            if ":" in part:
                key, val = part.split(":", 1)
                key = key.strip().lower()
                try:
                    val_int = int(val.strip())
                except ValueError:
                    continue
                if key == "likes":
                    likes = val_int
                elif key == "comments":
                    comments = val_int
                elif key == "reposts":
                    reposts = val_int
    elif len(parts) >= 3:
        # Positional: likes comments reposts
        try:
            likes = int(parts[0])
            comments = int(parts[1])
            reposts = int(parts[2])
        except (ValueError, IndexError):
            await update.message.reply_text(
                "Usage: /metrics <likes> <comments> <reposts>\n"
                "Example: /metrics 45 12 3"
            )
            return
    else:
        await update.message.reply_text(
            "Usage: /metrics <likes> <comments> <reposts>\n"
            "Example: /metrics 45 12 3\n"
            "Or: /metrics likes:45 comments:12 reposts:3"
        )
        return

    metrics = {"likes": likes, "comments": comments, "reposts": reposts}
    score = _compute_engagement_score(metrics)

    history = _load_history(settings.post_history_path)
    if not history:
        await update.message.reply_text(
            "No posts in history to attach metrics to. Generate a post first!"
        )
        return

    # Update the most recent post that doesn't have metrics yet
    updated = False
    for entry in reversed(history):
        if not entry.get("metrics"):
            entry["metrics"] = metrics
            entry["engagement_score"] = score
            entry["metrics_recorded_at"] = datetime.now(timezone.utc).isoformat()
            updated = True
            break

    if not updated:
        # All posts have metrics — update the most recent one
        history[-1]["metrics"] = metrics
        history[-1]["engagement_score"] = score
        history[-1]["metrics_recorded_at"] = datetime.now(timezone.utc).isoformat()

    _save_history(settings.post_history_path, history)

    # Check if we should auto-analyze
    rated_posts = [e for e in history if e.get("metrics")]
    auto_msg = ""
    if len(rated_posts) % settings.hooks_analysis_threshold == 0 and len(rated_posts) > 0:
        auto_msg = "\n\n🔄 Threshold reached! Running automatic hooks analysis..."

    await update.message.reply_text(
        f"✅ Got it! {likes} likes, {comments} comments, {reposts} reposts.\n"
        f"Engagement score: {score}"
        f"{auto_msg}"
    )

    # Auto-analyze if threshold hit
    if auto_msg:
        await _run_hooks_analysis(update.effective_chat.id, context)


async def analyze_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Handle /analyze command — force hooks analysis."""
    settings: Settings = context.bot_data["settings"]
    if not _check_authorized(update, settings):
        return

    await _run_hooks_analysis(update.effective_chat.id, context)


# ─── Core Pipeline ───────────────────────────────────────────────────


async def _run_generate_pipeline(chat_id: int | str, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Full pipeline: fetch sources → analyze → suggest → send buttons."""
    settings: Settings = context.bot_data["settings"]

    status_msg = await context.bot.send_message(
        chat_id=chat_id, text="🔍 Analyzing AI trends..."
    )

    try:
        # Fetch all sources in parallel
        results = await asyncio.gather(
            fetch_tavily_trends(settings.tavily_api_key),
            fetch_hackernews_trends(),
            fetch_rss_trends(),
            return_exceptions=True,
        )

        all_items = []
        source_errors = []
        for i, result in enumerate(results):
            source_name = ["Tavily", "HackerNews", "RSS"][i]
            if isinstance(result, Exception):
                logger.error("Source %s failed: %s", source_name, result)
                source_errors.append(source_name)
            else:
                all_items.extend(result)

        if not all_items:
            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=status_msg.message_id,
                text="❌ All sources failed. Please try again later.\n"
                f"Failed sources: {', '.join(source_errors)}",
            )
            return

        await context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=status_msg.message_id,
            text=f"📊 Found {len(all_items)} items. Analyzing trends..."
            + (f"\n⚠️ Some sources failed: {', '.join(source_errors)}" if source_errors else ""),
        )

        # Analyze trends
        analyzed = await analyze_trends(
            all_items, settings.anthropic_api_key, settings.analysis_model
        )

        if not analyzed.trends:
            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=status_msg.message_id,
                text="❌ Trend analysis returned no results. Try again later.",
            )
            return

        # Suggest topics
        history = _load_history(settings.post_history_path)
        recent_topics = _get_recent_topics(history, settings.max_history_days)

        suggestions = await suggest_topics(
            analyzed, recent_topics, settings.anthropic_api_key, settings.analysis_model,
            num_topics=settings.num_topic_suggestions,
        )

        if not suggestions.topics:
            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=status_msg.message_id,
                text="❌ Could not generate topic suggestions. Try again later.",
            )
            return

        # Store suggestions in bot_data for callback handling
        context.bot_data["current_suggestions"] = suggestions.topics

        # Build message with inline keyboard
        lines = ["🎯 <b>Today's trending AI topics:</b>\n"]
        for i, topic in enumerate(suggestions.topics, 1):
            lines.append(f"{i}. <b>{topic.title}</b>\n   <i>{topic.hook}</i>\n")

        keyboard = []
        row = []
        for i in range(len(suggestions.topics)):
            row.append(
                InlineKeyboardButton(f"📝 Topic {i+1}", callback_data=f"topic_select_{i}")
            )
        keyboard.append(row)
        keyboard.append(
            [InlineKeyboardButton("🔄 Refresh", callback_data="refresh_topics")]
        )

        await context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=status_msg.message_id,
            text="\n".join(lines),
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="HTML",
        )

    except Exception:
        logger.exception("Generate pipeline failed")
        try:
            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=status_msg.message_id,
                text="❌ An error occurred during generation. Check logs for details.",
            )
        except Exception:
            pass


async def _generate_post(
    chat_id: int | str,
    topic: TopicSuggestion,
    context: ContextTypes.DEFAULT_TYPE,
    tweak_instructions: str | None = None,
) -> None:
    """Generate a post for the selected topic and send it."""
    settings: Settings = context.bot_data["settings"]

    status_msg = await context.bot.send_message(
        chat_id=chat_id, text="✍️ Writing your LinkedIn post..."
    )

    try:
        brand_voice = _load_file(settings.brand_voice_path)
        hooks = _load_file(settings.hooks_path)
        examples = _load_file(settings.examples_path)
        history = _load_history(settings.post_history_path)
        recent_posts = [e.get("full_post", "") for e in history[-3:] if e.get("full_post")]

        post_text = await write_post(
            topic=topic,
            brand_voice=brand_voice,
            hooks=hooks,
            examples=examples,
            recent_posts=recent_posts,
            api_key=settings.anthropic_api_key,
            model=settings.writing_model,
            tweak_instructions=tweak_instructions,
            tavily_api_key=settings.tavily_api_key,
            writing_provider=settings.writing_provider,
            google_api_key=settings.google_api_key,
        )

        # Store current post for save/tweak/regenerate
        context.bot_data["current_post"] = post_text
        context.bot_data["current_topic"] = topic

        # Send the post
        await context.bot.delete_message(chat_id=chat_id, message_id=status_msg.message_id)

        # Split if too long for Telegram (4096 char limit)
        if len(post_text) > 4000:
            await context.bot.send_message(chat_id=chat_id, text=post_text[:4000])
            await context.bot.send_message(chat_id=chat_id, text=post_text[4000:])
        else:
            await context.bot.send_message(chat_id=chat_id, text=post_text)

        # Action buttons
        keyboard = [
            [
                InlineKeyboardButton("✅ Save", callback_data="save_post"),
                InlineKeyboardButton("✏️ Tweak", callback_data="tweak_post"),
                InlineKeyboardButton("🔄 Regenerate", callback_data="regenerate_post"),
            ]
        ]
        await context.bot.send_message(
            chat_id=chat_id,
            text="What would you like to do?",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )

    except Exception:
        logger.exception("Post generation failed")
        try:
            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=status_msg.message_id,
                text="❌ Post generation failed. Check logs for details.",
            )
        except Exception:
            pass


async def _run_hooks_analysis(chat_id: int | str, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Analyze post metrics and update hooks.md."""
    settings: Settings = context.bot_data["settings"]

    history = _load_history(settings.post_history_path)
    rated_posts = [e for e in history if e.get("metrics")]

    if len(rated_posts) < 3:
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"Need at least 3 rated posts for analysis (have {len(rated_posts)}). "
            "Use /metrics after posting to log engagement.",
        )
        return

    status_msg = await context.bot.send_message(
        chat_id=chat_id, text="📊 Analyzing post performance patterns..."
    )

    try:
        updated_hooks = await analyze_hooks(
            rated_posts, settings.anthropic_api_key, settings.analysis_model
        )

        # Write updated hooks.md
        settings.hooks_path.write_text(updated_hooks, encoding="utf-8")

        await context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=status_msg.message_id,
            text=f"✅ hooks.md updated! Analyzed {len(rated_posts)} rated posts.\n\n"
            "Your future posts will incorporate these learned patterns.",
        )
    except Exception:
        logger.exception("Hooks analysis failed")
        await context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=status_msg.message_id,
            text="❌ Hooks analysis failed. Check logs for details.",
        )


# ─── Callback Handlers ──────────────────────────────────────────────


async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle all inline button callbacks."""
    query = update.callback_query
    await query.answer()

    settings: Settings = context.bot_data["settings"]
    if not _check_authorized(update, settings):
        return

    data = query.data
    chat_id = update.effective_chat.id

    if data.startswith("topic_select_"):
        # User picked a topic
        idx = int(data.split("_")[-1])
        suggestions = context.bot_data.get("current_suggestions", [])
        if idx < len(suggestions):
            topic = suggestions[idx]
            await query.edit_message_text(f"📝 Selected: <b>{topic.title}</b>", parse_mode="HTML")
            await _generate_post(chat_id, topic, context)
        else:
            await query.edit_message_text("❌ Invalid topic selection.")

    elif data == "refresh_topics":
        await query.edit_message_text("🔄 Refreshing topics...")
        await _run_generate_pipeline(chat_id, context)

    elif data == "save_post":
        post_text = context.bot_data.get("current_post", "")
        topic = context.bot_data.get("current_topic")

        if post_text and topic:
            history = _load_history(settings.post_history_path)
            history.append(
                {
                    "date": datetime.now(timezone.utc).isoformat(),
                    "topic": topic.title,
                    "hook": topic.hook,
                    "full_post": post_text,
                    "sources_used": [],
                    "metrics": None,
                    "engagement_score": None,
                }
            )
            _save_history(settings.post_history_path, history)
            await query.edit_message_text(
                "✅ Post saved to history! Copy the text above to LinkedIn.\n\n"
                "After posting, use /metrics <likes> <comments> <reposts> to log performance."
            )
        else:
            await query.edit_message_text("❌ No post to save.")

    elif data == "tweak_post":
        context.bot_data["awaiting_tweak"] = True
        await query.edit_message_text(
            "✏️ Send me your edit instructions.\n"
            "Example: 'Make it shorter' or 'Add more technical detail' or 'Change the hook'"
        )

    elif data == "regenerate_post":
        topic = context.bot_data.get("current_topic")
        if topic:
            await query.edit_message_text("🔄 Regenerating with a different angle...")
            await _generate_post(chat_id, topic, context)
        else:
            await query.edit_message_text("❌ No topic selected for regeneration.")


async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle plain text messages (for tweak instructions)."""
    settings: Settings = context.bot_data["settings"]
    if not _check_authorized(update, settings):
        return

    if context.bot_data.get("awaiting_tweak"):
        context.bot_data["awaiting_tweak"] = False
        topic = context.bot_data.get("current_topic")
        if topic:
            tweak_text = update.message.text
            await _generate_post(
                update.effective_chat.id, topic, context, tweak_instructions=tweak_text
            )
        else:
            await update.message.reply_text("❌ No topic to tweak. Use /generate first.")


# ─── Scheduled Job ───────────────────────────────────────────────────


async def daily_generate(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Scheduled daily generation job (called by APScheduler or job_queue)."""
    settings: Settings = context.bot_data["settings"]
    chat_id = settings.telegram_chat_id
    await _run_generate_pipeline(int(chat_id), context)


# ─── Bot Builder ─────────────────────────────────────────────────────


def build_bot(settings: Settings) -> Application:
    """Build and configure the Telegram bot application."""
    app = Application.builder().token(settings.telegram_bot_token).build()

    # Store settings in bot_data for access in handlers
    app.bot_data["settings"] = settings
    app.bot_data["current_suggestions"] = []
    app.bot_data["current_post"] = ""
    app.bot_data["current_topic"] = None
    app.bot_data["awaiting_tweak"] = False

    # Register command handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("generate", generate_command))
    app.add_handler(CommandHandler("history", history_command))
    app.add_handler(CommandHandler("brandvoice", brandvoice_command))
    app.add_handler(CommandHandler("metrics", metrics_command))
    app.add_handler(CommandHandler("analyze", analyze_command))

    # Register callback handler for inline buttons
    app.add_handler(CallbackQueryHandler(callback_handler))

    # Register text handler for tweak instructions (lowest priority)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))

    return app
