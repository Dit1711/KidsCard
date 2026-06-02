#!/usr/bin/env bash
# One-shot server bootstrap for the Kids Card stack.
# Run on a fresh Ubuntu 22.04/24.04 VM (Serverspace.uz / Uztelecom / any).
#
#   git clone https://<TOKEN>@github.com/Dit1711/KidsCard.git
#   cd KidsCard
#   cp .env.prod.example .env.prod && nano .env.prod   # fill in secrets
#   bash deploy/bootstrap.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/3  Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  echo "    docker already installed"
fi

echo "==> 2/3  Checking .env.prod"
if [ ! -f .env.prod ]; then
  echo "ERROR: .env.prod is missing. Run: cp .env.prod.example .env.prod && nano .env.prod" >&2
  exit 1
fi
# Fail early if any secret is still the placeholder.
if grep -q "CHANGE_ME" .env.prod; then
  echo "ERROR: .env.prod still contains CHANGE_ME placeholders — fill them in first." >&2
  exit 1
fi

echo "==> 3/3  Building & starting the stack (first run takes several minutes)"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo
echo "==> Status:"
docker compose -f docker-compose.prod.yml ps
echo
echo "Done. Watch it come up with:"
echo "  docker compose -f docker-compose.prod.yml logs -f web cloudflared"
echo "Once cloudflared shows a registered connection, open your Cloudflare hostname."
