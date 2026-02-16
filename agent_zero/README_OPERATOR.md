# Agent Zero - Lovable Autonomous Upgrade

## Overview

This directory contains the Agent Zero integration for the Dashboard Agent Swarm project, specifically the **Lovable Autonomous Upgrade** skill that orchestrates OpenHands to perform infinite Ralph-style code improvement loops.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Agent Swarm                    │
│                     (Control Tower)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent Zero                              │
│          (Skill Registry & Execution Engine)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      OpenHands                               │
│         (Autonomous SWE Agent - Infinite Loop)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    7 Acceptance Gates                        │
│   install → lint → typecheck → test → build → e2e → visual  │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
agent_zero/
├── skills/
│   └── lovable_autonomous_upgrade.yaml    # Skill definition
├── prompts/
│   └── lovable_gigaprompt.json           # Master prompt for OpenHands
└── README_OPERATOR.md                     # This file
```

## How It Works

### 1. Skill Registration

Agent Zero loads the `lovable_autonomous_upgrade.yaml` skill definition at startup, which defines:
- **Entrypoint**: OpenHands container running `run_lovable_job.sh`
- **Inputs**: repo_url, repo_branch, target_architecture (TanStack)
- **Outputs**: test_reports, visual_diffs, logs, and exactly ONE final PR
- **Models**: Local (DeepSeek/Qwen) for backend, GLM-4.7 for frontend, GPT-4o for validation
- **Gates**: 7-stage acceptance criteria (install, lint, typecheck, test, build, e2e, visual)
- **Loop Policy**: Ralph-style infinite iterations (max 500 iterations, 72 hours)

### 2. Execution Flow

```
Submit Job
    ↓
Agent Zero dispatches to OpenHands
    ↓
OpenHands runs gigaprompt ────┐
    ↓                          │
Run all 7 gates                │
    ↓                          │
All passed? ──NO──────────────┘ (iterate again)
    ↓
   YES
    ↓
Open final PR
    ↓
Job complete
```

### 3. Infinite Loop (Ralph-style)

OpenHands executes an infinite loop that:
1. Reads the gigaprompt (architecture requirements, constraints, rules)
2. Analyzes the repository
3. Makes improvements (migrate to TanStack, fix types, improve backend)
4. Runs all 7 gates
5. If any gate fails → iterate again (max 500 times or 72 hours)
6. If all gates pass → open exactly ONE final PR

### 4. Gates

Each gate must pass for the job to complete:

| Gate | Command | Purpose |
|------|---------|---------|
| **install** | `pnpm i --frozen-lockfile` | All dependencies install without errors |
| **lint** | `pnpm lint` | No ESLint errors |
| **typecheck** | `pnpm typecheck` | No TypeScript errors |
| **test** | `pnpm test` | All unit tests pass |
| **build** | `pnpm build` | Production build succeeds |
| **e2e** | `pnpm e2e` | End-to-end tests pass (optional) |
| **visual** | `pnpm visual` | Visual regression tests pass (optional) |

### 5. TanStack Migration

The gigaprompt instructs OpenHands to migrate repositories to the **TanStack** architecture:
- **TanStack Router**: Type-safe, file-based routing (replaces React Router)
- **TanStack Query**: Intelligent data fetching with caching (replaces direct fetch/axios)
- **Backend-authoritative**: Backend owns business logic, frontend is thin presentation layer

## Usage

### Option 1: Docker Compose (Recommended)

1. **Start the stack:**
   ```bash
   docker-compose up -d
   ```

2. **Verify Agent Zero is running:**
   ```bash
   docker-compose logs agent_zero
   ```

3. **Submit a job via API:**
   ```bash
   curl -X POST http://localhost:8000/api/jobs \
     -H "Content-Type: application/json" \
     -d '{
       "skill_id": "lovable_autonomous_upgrade_v1",
       "inputs": {
         "repo_url": "https://github.com/yourorg/yourrepo",
         "repo_branch": "main",
         "target_architecture": "TanStack",
         "frontend_pass": true
       }
     }'
   ```

4. **Monitor job progress:**
   ```bash
   docker-compose logs -f openhands
   ```

5. **Review the final PR** when all gates pass.

### Option 2: Manual Execution (Development)

1. **Clone your target repository:**
   ```bash
   git clone https://github.com/yourorg/yourrepo workspace/yourrepo
   cd workspace/yourrepo
   ```

2. **Run the job manually:**
   ```bash
   export REPO_ROOT=$(pwd)
   export PROMPT_FILE=/path/to/agent_zero/prompts/lovable_gigaprompt.json
   /path/to/openhands/scripts/run_lovable_job.sh
   ```

3. **Watch the infinite loop** until all gates pass.

## Environment Variables

Required environment variables (add to `.env`):

```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...

# OpenHands Configuration
OPENHANDS_MAX_ITERATIONS=500
OPENHANDS_MAX_HOURS=72

# Database
POSTGRES_USER=dashboard
POSTGRES_PASSWORD=changeme
POSTGRES_DB=dashboard

# Redis
REDIS_URL=redis://redis:6379/1
```

## Skill Configuration

### Required Inputs

- **repo_url** (required): GitHub repository URL
- **repo_branch** (required): Branch to upgrade (e.g., "main")

### Optional Inputs

- **target_architecture** (default: "TanStack"): Target architecture framework
- **frontend_pass** (default: true): Enable frontend refinement with GLM-4.7

### Constraints

- **Forbidden paths**: `infra/prod/**`, `secrets/**`, `**/*.env`
- **Max files changed**: 300
- **Max diff lines**: 15,000
- **PR only**: No direct commits to main

## Troubleshooting

### Job times out (72 hours)

If the job reaches 72 hours without all gates passing, OpenHands writes a `BLOCKER.md` file:

```bash
cat workspace/yourrepo/BLOCKER.md
```

Review the blocker and manually fix persistent issues, then retry.

### Max iterations reached (500)

If the job completes 500 iterations without success:
1. Check `.gate_results.log` for persistent failures
2. Identify the blocking gate (likely typecheck or test)
3. Manually fix the issue in the repo
4. Re-run the job

### Gates fail on specific step

To debug a specific gate:

```bash
# Enter the OpenHands container
docker-compose exec openhands bash

# Navigate to workspace
cd /workspace/yourrepo

# Run the failing gate manually
pnpm lint          # or typecheck, test, build, etc.
```

### OpenHands not making progress

Check OpenHands logs for errors:

```bash
docker-compose logs -f openhands
```

Common issues:
- API key not set (OPENAI_API_KEY, ANTHROPIC_API_KEY)
- Repository not cloned into /workspace
- pnpm not installed (should be in Dockerfile)

## Integration with Dashboard

The Lovable Autonomous Upgrade skill is designed to be triggered from the **Dashboard Agent Swarm** UI:

1. Navigate to `/agents` page
2. Select "Agent Zero" from the agent roster
3. Choose the "Lovable Autonomous Upgrade" skill
4. Enter repository URL and branch
5. Click "Start Job"
6. Monitor progress in the "Runs" dashboard
7. Receive notification when PR is ready

## Model Strategy

The skill uses a multi-model strategy for cost optimization and quality:

| Component | Model | Provider | Purpose |
|-----------|-------|----------|---------|
| **Backend Code** | DeepSeek / Qwen | Local | Cost-effective for backend logic |
| **Frontend Code** | GLM-4.7 | ZAI | Specialized for React/frontend |
| **Final Validation** | GPT-4o | OpenAI | Read-only review, catches edge cases |

## Next Steps

1. **Monitor the first run** end-to-end to understand the loop
2. **Review the final PR** to understand the types of changes made
3. **Tune the gigaprompt** if certain patterns aren't being caught
4. **Adjust gate thresholds** if too strict or too lenient
5. **Scale up** to multiple concurrent runs for batch upgrades

## References

- [OpenHands Documentation](https://github.com/All-Hands-AI/OpenHands)
- [TanStack Router](https://tanstack.com/router)
- [TanStack Query](https://tanstack.com/query)
- [Agent Zero](https://github.com/frdel/agent-zero)
- [Ralph-style Loops](https://www.ralphscode.com/)

---

**Generated by**: Dashboard Agent Swarm Integration
**Version**: 1.0.0
**Last Updated**: 2026-01-30
