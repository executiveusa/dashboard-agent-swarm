#!/usr/bin/env bash
#
# deploy-to-hostinger.sh
# Deploys dashboard-agent-swarm to a Hostinger VPS via SSH + Docker Compose
#
# Prerequisites:
#   - SSH key access to the VPS (ed25519 key)
#   - Docker and Docker Compose installed on VPS
#   - Environment file (.env) on VPS at /opt/dashboard/.env
#
# Usage:
#   ./scripts/deploy-to-hostinger.sh [--build] [--pull-only]
#
# Environment variables (from master.env or export):
#   VPS_HOST       - Hostinger VPS IP or hostname
#   VPS_USER       - SSH user (default: root)
#   VPS_SSH_KEY    - Path to SSH private key
#   DEPLOY_DIR     - Remote deploy directory (default: /opt/dashboard)
#   GITHUB_REPO    - GitHub repo URL (default: from git remote)
#   GITHUB_BRANCH  - Branch to deploy (default: main)
#
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────
VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
VPS_SSH_KEY="${VPS_SSH_KEY:-$HOME/.ssh/id_ed25519}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/dashboard}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"
GITHUB_REPO="${GITHUB_REPO:-$(git remote get-url origin 2>/dev/null || echo '')}"

BUILD_FLAG=false
PULL_ONLY=false

# ─── Parse arguments ────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --build)    BUILD_FLAG=true; shift ;;
    --pull-only) PULL_ONLY=true; shift ;;
    *)          echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Validation ─────────────────────────────────────────────────
if [[ -z "$VPS_HOST" ]]; then
  echo "ERROR: VPS_HOST is not set. Export it or set in your environment."
  echo "  export VPS_HOST=your-vps-ip"
  exit 1
fi

if [[ ! -f "$VPS_SSH_KEY" ]]; then
  echo "ERROR: SSH key not found at $VPS_SSH_KEY"
  echo "  export VPS_SSH_KEY=/path/to/your/key"
  exit 1
fi

SSH_CMD="ssh -i $VPS_SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST"

echo "══════════════════════════════════════════════════"
echo "  Dashboard Agent Swarm — Hostinger Deploy"
echo "══════════════════════════════════════════════════"
echo "  Host:   $VPS_USER@$VPS_HOST"
echo "  Dir:    $DEPLOY_DIR"
echo "  Branch: $GITHUB_BRANCH"
echo "  Build:  $BUILD_FLAG"
echo "══════════════════════════════════════════════════"
echo ""

# ─── Step 1: Ensure remote directory exists ─────────────────────
echo "► Ensuring deploy directory exists..."
$SSH_CMD "mkdir -p $DEPLOY_DIR"

# ─── Step 2: Clone or pull repo ────────────────────────────────
echo "► Syncing repository..."
$SSH_CMD bash -s <<REMOTE_SCRIPT
  set -euo pipefail
  cd $DEPLOY_DIR

  if [ -d ".git" ]; then
    echo "  → Pulling latest from $GITHUB_BRANCH..."
    git fetch --all --prune
    git checkout $GITHUB_BRANCH
    git reset --hard origin/$GITHUB_BRANCH
  else
    echo "  → Cloning repository..."
    git clone -b $GITHUB_BRANCH $GITHUB_REPO .
  fi
REMOTE_SCRIPT

if $PULL_ONLY; then
  echo "✓ Pull complete. Skipping Docker deployment (--pull-only)."
  exit 0
fi

# ─── Step 3: Check for .env file ───────────────────────────────
echo "► Checking environment configuration..."
$SSH_CMD bash -s <<'REMOTE_SCRIPT'
  set -euo pipefail
  ENV_FILE="${DEPLOY_DIR:=/opt/dashboard}/.env"
  if [ ! -f "$ENV_FILE" ]; then
    echo "  ⚠ WARNING: .env file not found at $ENV_FILE"
    echo "  Copy your environment file to the VPS:"
    echo "    scp .env $VPS_USER@$VPS_HOST:$DEPLOY_DIR/.env"
    echo ""
    echo "  Creating minimal .env from .env.example..."
    if [ -f "$DEPLOY_DIR/.env.example" ]; then
      cp "$DEPLOY_DIR/.env.example" "$ENV_FILE"
    else
      cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8787
DATABASE_URL=postgresql://dashboard:changeme@postgres:5432/dashboard
CORS_ORIGIN=*
POSTGRES_USER=dashboard
POSTGRES_PASSWORD=changeme
POSTGRES_DB=dashboard
REDIS_URL=redis://redis:6379
EOF
    fi
  fi
  echo "  ✓ .env file present"
REMOTE_SCRIPT

# ─── Step 4: Build and deploy with Docker Compose ──────────────
echo "► Building and deploying services..."
if $BUILD_FLAG; then
  $SSH_CMD "cd $DEPLOY_DIR && docker compose build --no-cache && docker compose up -d"
else
  $SSH_CMD "cd $DEPLOY_DIR && docker compose pull 2>/dev/null || true && docker compose up -d --build"
fi

# ─── Step 5: Health check ──────────────────────────────────────
echo ""
echo "► Running health checks..."
sleep 5

$SSH_CMD bash -s <<'REMOTE_SCRIPT'
  set -euo pipefail
  echo "  Docker containers:"
  docker compose -f /opt/dashboard/docker-compose.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  
  echo ""
  echo "  Health endpoints:"
  
  # Check backend health
  if curl -sf http://localhost:8787/health > /dev/null 2>&1; then
    echo "  ✓ Backend API  → healthy"
  else
    echo "  ✗ Backend API  → unreachable"
  fi
  
  # Check frontend
  if curl -sf http://localhost:8080/ > /dev/null 2>&1; then
    echo "  ✓ Frontend     → healthy"
  else
    echo "  ✗ Frontend     → unreachable"
  fi
  
  # Check PostgreSQL
  if docker exec dashboard-postgres-1 pg_isready 2>/dev/null; then
    echo "  ✓ PostgreSQL   → ready"
  else
    echo "  ✗ PostgreSQL   → not ready"
  fi
  
  # Check Redis
  if docker exec dashboard-redis-1 redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "  ✓ Redis        → ready"
  else
    echo "  ✗ Redis        → not ready"
  fi
REMOTE_SCRIPT

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✓ Deployment complete!"
echo "  Dashboard: http://$VPS_HOST:8080"
echo "  Backend:   http://$VPS_HOST:8787"
echo "══════════════════════════════════════════════════"
