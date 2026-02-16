# Dashboard Agent Swarm — Agent Guide

> **Mission**: Building a Future-Proof Autonomous AI Agent Platform (AI Agency in a Box)  
> **Protocol**: See `AGENT_PROTOCOL.md` for the full fleet protocol  
> **Comms**: See `AGENT_COMMS_PROTOCOL.md` for agent-to-agent JSON envelope standard  
> **Prompts**: See `agent-prompts.md` for the shared 21-prompt library  
> **Souls**: See `.agent-souls/` for each agent's Heart & Soul identity files  
> **Role**: See `ROLE_INSTRUCTIONS.md` for this repo's specific role  

## Project

- DARYA Studio — master control dashboard for all agents
- React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Backend: Express/Node on port 8787, PostgreSQL, Redis, Flowise
- Docker: nginx frontend, node backend, postgres, redis, flowise

## Agent Hierarchy (v2 — Devika Lead Delegator)

```
                    ╔═══════════════════════════════════╗
                    ║   PAULI — Shadow Leader            ║
                    ║   Microsoft Lightning Agent        ║
                    ║   Sees EVERYTHING. Word is LAW.    ║
                    ║   Avatar hidden unless summoned.   ║
                    ╚══════════════╤════════════════════╝
                                   │ (passive monitoring)
                    ╔══════════════╧════════════════════╗
                    ║   archon-os (Operating System)     ║
                    ╚══════════════╤════════════════════╝
                                   │
                    ╔══════════════╧════════════════════╗
                    ║   Agent Zero + SYNTHIA             ║
                    ║   Root Orchestrator                ║
                    ║   agent-zero-Fork                  ║
                    ╚══════════════╤════════════════════╝
                                   │
                    ╔══════════════╧════════════════════╗
                    ║   DEVIKA — Lead Delegator          ║
                    ║   DVK-002 — devika-agent           ║
                    ║   ALL tasks flow through Devika    ║
                    ╚══════════════╤════════════════════╝
                                   │
          ┌────────────┬───────────┼───────────┬────────────┐
          │            │           │           │            │
    ╔═════╧═════╗ ╔════╧════╗ ╔════╧════╗ ╔════╧════╗ ╔════╧════╗
    ║   Alex    ║ ║  DARYA  ║ ║ SYNTHIA ║ ║ClawdBot ║ ║Cynthia  ║
    ║ SOP Dev   ║ ║Creative ║ ║  Voice  ║ ║ Multi-  ║ ║Safety & ║
    ║ MetaGPT   ║ ║Director ║ ║  Agent  ║ ║ Channel ║ ║  OAP    ║
    ╚═══════════╝ ╚════╤════╝ ╚═════════╝ ╚═════════╝ ╚═════════╝
                       │
              ┌────────┼────────┬────────┬────────┐
              │        │        │        │        │
            Maya     Luna   Solana    Vega    Aurora
          (Funds)  (UGC)   (Crypto) (IP)    (KPIs)
```

### Codename Registry

| Agent | Codename | Repo | Role |
|-------|----------|------|------|
| **Pauli** | PLI-000 | GPT-Agent-im-ready / open-agent-platform-pauli | Shadow Leader — Microsoft Lightning Agent. Invisible overseer. Trains, corrects, enforces goals. His word is law. Avatar hidden unless user summons. |
| **Agent Zero** | AZ-001 | agent-zero-Fork | Root Orchestrator — receives tasks from archon-os, routes to Devika |
| **Devika** | DVK-002 | devika-agent | Lead Delegator — ALL tasks flow through her. Assigns, monitors, reports. Works with Alex on complex builds. |
| **Alex** | ALX-003 | MetaGPT | SOP-Driven Dev Company — architecture, multi-agent waterfall, code generation |
| **DARYA vΩ** | DRY-004 | dashboard-agent-swarm | Creative Director — UI/UX, brand, content strategy. Commands the 5 Cuties |
| **SYNTHIA** | SYN-005 | voice-agents-fork | Voice Agent — phone calls, voice interactions, ElevenLabs TTS |
| **ClawdBot** | CLW-006 | clawdbot-Whatsapp-agent | Multi-Channel Messaging — WhatsApp, SMS, Telegram, OpenClaw gateway |
| **Cynthia** | CYN-007 | open-agent-platform-pauli | Observability & Safety — monitors fleet health, ACIP compliance, audits |
| **Maya** | MYA-101 | dashboard-agent-swarm | Fundraising & Donor Relations |
| **Luna** | LNA-102 | dashboard-agent-swarm | UGC & Virality |
| **Solana** | SOL-103 | dashboard-agent-swarm | Crypto & Tokenization |
| **Vega** | VGA-104 | dashboard-agent-swarm | IP & Merch Universe |
| **Aurora** | AUR-105 | dashboard-agent-swarm | Ops & KPI Dashboards |
| **VisionClaw** | VCL-008 | VisionClaw | Computer Vision Pipeline |
| **Bambu Lab** | BMB-009 | (hardware) | 3D Printing & Fabrication |

### Communication Flow

```
User → archon-os → Agent Zero → DEVIKA → assigns to appropriate agent(s)
                                    ↑
                              Pauli watches ALL (passive firehose)
```

### OpenClaw Integration

ALL agents connect to the OpenClaw backbone:
- **WebSocket Gateway**: `ws://localhost:18789` — real-time messaging & heartbeats
- **HTTP Gateway**: `http://localhost:18790` — synchronous requests
- **Heartbeat**: Every 30s, JSON envelope, protocol `agent-fleet-v1`
- **Source**: `clawdbot-Whatsapp-agent/openclaw/` + `agent-zero-Fork/openclaw/`

## Critical Repos (Protocol-Deployed)

| Repo | Agent(s) | Files Deployed |
|------|----------|----------------|
| `dashboard-agent-swarm` | DARYA, Aurora, All | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, AGENT_COMMS_PROTOCOL.md, agent-prompts.md, .agent-souls/, .llm.txt |
| `agent-zero-Fork` | Agent Zero, SYNTHIA | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `MetaGPT` | Alex (SOP-driven dev) | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `GPT-Agent-im-ready` | Pauli (Meeting Place) | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `clawdbot-Whatsapp-agent` | ClawdBot | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `open-agent-platform-pauli` | Pauli (No-code builder) | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `voice-agents-fork` | SYNTHIA | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `devika-agent` | Devika | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |

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

## Shared Prompt Library

All 21 Jeffrey's Prompts are available to ALL agents in `agent-prompts.md`.  
Agents should reference prompts by number (e.g., "Apply Prompt #6 De-Slopifier").

### Prompt Sprint Chains (common combos)
- **Onboarding Sprint**: #13 → #1 → #2 → #12
- **Feature Dev Sprint**: #4 → #7 → #6 → #15
- **Code Health Sprint**: #8 → #9 → #14 → #6
- **Deployment Sprint**: #16 → #21 → #19 → #5
- **Agent Infrastructure Sprint**: #17 → #3 → #11 → #12

## Meeting Place — Pauli's Place

**GPT-Agent-im-ready** is the official meeting place for all agents (Pauli's Place).  
- Create GitHub Issues with the `meeting-request` label to schedule meetings
- Real-time chat interface at `/paulis-place` endpoint
- Meeting types: `standup`, `architecture`, `sprint-planning`, `retrospective`, `emergency`
- Pauli's avatar ONLY appears when the user requests it

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
