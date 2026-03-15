# Deploying to GCP Compute Engine (e2-micro)

Run the LinkedIn Post Generator bot 24/7 on GCP's free-tier e2-micro instance (1 shared vCPU, 1 GB RAM).

## Prerequisites

- A GCP account with billing enabled (e2-micro is [free-tier eligible](https://cloud.google.com/free/docs/free-cloud-features#compute))
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`) installed and authenticated
- Your API keys ready: `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TAVILY_API_KEY`, and optionally `GOOGLE_API_KEY`

## Option A: Automated Deploy

```bash
# 1. Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# 2. Run the deploy script (creates VM + runs setup)
bash deploy/deploy.sh

# 3. SSH in to configure .env
gcloud compute ssh linkedin-bot --zone=us-central1-a

# 4. Create .env with your keys
sudo nano /opt/linkedin-bot/.env
# Paste your keys (see .env.example for format)

# 5. Secure and start
sudo chown linkedin-bot:linkedin-bot /opt/linkedin-bot/.env
sudo chmod 600 /opt/linkedin-bot/.env
sudo systemctl start linkedin-bot
```

## Option B: Manual Deploy

### 1. Create the VM

```bash
gcloud compute instances create linkedin-bot \
    --zone=us-central1-a \
    --machine-type=e2-micro \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=10GB
```

### 2. SSH into the VM

```bash
gcloud compute ssh linkedin-bot --zone=us-central1-a
```

### 3. Run the setup script

```bash
# Clone the repo and run setup
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/YOUR_USER/Linkedin_Post_Generator.git /tmp/linkedin-bot
sudo bash /tmp/linkedin-bot/deploy/setup.sh
```

### 4. Configure environment

```bash
sudo nano /opt/linkedin-bot/.env
```

Add your keys (see `.env.example`):

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

Secure the file:

```bash
sudo chown linkedin-bot:linkedin-bot /opt/linkedin-bot/.env
sudo chmod 600 /opt/linkedin-bot/.env
```

### 5. Start the service

```bash
sudo systemctl start linkedin-bot
```

## Monitoring

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

```bash
# SSH into the VM
gcloud compute ssh linkedin-bot --zone=us-central1-a

# Pull latest code and restart
cd /opt/linkedin-bot
sudo -u linkedin-bot git pull
sudo /opt/linkedin-bot/venv/bin/pip install -r requirements.txt
sudo systemctl restart linkedin-bot
```

## Docker Alternative

If you prefer Docker instead of systemd:

```bash
# Build
docker build -t linkedin-bot .

# Run (pass .env file)
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
| Bot not starting | Check logs: `sudo journalctl -u linkedin-bot -n 100` |
| Permission denied | Verify `.env` ownership: `ls -la /opt/linkedin-bot/.env` |
| API errors | Verify keys in `.env`, test locally first with `python test_pipeline.py` |
| Out of memory | e2-micro has 1 GB RAM; if hitting limits, consider e2-small |
| Service not found | Re-run: `sudo cp /opt/linkedin-bot/deploy/linkedin-bot.service /etc/systemd/system/ && sudo systemctl daemon-reload` |
