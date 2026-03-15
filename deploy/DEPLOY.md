# Deploying to GCP Compute Engine (e2-micro)

Run the LinkedIn Post Generator bot 24/7 on GCP's free-tier e2-micro instance (1 shared vCPU, 1 GB RAM).

## Prerequisites

- A GCP account with billing enabled (e2-micro is [free-tier eligible](https://cloud.google.com/free/docs/free-cloud-features#compute))
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`) installed and authenticated
- Your API keys ready: `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TAVILY_API_KEY`, and optionally `GOOGLE_API_KEY`

## Step 1: Create a GCP Project

```powershell
# Create a new project (ID must be globally unique)
gcloud projects create YOUR-PROJECT-ID

# Set it as the active project
gcloud config set project YOUR-PROJECT-ID

# Enable Compute Engine API (required for creating VMs)
gcloud services enable compute.googleapis.com
```

> **Note:** If the project ID is taken, try appending random numbers, e.g. `linkedin-bot-8342`.

## Step 2: Create the VM

**PowerShell (Windows):**

```powershell
gcloud compute instances create linkedin-bot `
    --zone=us-central1-a `
    --machine-type=e2-micro `
    --image-family=debian-12 `
    --image-project=debian-cloud `
    --boot-disk-size=10GB
```

**Bash (Linux/macOS):**

```bash
gcloud compute instances create linkedin-bot \
    --zone=us-central1-a \
    --machine-type=e2-micro \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=10GB
```

Wait ~30 seconds for the VM to be ready.

## Step 3: Copy setup script to the VM

```powershell
gcloud compute scp deploy/setup.sh linkedin-bot:/tmp/setup.sh --zone=us-central1-a
```

> **Note:** Use `/tmp/` not `~/` — PuTTY's `pscp` on Windows doesn't expand `~`.

## Step 4: SSH into the VM and run setup

```powershell
gcloud compute ssh linkedin-bot --zone=us-central1-a
```

Once inside the VM (Linux shell):

```bash
sudo bash /tmp/setup.sh
```

## Step 5: Configure environment

Still inside the VM:

```bash
sudo nano /opt/linkedin-bot/.env
```

Paste your keys (see `.env.example` for format):

```
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=your-chat-id
TAVILY_API_KEY=tvly-...
GOOGLE_API_KEY=AIza...
WRITING_PROVIDER=gemini
SCHEDULE_HOUR=9
TIMEZONE=Asia/Kolkata
```

Secure the file and start:

```bash
sudo chown linkedin-bot:linkedin-bot /opt/linkedin-bot/.env
sudo chmod 600 /opt/linkedin-bot/.env
sudo systemctl start linkedin-bot
```

## Monitoring

All monitoring commands are run inside the VM (SSH in first with `gcloud compute ssh linkedin-bot --zone=us-central1-a`):

```bash
# Check if the bot is running
sudo systemctl status linkedin-bot

# Follow live logs
sudo journalctl -u linkedin-bot -f

# View last 50 log lines
sudo journalctl -u linkedin-bot -n 50

# Restart the bot
sudo systemctl restart linkedin-bot

# Stop the bot
sudo systemctl stop linkedin-bot
```

## Updating the Bot

```powershell
# SSH into the VM
gcloud compute ssh linkedin-bot --zone=us-central1-a
```

Then inside the VM:

```bash
cd /opt/linkedin-bot
sudo -u linkedin-bot git pull
sudo /opt/linkedin-bot/venv/bin/pip install -r requirements.txt
sudo systemctl restart linkedin-bot
```

## Docker Alternative

If you prefer Docker instead of systemd:

**PowerShell (Windows):**

```powershell
docker build -t linkedin-bot .
docker run -d --name linkedin-bot --restart=always --env-file .env linkedin-bot
```

**Bash (Linux/macOS):**

```bash
docker build -t linkedin-bot .
docker run -d --name linkedin-bot --restart=always --env-file .env linkedin-bot
```

## Cost

The e2-micro instance in `us-central1` is included in GCP's Always Free tier:
- 1 e2-micro VM instance per month
- 30 GB standard persistent disk
- 1 GB outbound network per month

The bot uses minimal resources (mostly idle, brief API call bursts during generation).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `bash deploy/deploy.sh` fails on Windows | Run the gcloud commands directly in PowerShell (see Steps 2-4 above) |
| Project ID already taken | Append random numbers to make it unique |
| Compute Engine API not enabled | Run `gcloud services enable compute.googleapis.com` |
| Bot not starting | Check logs: `sudo journalctl -u linkedin-bot -n 100` |
| Permission denied | Verify `.env` ownership: `ls -la /opt/linkedin-bot/.env` |
| API errors | Verify keys in `.env`, test locally first with `python test_pipeline.py` |
| Out of memory | e2-micro has 1 GB RAM; if hitting limits, consider e2-small |
| Service not found | Re-run: `sudo cp /opt/linkedin-bot/deploy/linkedin-bot.service /etc/systemd/system/ && sudo systemctl daemon-reload` |
