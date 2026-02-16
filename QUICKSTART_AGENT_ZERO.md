# Agent Zero + OpenHands - Quick Start

## 🚀 Quick Start (5 minutes)

### 1. Copy environment variables

```bash
cp .env.example .env
```

### 2. Add your API keys to `.env`

```bash
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...

# Optional (for local models)
VITE_LOCAL_LLM_URL=http://localhost:8000
```

### 3. Start the stack

```bash
docker-compose up -d
```

### 4. Verify services are running

```bash
docker-compose ps
```

You should see:
- ✅ postgres (healthy)
- ✅ redis (running)
- ✅ flowise (running)
- ✅ backend (running)
- ✅ web (running)
- ✅ openhands (running)
- ✅ agent_zero (running)

### 5. Submit your first autonomous upgrade job

```bash
curl -X POST http://localhost:8000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "lovable_autonomous_upgrade_v1",
    "inputs": {
      "repo_url": "https://github.com/yourorg/yourrepo",
      "repo_branch": "main",
      "target_architecture": "TanStack"
    }
  }'
```

### 6. Monitor the job

```bash
# Watch OpenHands logs
docker-compose logs -f openhands

# Watch Agent Zero logs
docker-compose logs -f agent_zero
```

### 7. Review the final PR

When all gates pass, OpenHands will:
1. Open exactly ONE final PR
2. Include a detailed description of changes
3. List all gates that passed

Review the PR at: `https://github.com/yourorg/yourrepo/pulls`

---

## 🎯 What Just Happened?

```
Your Lovable repository → Agent Zero → OpenHands → Infinite Loop
                                                        ↓
                                            7 Gates (install, lint, etc.)
                                                        ↓
                                                   All passed?
                                                        ↓
                                                  Final PR opened
```

The autonomous upgrade:
- ✅ Migrated to TanStack Router (type-safe routing)
- ✅ Migrated to TanStack Query (smart data fetching)
- ✅ Fixed all TypeScript errors
- ✅ Passed all tests
- ✅ Built successfully
- ✅ Passed e2e and visual tests

---

## 📊 Access the Dashboard

Open your browser to:
- **Main Dashboard**: http://localhost:8080
- **Flowise (Agent Builder)**: http://localhost:3000
- **Agent Zero API**: http://localhost:8000
- **Backend API**: http://localhost:8787

---

## 🛠️ Development Commands

```bash
# View all logs
docker-compose logs -f

# Restart a service
docker-compose restart agent_zero

# Rebuild after code changes
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

---

## 📚 Next Steps

1. **Read the full documentation**: See `agent_zero/README_OPERATOR.md`
2. **Customize the gigaprompt**: Edit `agent_zero/prompts/lovable_gigaprompt.json`
3. **Tune gate thresholds**: Modify `openhands/scripts/run_gates.sh`
4. **Add custom skills**: Create new YAML files in `agent_zero/skills/`
5. **Build the UI**: Create the Agent Studio dashboard (Phase 3)

---

## 🐛 Troubleshooting

### Job not starting

```bash
# Check Agent Zero logs
docker-compose logs agent_zero | tail -50

# Check if skill is loaded
docker-compose exec agent_zero ls -la /app/agent_zero/skills/
```

### Gates failing

```bash
# Enter the OpenHands container
docker-compose exec openhands bash

# Navigate to your repo
cd /workspace/yourrepo

# Run the failing gate manually
pnpm lint  # or typecheck, test, build, etc.
```

### GitHub PR not opening

Ensure `GITHUB_TOKEN` is set in `.env` and has these permissions:
- ✅ `repo` (full control)
- ✅ `workflow` (if using GitHub Actions)

Test the token:
```bash
docker-compose exec openhands gh auth status
```

---

**Ready to build the control tower UI?** Continue to Phase 3 to create the Agent Studio dashboard.
