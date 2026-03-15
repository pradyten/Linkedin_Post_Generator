#!/usr/bin/env bash
# setup.sh — Run once on the GCP VM after SSH-ing in.
# Usage: sudo bash setup.sh [REPO_URL]
# Example: sudo bash setup.sh https://github.com/pradyten/Linkedin_Post_Generator.git
set -euo pipefail

REPO_URL="${1:-https://github.com/pradyten/Linkedin_Post_Generator.git}"
INSTALL_DIR="/opt/linkedin-bot"
BOT_USER="linkedin-bot"

echo "=== 1. Installing system dependencies ==="
apt-get update -y
apt-get install -y python3 python3-pip python3-venv git

echo "=== 2. Creating service user ==="
if ! id "$BOT_USER" &>/dev/null; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "$BOT_USER"
fi

echo "=== 3. Cloning repository ==="
if [ -d "$INSTALL_DIR" ]; then
    echo "Directory $INSTALL_DIR already exists, pulling latest..."
    cd "$INSTALL_DIR"
    git pull
else
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

echo "=== 4. Setting up Python virtual environment ==="
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/requirements.txt"

echo "=== 5. Creating data directory ==="
mkdir -p "$INSTALL_DIR/data"

echo "=== 6. Setting permissions ==="
# Only set ownership on runtime directories — leave .git/ and source files
# owned by the SSH user so CI/CD can run `git pull` without permission issues.
chown -R "$BOT_USER":"$BOT_USER" "$INSTALL_DIR/data"
chown -R "$BOT_USER":"$BOT_USER" "$INSTALL_DIR/venv"
chown "$BOT_USER":"$BOT_USER" "$INSTALL_DIR/.env" 2>/dev/null || true

echo "=== 7. Installing systemd service ==="
cp "$INSTALL_DIR/deploy/linkedin-bot.service" /etc/systemd/system/linkedin-bot.service
# Update ExecStart to use the venv python
sed -i "s|ExecStart=/usr/bin/python3|ExecStart=$INSTALL_DIR/venv/bin/python|" /etc/systemd/system/linkedin-bot.service
systemctl daemon-reload
systemctl enable linkedin-bot

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Create your .env file:  sudo nano $INSTALL_DIR/.env"
echo "  2. Set ownership:          sudo chown $BOT_USER:$BOT_USER $INSTALL_DIR/.env"
echo "  3. Restrict permissions:   sudo chmod 600 $INSTALL_DIR/.env"
echo "  4. Start the service:      sudo systemctl start linkedin-bot"
echo "  5. Check status:           sudo systemctl status linkedin-bot"
echo "  6. View logs:              sudo journalctl -u linkedin-bot -f"
