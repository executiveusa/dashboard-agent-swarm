# Dashboard Agent Swarm — Agent Guide

Use `bd` for persistent task tracking across sessions.

```bash
bd ready          # What's unblocked?
bd create "Title" --type task --priority 2
bd update <id> --claim
bd close <id> --reason "done"
bd sync           # End of session
```

## Project
- DARYA Studio — master control dashboard for all agents
- React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- Backend: Express/Node on port 8787, PostgreSQL, Redis, Flowise
- Docker: nginx frontend, node backend, postgres, redis, flowise

## Agent Registry
- DARYA vΩ (orchestrator)
- Maya (fundraising), Luna (UGC), Solana (crypto), Vega (merch), Aurora (ops)
- Devika/Bambu (coding agent), SYNTHIA (voice agent)

## Connected Repos
- `devika-agent` — Main agent backend (Python Flask, port 1337)
- `GPT-Agent-im-ready` — Meeting room / Pauli's Place
