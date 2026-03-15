#!/usr/bin/env bash
# deploy.sh — Create a GCP Compute Engine e2-micro VM and deploy the bot.
# Prerequisites: gcloud CLI installed and authenticated (gcloud auth login)
# Usage: bash deploy/deploy.sh
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
INSTANCE_NAME="linkedin-bot"
ZONE="us-central1-a"
MACHINE_TYPE="e2-micro"
IMAGE_FAMILY="debian-12"
IMAGE_PROJECT="debian-cloud"

if [ -z "$PROJECT_ID" ]; then
    echo "Error: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "=== Deploying to GCP project: $PROJECT_ID ==="
echo "    Instance: $INSTANCE_NAME"
echo "    Zone: $ZONE"
echo "    Machine type: $MACHINE_TYPE"
echo ""

# ─── Create VM ──────────────────────────────────────────────────────
echo "=== 1. Creating Compute Engine instance ==="
gcloud compute instances create "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family="$IMAGE_FAMILY" \
    --image-project="$IMAGE_PROJECT" \
    --boot-disk-size=10GB \
    --tags=linkedin-bot \
    --scopes=default

echo ""
echo "=== 2. Waiting for VM to be ready ==="
sleep 30

# ─── Copy files to VM ──────────────────────────────────────────────
echo "=== 3. Copying setup script to VM ==="
gcloud compute scp deploy/setup.sh "$INSTANCE_NAME":~/setup.sh --zone="$ZONE"

# ─── Run setup ─────────────────────────────────────────────────────
echo "=== 4. Running setup script on VM ==="
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="sudo bash ~/setup.sh"

echo ""
echo "=== VM created and setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. SSH into the VM:"
echo "     gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo ""
echo "  2. Create the .env file with your API keys:"
echo "     sudo nano /opt/linkedin-bot/.env"
echo ""
echo "  3. Secure and start:"
echo "     sudo chown linkedin-bot:linkedin-bot /opt/linkedin-bot/.env"
echo "     sudo chmod 600 /opt/linkedin-bot/.env"
echo "     sudo systemctl start linkedin-bot"
echo ""
echo "  4. Verify it's running:"
echo "     sudo systemctl status linkedin-bot"
echo "     sudo journalctl -u linkedin-bot -f"
