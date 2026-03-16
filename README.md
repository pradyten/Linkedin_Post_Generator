# LinkedIn Post Generator

AI-powered LinkedIn post generator that fetches trending AI/tech news, analyzes trends, and generates ready-to-post content via a Telegram bot interface.

## How It Works

```
Sources (parallel)          Agents (sequential)              Bot
┌─────────────────┐    ┌──────────────────────────┐    ┌─────────────┐
│ Tavily web + X  │    │ trend_analyzer (Sonnet)   │    │ /generate   │
│ HackerNews      │───>│ topic_suggester (Sonnet)  │───>│ User picks  │
│ RSS feeds (12)  │    │ post_writer (3-phase):    │    │ Save/Tweak  │
└─────────────────┘    │  research (Gemini/Claude) │    │ /metrics    │
                       │  draft (Gemini/Claude)    │    │ /analyze    │
                       │  refine (Gemini/Claude)   │    └─────────────┘
                       └──────────────────────────┘
```

1. **Fetch** — Pulls trending AI news from Tavily, HackerNews, and 12 RSS feeds in parallel
2. **Analyze** — Claude Sonnet deduplicates and scores trends by relevance
3. **Suggest** — Picks the top topics (configurable, default 5) with hooks and angles
4. **Write** — 3-phase chain (research → draft → refine) using Gemini or Claude, with live web research via Tavily
5. **Deliver** — Telegram bot presents topics as buttons; user picks one, then can save, tweak, or regenerate

## Setup

```bash
# Clone and install
git clone https://github.com/pradyten/Linkedin_Post_Generator.git
cd Linkedin_Post_Generator
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your API keys
```

### Required API Keys

| Key | Where to get it |
|-----|-----------------|
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) |
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) on Telegram |
| `TELEGRAM_CHAT_ID` | Send a message to your bot, then check `https://api.telegram.org/bot<TOKEN>/getUpdates` |
| `TAVILY_API_KEY` | [Tavily](https://tavily.com/) |
| `GOOGLE_API_KEY` (optional) | [Google AI Studio](https://aistudio.google.com/apikey) — required if `WRITING_PROVIDER=gemini` |

## Usage

```bash
# Run the bot
python main.py
```

### Telegram Commands

| Command | Description |
|---------|-------------|
| `/generate` | Analyze trends and suggest topics now |
| `/history` | Show recent post topics and metrics |
| `/brandvoice` | Show current brand voice configuration |
| `/metrics <likes> <comments> <reposts>` | Log post performance |
| `/analyze` | Force hooks analysis from collected metrics |

The bot also auto-generates daily at the configured time (default: 8:00 AM).

## Configuration

All settings are in `.env`. See `.env.example` for the full list.

| Setting | Default | Description |
|---------|---------|-------------|
| `WRITING_PROVIDER` | `gemini` | LLM for post writing (`gemini` or `claude`) |
| `NUM_TOPIC_SUGGESTIONS` | `5` | Number of topic choices presented |
| `SCHEDULE_HOUR` | `8` | Daily auto-generation hour |
| `SCHEDULE_MINUTE` | `0` | Daily auto-generation minute |
| `TIMEZONE` | `America/New_York` | Timezone for scheduling |

## Testing

```bash
# Test individual sources (Tavily, HackerNews, RSS)
python test_sources.py

# Test full pipeline (sources → trends → topics → post)
python test_pipeline.py
```

## Deployment

The bot can run 24/7 on a GCP Compute Engine e2-micro instance (free tier). See [deploy/DEPLOY.md](deploy/DEPLOY.md) for the full guide.

**Auto-deploy:** Every push to `main` automatically deploys via GitHub Actions. One-time setup required — see the [CI/CD section](deploy/DEPLOY.md#automated-deployment-with-github-actions) in DEPLOY.md.

Quick start:

```bash
# Automated (requires gcloud CLI)
bash deploy/deploy.sh

# Or use Docker
docker build -t linkedin-bot .
docker run -d --restart=always --env-file .env linkedin-bot
```

## Project Structure

```
├── main.py                  # Entry point — starts bot + daily scheduler
├── agents/
│   ├── trend_analyzer.py    # Deduplicates & scores trends (Claude Sonnet)
│   ├── topic_suggester.py   # Picks top N topics with hooks (Claude Sonnet)
│   └── post_writer.py       # 3-phase writing chain (Gemini/Claude)
├── sources/
│   ├── tavily_source.py     # Tavily web + X search
│   ├── hackernews.py        # HackerNews top stories
│   ├── rss_feeds.py         # 12 AI/tech RSS feeds
│   └── models.py            # TrendItem data model
├── bot/
│   └── telegram_bot.py      # Telegram commands, callbacks, scheduling
├── config/
│   ├── settings.py          # Pydantic settings from .env
│   ├── brand_voice.md       # Writing style guide
│   └── hooks.md             # Learned hook patterns (auto-updated)
├── data/
│   └── example_posts/
│       └── examples.md      # Reference posts for style matching
├── deploy/
│   ├── DEPLOY.md            # GCP deployment guide
│   ├── deploy.sh            # Automated VM creation
│   ├── setup.sh             # VM setup script
│   └── linkedin-bot.service # systemd service unit
├── .github/
│   └── workflows/
│       └── deploy.yml       # Auto-deploy on push to main
├── Dockerfile               # Container build
├── requirements.txt
└── .env.example
```
