# Steve Yegge's Agent Architecture - Integration Analysis

## Executive Summary

Steve Yegge has built a **complete multi-agent orchestration ecosystem** with 5 key components that work together. Our current dashboard is missing ALL of these integrations, which is why it's just a UI shell with mock data.

---

## The 5 Core Components

### 1. **Beads** - The Memory System
- **Purpose**: Git-backed issue tracker optimized for AI agents
- **Tech**: Go, SQLite cache, JSONL storage in `.beads/`
- **Key Feature**: Issues are versioned/branched/merged like code
- **Data Format**: JSON output for agent compatibility
- **IDs**: Hash-based collision-proof (e.g., `bd-a1b2`)
- **Dependencies**: Tracks blocking relationships, priorities (P0-P3)

**Why it matters**: This is the **persistent memory** that prevents agents from losing context. It's NOT markdown plans - it's a structured dependency graph.

### 2. **Gas Town** - The Multi-Agent Orchestrator
- **Purpose**: Coordinates 20-30 Claude Code instances simultaneously
- **Tech**: Go, Git worktrees for persistence, Tmux
- **Hierarchy**:
  - **Mayor**: Primary AI coordinator
  - **Rigs**: Project containers (git repos)
  - **Polecats**: Ephemeral worker agents
  - **Hooks**: Git worktree-based persistent storage
  - **Convoys**: Work tracking bundles

**Key Commands**:
```bash
gt install ~/gt --git          # Initialize workspace
gt rig add <name> <repo>       # Add project
gt sling <bead-id> <rig>       # Assign work to agent
gt convoy create <name>        # Bundle related work
gt agents                      # List active agents
gt convoy list                 # Show progress
```

**Why it matters**: This solves the "agents stepping on each other" problem. It's the **orchestration layer** our dashboard needs.

### 3. **MCP Agent Mail** - The Communication Layer
- **Purpose**: "Gmail for agents" - asynchronous coordination
- **Tech**: Python FastMCP server, SQLite + FTS5, Git-backed markdown
- **Protocol**: HTTP-only MCP (Model Context Protocol)

**Core Features**:
- Agent identities (e.g., "GreenCastle")
- Threaded conversations (grouped by bead IDs)
- File reservations (advisory locks with TTL)
- Full-text search (prevents token exhaustion)
- Web UI built-in at `/mail`

**API Tools**:
- `register_agent()` - establish identity
- `send_message()` - post to threads
- `fetch_inbox()` - retrieve messages
- `acknowledge_message()` - mark read
- `file_reservation_paths()` - claim edit rights

**Storage**:
- Git: `messages/YYYY/MM/{id}.md`, `agents/mailboxes/{agent}/inbox.md`
- SQLite: Indexed for rapid search

**Why it matters**: This enables **agent-to-agent communication** without human liaison. Agents can coordinate, share context, and avoid conflicts.

### 4. **VC (VibeCoder v2)** - The AI Supervisor
- **Purpose**: AI-orchestrated coding agent colony
- **Tech**: Go, Claude Sonnet 4.5 as supervisor, Beads for issues
- **Philosophy**: "Build a colony of ants, not the world's largest ant"

**Workflow Loop**:
1. Atomic task claiming (SQLite prevents duplicates)
2. AI assessment (strategy, steps, risks)
3. Agent execution
4. AI analysis (extract discovered work/bugs)
5. Auto-issue creation
6. Quality gates (tests, linting, build)
7. AI resolution decision

**Key Stats** (from dogfooding):
- 254 issues closed
- 90.9% quality gate pass rate
- 24 successful missions

**Why it matters**: This is the **intelligent supervisor** that prevents agents from drowning in context. It breaks work into atomic tasks and auto-creates issues for discovered problems.

### 5. **eFrit** - The Emacs Agent
- **Purpose**: Native elisp coding agent in Emacs
- **Tech**: Emacs Lisp, Claude integration, MCP support
- **Interfaces**: `efrit-chat`, `efrit-do`, `efrit-agent`
- **Tools**: 35+ tools (elisp, shell, file editing, git, etc.)

**MCP Integration**: File-based JSON queues in `.efrit/queues/`
- Request types: eval, command, chat, status
- Enables AI-to-AI communication

**Why it matters**: This shows that **agents can run in different environments** (not just web). The file-based queue system is genius for integration.

---

## How They Work Together

```
┌─────────────────────────────────────────────────────────────┐
│                         Dashboard UI                         │
│  (Monitor, visualize, control - what we're building)        │
└────────────────────┬────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌────────┐   ┌──────────────┐   ┌─────────────┐
│   VC   │   │  Gas Town    │   │  MCP Mail   │
│ (AI    │   │ (Multi-agent │   │ (Agent      │
│ Super- │   │ orchestrator)│   │ comms)      │
│ visor) │   │              │   │             │
└───┬────┘   └──────┬───────┘   └──────┬──────┘
    │               │                   │
    └───────────────┼───────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │     Beads     │
            │  (Git-backed  │
            │  issue DB)    │
            └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │   Git Repos   │
            │  (Code + Work │
            │   History)    │
            └───────────────┘
```

**Data Flow**:
1. **VC** supervises the workflow, creates/closes issues in **Beads**
2. **Gas Town** assigns Beads issues to agents via `gt sling`
3. **Agents** use **MCP Mail** to coordinate and reserve files
4. **Beads** tracks all work in Git-backed storage
5. **Dashboard** monitors all of the above

---

## What Our Dashboard Should Do

### Phase 1: Monitor the Ecosystem (READ-ONLY)

1. **Beads Integration**
   - Parse `.beads/beads.db` SQLite database
   - Display issue graph with dependencies
   - Show `bd ready` tasks (unblocked work)
   - Visualize priority distribution (P0-P3)

2. **Gas Town Integration**
   - Execute `gt agents` to list active agents
   - Execute `gt convoy list` to show progress
   - Parse rig configurations from `settings/config.json`
   - Display work assignments (which bead → which agent)

3. **MCP Mail Integration**
   - Read SQLite database for message index
   - Display agent inboxes (parse markdown from Git)
   - Show file reservations (who's editing what)
   - Visualize message threads by bead ID

4. **VC Integration**
   - Query Beads database for VC-managed issues
   - Display quality gate metrics (90.9% pass rate)
   - Show mission completion stats
   - Track discovered issues (auto-created by AI)

### Phase 2: Control Interface (WRITE)

1. **Issue Management**
   - Create beads: `bd create "Title" -p 0`
   - Set dependencies: `bd dep add <child> <parent>`
   - Update priorities

2. **Work Assignment**
   - Assign work: `gt sling <bead-id> <rig>`
   - Create convoys: `gt convoy create <name>`
   - Override agent runtime: `gt sling <id> <rig> --agent cursor`

3. **Agent Communication**
   - Send high-priority messages via MCP Mail
   - Use "Human Overseer Composer" to pause agents
   - Monitor file reservation conflicts

4. **Quality Control**
   - View quality gate results
   - Trigger reruns on failed gates
   - Review AI supervisor decisions

### Phase 3: Analytics & Intelligence

1. **Work Distribution**
   - Which agents handle which types of tasks
   - Bottleneck identification (most-blocking issues)
   - Velocity metrics (issues closed per day)

2. **Communication Patterns**
   - Most active message threads
   - Agent collaboration frequency
   - File conflict hotspots

3. **Quality Trends**
   - Quality gate pass rates over time
   - Test coverage evolution
   - AI supervisor confidence scores

---

## Integration Architecture

### Option A: Wrapper APIs (Recommended)

Create a backend service that wraps the CLI tools:

```
Dashboard Frontend → Backend API → CLI Wrappers
                                   ├── bd (Beads)
                                   ├── gt (Gas Town)
                                   └── MCP Mail HTTP API

Direct DB Access:
Dashboard Backend → SQLite Queries
                    ├── .beads/beads.db
                    ├── gastown convoy DB
                    └── MCP Mail messages DB
```

**Pros**: Clean separation, no tool modifications
**Cons**: Potential performance overhead

### Option B: Direct Integration

Fork/extend the tools to expose programmatic APIs:

```
Dashboard → Go Libraries
            ├── import "github.com/steveyegge/beads/pkg"
            ├── import "github.com/steveyegge/gastown/pkg"
            └── HTTP to MCP Mail (already HTTP-based)
```

**Pros**: Native performance, type safety
**Cons**: Maintenance burden, divergence from upstream

### Option C: Hybrid (BEST)

- **Beads**: Direct SQLite queries (read), CLI for writes
- **Gas Town**: CLI wrappers + config file parsing
- **MCP Mail**: Direct HTTP API (already designed for this)
- **VC**: Beads queries + quality gate log parsing

---

## What's Currently Missing in Our Dashboard

| Component | Steve Yegge Has | We Have | Gap |
|-----------|----------------|---------|-----|
| **Issue Tracking** | Beads (Git-backed, agent-optimized) | Mock tasks in `yappDashboard.ts` | No real task system |
| **Agent Orchestration** | Gas Town (20-30 agents) | Hardcoded "Agent Zero" | No multi-agent support |
| **Agent Communication** | MCP Mail (threaded, searchable) | Nothing | No coordination layer |
| **AI Supervision** | VC (breaks work, creates issues) | Nothing | No intelligent orchestration |
| **Persistent Memory** | Beads dependency graph | Nothing | Agents have no memory |
| **Quality Gates** | 90.9% pass rate tracking | Nothing | No validation |
| **Real-time Status** | `gt agents`, convoy tracking | Mock metrics | No real monitoring |

---

## Recommended Implementation Plan

### Milestone 1: Beads Integration (Foundation)
**Goal**: Replace mock tasks with real Beads issues

**Tasks**:
1. Add Beads as dependency (`go install` or npm wrapper)
2. Initialize `.beads/` in dashboard project
3. Create backend routes:
   - `GET /api/beads/ready` → `bd ready` output
   - `GET /api/beads/show/:id` → `bd show` output
   - `POST /api/beads/create` → `bd create` wrapper
   - `GET /api/beads/graph` → dependency visualization
4. Update frontend to display real Beads data
5. Replace `TaskMonitor` with Beads issue list

**Validation**: Dashboard shows real issues from `.beads/beads.db`

### Milestone 2: Gas Town Integration (Orchestration)
**Goal**: Monitor and control multi-agent assignments

**Tasks**:
1. Install Gas Town: `brew install gastown` or `go install`
2. Initialize workspace: `gt install ~/dashboard-agents --git`
3. Add dashboard repo as rig: `gt rig add dashboard .`
4. Create backend routes:
   - `GET /api/gastown/agents` → `gt agents` output
   - `GET /api/gastown/convoys` → `gt convoy list` output
   - `POST /api/gastown/sling` → `gt sling` wrapper
   - `GET /api/gastown/config/:rig` → parse `settings/config.json`
5. Create "Agent Orchestration" dashboard page
6. Add convoy progress visualization

**Validation**: Dashboard shows active agents and their assigned work

### Milestone 3: MCP Mail Integration (Communication)
**Goal**: Display agent messages and coordination

**Tasks**:
1. Install MCP Agent Mail: `pip install mcp-agent-mail`
2. Start MCP server: `mcp-agent-mail serve`
3. Create backend proxy to MCP HTTP API:
   - `GET /api/mail/inbox/:agent` → MCP resource
   - `GET /api/mail/thread/:id` → MCP thread view
   - `POST /api/mail/send` → MCP send_message
   - `GET /api/mail/reservations` → file reservation list
4. Create "Agent Communication" dashboard page
5. Add inbox viewer, thread display, file reservation panel

**Validation**: Dashboard shows agent messages from MCP Mail

### Milestone 4: VC Integration (AI Supervision)
**Goal**: Monitor AI supervisor decisions and quality gates

**Tasks**:
1. Install VC: `go install github.com/steveyegge/vc`
2. Configure VC to use dashboard's Beads database
3. Create backend routes:
   - `GET /api/vc/missions` → completed mission stats
   - `GET /api/vc/quality-gates` → pass/fail metrics
   - `GET /api/vc/discovered-issues` → auto-created beads
4. Create "AI Supervision" dashboard page
5. Add quality trend charts, mission timeline

**Validation**: Dashboard shows VC supervisor activity

### Milestone 5: Real Agent Execution
**Goal**: Actually run coding agents, not mocks

**Options**:
- **Option A**: Integrate with existing agents (Claude Code, Codex, Cursor)
- **Option B**: Build custom agent using `modelRouter.ts` + MCP
- **Option C**: Use Gas Town's agent runtime system

**Tasks** (Option B example):
1. Create agent execution service using existing `safeLlmCall`
2. Register agents in MCP Mail: `register_agent("DashboardAgent")`
3. Implement work loop:
   - Fetch assigned bead from Gas Town
   - Execute task using LLM + tools
   - Report results to MCP Mail
   - Update bead status
4. Add agent logs to dashboard

**Validation**: Dashboard shows real agent executing real tasks

---

## Critical Decisions Needed

### 1. **Which tools do we integrate first?**
   - Recommendation: Beads → Gas Town → MCP Mail → VC
   - Rationale: Build from foundation (memory) upward

### 2. **Where do we run the agents?**
   - On the dashboard server?
   - On user machines?
   - Cloud workers?

### 3. **What's the primary use case?**
   - Monitor existing agents?
   - Control agent swarms?
   - Build new agents?
   - All of the above?

### 4. **Do we fork Steve's tools or wrap them?**
   - Recommendation: Wrap with CLI + direct SQLite queries
   - Rationale: Stay compatible with upstream updates

### 5. **Backend architecture - keep two servers?**
   - Current: `/server/` (Hono) + `/backend/server/` (Express)
   - Recommendation: Consolidate to single Express server
   - Rationale: Simplify deployment, share database connections

---

## Next Steps

1. **Answer the Critical Decisions** (requires your input)
2. **Install Steve's tools locally** to verify they work
3. **Create Beads integration** (Milestone 1)
4. **Test with real agents** (assign yourself a bead, see if it works)
5. **Iterate** based on real usage

---

## Conclusion

Steve Yegge has solved ALL the problems we're facing:
- ✅ Multi-agent orchestration (Gas Town)
- ✅ Persistent memory (Beads)
- ✅ Agent communication (MCP Mail)
- ✅ AI supervision (VC)
- ✅ Quality control (VC quality gates)

Our dashboard is currently a **UI without a brain**. By integrating these tools, we get:
- Real task tracking
- Multi-agent coordination
- Persistent context
- Intelligent work distribution
- Quality assurance

**The architecture is sound. We just need to wire it up.**

Ready to start Milestone 1 (Beads integration)?
