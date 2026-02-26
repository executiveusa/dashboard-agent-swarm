---
name: repo-management
description: Manage GitHub repo assignments across the 313-repo executiveusa fleet. Run this skill to audit repo assignments, assign repos to agents, identify unassigned repos, or generate the full assignment export. Agent Zero (PAULI BRAIN) commands the ecosystem — all unassigned repos default to Agent Zero's guardian fleet.
disable-model-invocation: true
---

# Repo Fleet Management

## Overview

The executiveusa GitHub org contains 313 repos assigned to a 6-agent fleet:

| Agent | Codename | Org | Role |
|---|---|---|---|
| Agent Zero | AX-PAULI-BRAIN-002 | The Pauli Effect | Chief Brain — commands entire ecosystem |
| SYNTHIA | AX-SYNTHIA-001 | Kupuri Media | CDMX ops, SAT/CFDI, sales |
| MAXX | MACS-DIGITAL | Macs Digital Media | Video, casino, research |
| NWK | NEW-WORLD-KIDS | New World Kids | Children content |
| CHEGGIE | CHEGGIE-MEDIA | Cheggie Media | Lifestyle finance |
| AKASH | AKASH-ENGINE | Akash Engine | Infrastructure, portfolio |

**Single-agent philosophy:** Agent Zero is the only agent you talk to. Agent Zero branches out and delegates to sub-agents. Never add logic that bypasses Agent Zero.

## Prerequisites

- Hono server running at port 8787
- Dashboard frontend running at port 5174 or 8082
- GitHub PAT stored as `GH_PAT` env var

## Step 1: Audit Current Assignments

```bash
# Get full assignment map with counts
curl http://localhost:8787/api/repos/agents | jq '.agents[] | {name, repoCount}'

# Get unassigned repos
curl "http://localhost:8787/api/repos?agent=UNASSIGNED" | jq '.repos[].name'

# Search for a specific repo
curl "http://localhost:8787/api/repos?q=synthia" | jq '.repos'
```

## Step 2: Assign a Repo

```bash
# Assign a single repo to Agent Zero
curl -X PATCH http://localhost:8787/api/repos/my-repo-name/assign \
  -H "Content-Type: application/json" \
  -d '{"agent": "AGENT-ZERO"}'

# Assign to SYNTHIA (Kupuri Media)
curl -X PATCH http://localhost:8787/api/repos/tanda_cdmx/assign \
  -H "Content-Type: application/json" \
  -d '{"agent": "AX-SYNTHIA-001"}'
```

Valid agent IDs:
- `AGENT-ZERO` — The Pauli Effect / Pauli Brain
- `AX-SYNTHIA-001` — Kupuri Media
- `MACS` — Macs Digital Media
- `NEW-WORLD-KIDS` — New World Kids
- `CHEGGIE` — Cheggie Media
- `AKASH` — Akash Engine

## Step 3: Bulk Assign

```bash
# Assign multiple repos at once
curl -X POST http://localhost:8787/api/repos/bulk-assign \
  -H "Content-Type: application/json" \
  -d '{"repos": ["repo-a", "repo-b", "repo-c"], "agent": "AGENT-ZERO"}'
```

## Step 4: Export Full Map

```bash
# Export entire assignment map as JSON
curl http://localhost:8787/api/repos/export > repo-assignments-$(date +%F).json
```

## Step 5: Sync to personas.yaml

After bulk changes, run the sync to update `archonx/config/archon_x_personas.yaml`:

```bash
# From archonx-os root
py -c "
import json, yaml
with open('server/data/repo_assignments.json') as f:
    assignments = json.load(f)

with open('archonx/config/archon_x_personas.yaml') as f:
    config = yaml.safe_load(f)

# Rebuild SYNTHIA repos list
synthia_repos = [r for r, a in assignments.items() if a == 'AX-SYNTHIA-001']
config['personas']['AX-SYNTHIA-001']['repos'] = sorted(synthia_repos)

with open('archonx/config/archon_x_personas.yaml', 'w') as f:
    yaml.dump(config, f, allow_unicode=True, sort_keys=False)
print(f'Synced {len(synthia_repos)} SYNTHIA repos')
"
```

## Identifying Missing Repos

```bash
# Get all GitHub repos
gh repo list executiveusa --limit 500 --json name --jq '.[].name' | sort > /tmp/github_repos.txt

# Get all assigned repos
curl http://localhost:8787/api/repos | jq -r '.repos[].name' | sort > /tmp/assigned_repos.txt

# Find repos on GitHub but not in our catalogue
comm -23 /tmp/github_repos.txt /tmp/assigned_repos.txt
```

## Dashboard UI

Navigate to `/repos` in the dashboard to use the visual assignment tool:
1. Use the predictive search bar to filter repos in real time
2. Click agent cards at the top to filter by agent
3. Use the "Assign" dropdown on any row to reassign
4. Export button downloads the full assignment JSON

## Rules

1. All unassigned repos are watched by Agent Zero's guardian fleet
2. SYNTHIA only handles Kupuri Media repos (es-MX context)
3. Never assign archonx-os itself to a sub-agent — it stays with Agent Zero
4. When creating a new repo, assign it here before running the first cron health check
5. Assignment changes are persisted to `server/data/repo_assignments.json`
