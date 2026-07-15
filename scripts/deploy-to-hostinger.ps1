# deploy-to-hostinger.ps1
# PowerShell version of the Hostinger deploy script for Windows users
#
# Usage:
#   .\scripts\deploy-to-hostinger.ps1 [-Build] [-PullOnly]
#
# Environment variables (from master.env or $env:):
#   VPS_HOST, VPS_USER, VPS_SSH_KEY, DEPLOY_DIR, GITHUB_BRANCH
#
param(
    [switch]$Build,
    [switch]$PullOnly
)

$ErrorActionPreference = "Stop"

# ─── Configuration ──────────────────────────────────────────────
$VpsHost      = $env:VPS_HOST
$VpsUser      = if ($env:VPS_USER) { $env:VPS_USER } else { "root" }
$VpsSshKey    = if ($env:VPS_SSH_KEY) { $env:VPS_SSH_KEY } else { "$env:USERPROFILE\.ssh\id_ed25519" }
$DeployDir    = if ($env:DEPLOY_DIR) { $env:DEPLOY_DIR } else { "/opt/dashboard" }
$GithubBranch = if ($env:GITHUB_BRANCH) { $env:GITHUB_BRANCH } else { "main" }
$GithubRepo   = if ($env:GITHUB_REPO) { $env:GITHUB_REPO } else { (git remote get-url origin 2>$null) }

# ─── Validation ─────────────────────────────────────────────────
if (-not $VpsHost) {
    Write-Error "VPS_HOST is not set. Run: `$env:VPS_HOST = 'your-vps-ip'"
    exit 1
}
if (-not (Test-Path $VpsSshKey)) {
    Write-Error "SSH key not found at $VpsSshKey. Run: `$env:VPS_SSH_KEY = 'C:\path\to\key'"
    exit 1
}

function Invoke-Remote {
    param([string]$Command)
    ssh -i $VpsSshKey -o StrictHostKeyChecking=no "${VpsUser}@${VpsHost}" $Command
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Dashboard Agent Swarm — Hostinger Deploy" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Host:   ${VpsUser}@${VpsHost}"
Write-Host "  Dir:    $DeployDir"
Write-Host "  Branch: $GithubBranch"
Write-Host "  Build:  $Build"
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Ensure remote directory ───────────────────────────
Write-Host "► Ensuring deploy directory exists..." -ForegroundColor Yellow
Invoke-Remote "mkdir -p $DeployDir"

# ─── Step 2: Clone or pull ─────────────────────────────────────
Write-Host "► Syncing repository..." -ForegroundColor Yellow
$syncScript = @"
cd $DeployDir
if [ -d '.git' ]; then
  git fetch --all --prune
  git checkout $GithubBranch
  git reset --hard origin/$GithubBranch
else
  git clone -b $GithubBranch $GithubRepo .
fi
"@
Invoke-Remote "bash -c '$($syncScript -replace "'","'\''")'"

if ($PullOnly) {
    Write-Host "✓ Pull complete. Skipping Docker deployment." -ForegroundColor Green
    exit 0
}

# ─── Step 3: Check .env ───────────────────────────────────────
Write-Host "► Checking environment configuration..." -ForegroundColor Yellow
$envCheck = @"
if [ ! -f '$DeployDir/.env' ]; then
  echo 'WARNING: .env not found, creating minimal config'
  cat > '$DeployDir/.env' <<'ENVEOF'
NODE_ENV=production
PORT=8787
DATABASE_URL=postgresql://dashboard:changeme@postgres:5432/dashboard
CORS_ORIGIN=*
POSTGRES_USER=dashboard
POSTGRES_PASSWORD=changeme
POSTGRES_DB=dashboard
REDIS_URL=redis://redis:6379
ENVEOF
fi
echo '.env present'
"@
Invoke-Remote "bash -c '$($envCheck -replace "'","'\''")'"

# ─── Step 4: Docker Compose deploy ────────────────────────────
Write-Host "► Building and deploying services..." -ForegroundColor Yellow
if ($Build) {
    Invoke-Remote "cd $DeployDir && docker compose build --no-cache && docker compose up -d"
} else {
    Invoke-Remote "cd $DeployDir && docker compose pull 2>/dev/null; docker compose up -d --build"
}

# ─── Step 5: Health check ─────────────────────────────────────
Write-Host ""
Write-Host "► Running health checks (waiting 5s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$healthCheck = @"
echo 'Docker containers:'
docker compose -f $DeployDir/docker-compose.yml ps 2>/dev/null || docker ps
echo ''
echo 'Health endpoints:'
curl -sf http://localhost:8787/health >/dev/null 2>&1 && echo '  ✓ Backend API → healthy' || echo '  ✗ Backend API → unreachable'
curl -sf http://localhost:8080/ >/dev/null 2>&1 && echo '  ✓ Frontend → healthy' || echo '  ✗ Frontend → unreachable'
"@
Invoke-Remote "bash -c '$($healthCheck -replace "'","'\''")'"

Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Deployment complete!" -ForegroundColor Green
Write-Host "  Dashboard: http://${VpsHost}:8080" -ForegroundColor Green
Write-Host "  Backend:   http://${VpsHost}:8787" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Green
