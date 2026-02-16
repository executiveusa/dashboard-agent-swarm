# Dashboard Agent Swarm — Agent Guide

> **Mission**: Building a Future-Proof Autonomous AI Agent Platform (AI Agency in a Box)  
> **Protocol**: See `AGENT_PROTOCOL.md` for the full fleet protocol  
> **Role**: See `ROLE_INSTRUCTIONS.md` for this repo's specific role  

## Project

- DARYA Studio — master control dashboard for all agents
- React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Backend: Express/Node on port 8787, PostgreSQL, Redis, Flowise
- Docker: nginx frontend, node backend, postgres, redis, flowise

## Agent Hierarchy

```
Agent Zero (Master Orchestrator) — agent-zero-Fork
├── DARYA vΩ (Creative Director) — dashboard-agent-swarm
│   ├── Maya (Fundraising & Donor Relations)
│   ├── Luna (UGC & Virality)
│   ├── Solana (Crypto & Tokenization)
│   ├── Vega (IP & Merch Universe)
│   └── Aurora (Ops & KPI Dashboards)
├── Devika (AI Software Engineer) — devika-agent
├── Pauli (Meeting Coordinator) — GPT-Agent-im-ready
│   ├── NEXUS, CREDIT, ARIA, SPECTRUM, VEGA, ECHO
│   └── pauli-comic-funnel (content pipeline)
├── Alex (DevOps & Deployment) — MetaGPT
├── Cynthia (Observability & Safety)
├── Bambu Lab (3D Printing & Fabrication)
├── SYNTHIA (Voice Agent) — voice-agents-fork
├── ClawdBot (Multi-Channel Messaging) — clawdbot-Whatsapp-agent
├── Open Agent Platform — open-agent-platform-pauli
└── VisionClaw (Computer Vision)
```

## Critical Repos (Protocol-Deployed)

| Repo | Agent(s) | Protocol Status |
|------|----------|----------------|
| `dashboard-agent-swarm` | DARYA, Aurora, All | ✅ AGENT_PROTOCOL.md + ROLE_INSTRUCTIONS.md |
| `agent-zero-Fork` | Agent Zero, SYNTHIA | ✅ AGENT_PROTOCOL.md + ROLE_INSTRUCTIONS.md |
| `MetaGPT` | Alex (SOP-driven dev) | ✅ AGENT_PROTOCOL.md + ROLE_INSTRUCTIONS.md |
| `GPT-Agent-im-ready` | Pauli (Meeting Place) | ✅ AGENT_PROTOCOL.md + ROLE_INSTRUCTIONS.md |
| `clawdbot-Whatsapp-agent` | ClawdBot | ✅ AGENT_PROTOCOL.md + ROLE_INSTRUCTIONS.md |
| `open-agent-platform-pauli` | Pauli (No-code builder) | ✅ AGENT_PROTOCOL.md + ROLE_INSTRUCTIONS.md |
| `voice-agents-fork` | SYNTHIA | ✅ AGENT_PROTOCOL.md + ROLE_INSTRUCTIONS.md |

## Shared Tool Repos (Forked)

| Repo | Purpose |
|------|---------|
| `executiveusa/acip` | ACIP v1.3 — Prompt injection defense |
| `executiveusa/coding_agent_session_search` | CASS — Cross-agent session search |
| `executiveusa/coding_agent_usage_tracker` | CAUT — LLM usage tracking |
| `executiveusa/agent_flywheel_clawdbot_skills_and_integrations` | Flywheel Skills — 25+ reusable skill files |

## Supporting Repos

| Repo | Purpose |
|------|---------|
| `devika-agent` | Devika AI software engineer (Python Flask :1337) |
| `pauli-comic-funnel` | PAULI orchestrator + 6 specialist agents |
| `second-brain-agent` | Knowledge RAG agent |
| `paulis-deep-agent` | Deep reasoning agent |
| `pauli-deep-research` | Deep research agent |
| `infinite-agentic-loop` | Parallel agent loop POC |
| `AutoAgent` | Zero-code agent framework |
| `MAXX-Video-Agent` | Video understanding agent |
| `Agentic-AIGC-MAXX-EDITS` | Video generation pipeline |
| `continue-claude-agent` | IDE coding agents |
| `Darya-designs` | DARYA design assets |
| `synthia` | SYNTHIA voice config |
| `VisionClaw` | Computer vision pipeline |
| `archonx-os` | ArchonX OS framework |

## Meeting Place

**GPT-Agent-im-ready** is the official meeting place for all agents (Pauli's Place).  
Create GitHub Issues with the `meeting-request` label to schedule meetings.

## Quick Start

```bash
# Dev
npm run dev          # Vite :5173 + Express :8787

# Docker
docker-compose up    # Full stack

# Deploy
./scripts/deploy-to-hostinger.ps1  # Windows
./scripts/deploy-to-hostinger.sh   # Linux
```
