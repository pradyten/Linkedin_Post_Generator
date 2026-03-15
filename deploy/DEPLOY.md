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

### Automatic (GitHub Actions)

Every push to `main` automatically deploys to the VM via the workflow in `.github/workflows/deploy.yml`. See [Automated Deployment with GitHub Actions](#automated-deployment-with-github-actions) below for one-time setup.

### Manual

```powershell
# SSH into the VM
gcloud compute ssh linkedin-bot --zone=us-central1-a
```

Then inside the VM:

```bash
cd /opt/linkedin-bot
git pull origin main
sudo /opt/linkedin-bot/venv/bin/pip install -r requirements.txt
sudo systemctl restart linkedin-bot
```

## Automated Deployment with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys on every push to `main`. It SSHs into the VM, pulls the latest code, conditionally installs dependencies and updates the service file, then restarts the bot.

### One-time setup

#### 1. Generate an SSH key pair

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""
```

This creates `~/.ssh/github_deploy_key` (private) and `~/.ssh/github_deploy_key.pub` (public).

#### 2. Add the public key to your VM

```powershell
gcloud compute ssh linkedin-bot --zone=us-central1-a
```

Inside the VM:

```bash
# Append the public key to authorized_keys
echo "YOUR_PUBLIC_KEY_CONTENTS" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Replace `YOUR_PUBLIC_KEY_CONTENTS` with the contents of `github_deploy_key.pub`.

#### 3. Get your VM's external IP and SSH username

```powershell
# External IP
gcloud compute instances describe linkedin-bot --zone=us-central1-a --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

# SSH username (your gcloud default user)
gcloud config get-value account
# The username is typically the part before @ — e.g., "pradyumn" from "pradyumn@gmail.com"
```

#### 4. Add GitHub secrets

Go to your repository on GitHub: **Settings > Secrets and variables > Actions > New repository secret**.

Add these 3 secrets:

| Secret | Value |
|--------|-------|
| `GCP_VM_HOST` | VM's external IP (from step 3) |
| `GCP_VM_USER` | Your SSH username (from step 3, NOT `linkedin-bot`) |
| `GCP_VM_SSH_KEY` | Entire contents of `~/.ssh/github_deploy_key` (private key) |

#### 5. Verify

Push a commit to `main` and check the **Actions** tab in your GitHub repository. The "Deploy to GCP VM" workflow should run and show each deploy step.

> **Note:** If your VM's external IP changes (e.g., after a VM restart), update the `GCP_VM_HOST` secret. Consider reserving a [static external IP](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address) to avoid this.

## Updating API Keys

API keys live only on the VM in `/opt/linkedin-bot/.env` — they are **not** stored in GitHub secrets.

To update a key:

```powershell
gcloud compute ssh linkedin-bot --zone=us-central1-a
```

Inside the VM:

```bash
sudo nano /opt/linkedin-bot/.env
# Edit the key(s) you need to change, save and exit
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
