# Agent-to-Agent Communication Protocol

> **Version**: v1.0 — 2026-02-16  
> **Status**: Active  
> **Scope**: All agents in the executiveusa fleet  

## 1. Message Envelope

Every agent-to-agent message MUST use this JSON envelope:

```json
{
  "protocol": "agent-fleet-v1",
  "id": "msg-uuid-v4",
  "timestamp": "2026-02-16T00:00:00.000Z",
  "from": {
    "agent_id": "devika",
    "codename": "DVK-002",
    "repo": "executiveusa/devika-agent"
  },
  "to": {
    "agent_id": "alex",
    "codename": "ALX-003",
    "repo": "executiveusa/MetaGPT"
  },
  "type": "task|status|query|response|meeting|heartbeat|alert|handoff",
  "priority": "critical|high|normal|low",
  "payload": {},
  "context": {
    "session_id": "session-uuid",
    "parent_message_id": null,
    "thread_id": "thread-uuid"
  },
  "metadata": {
    "acip_compliant": true,
    "caut_logged": true,
    "openclaw_heartbeat": "devika-002"
  }
}
```

## 2. Message Types

### TASK — Assign work to an agent
```json
{
  "type": "task",
  "payload": {
    "title": "Build Pauli's Place chat room UI",
    "description": "Create a real-time messaging interface...",
    "prompt_id": 4,
    "prompt_name": "Stripe-Level UI",
    "deadline": "2026-02-17T00:00:00Z",
    "acceptance_criteria": ["real-time messaging", "agent avatars", "dark theme"],
    "assigned_by": "devika"
  }
}
```

### STATUS — Report task progress
```json
{
  "type": "status",
  "payload": {
    "task_id": "task-uuid",
    "status": "not_started|in_progress|blocked|review|completed|failed",
    "progress_pct": 75,
    "message": "Frontend complete, wiring WebSocket connection",
    "blockers": [],
    "artifacts": ["src/pages/MeetingRoom.tsx"]
  }
}
```

### QUERY — Ask another agent a question
```json
{
  "type": "query",
  "payload": {
    "question": "What port is the WebSocket gateway running on?",
    "context": "Building the meeting room client connection",
    "urgency": "normal"
  }
}
```

### RESPONSE — Answer a query
```json
{
  "type": "response",
  "payload": {
    "query_id": "msg-uuid-of-query",
    "answer": "OpenClaw WebSocket gateway runs on port 18789",
    "confidence": 1.0,
    "sources": ["clawdbot-Whatsapp-agent/openclaw/gateway.js"]
  }
}
```

### MEETING — Meeting-related messages
```json
{
  "type": "meeting",
  "payload": {
    "meeting_type": "standup|architecture|sprint-planning|retrospective|emergency",
    "location": "paulis-place",
    "github_issue": "https://github.com/executiveusa/GPT-Agent-im-ready/issues/42",
    "attendees": ["devika", "alex", "darya", "synthia"],
    "agenda": ["review sprint progress", "assign next tasks"],
    "notes": "...",
    "action_items": [
      {"agent": "alex", "task": "finish API endpoint", "deadline": "2026-02-17"}
    ]
  }
}
```

### HEARTBEAT — Agent health check
```json
{
  "type": "heartbeat",
  "payload": {
    "agent_id": "alex",
    "status": "healthy|degraded|offline",
    "uptime_seconds": 86400,
    "current_task": "task-uuid or null",
    "load": 0.45,
    "last_error": null,
    "openclaw_connected": true
  }
}
```

### ALERT — Something needs attention
```json
{
  "type": "alert",
  "payload": {
    "severity": "critical|warning|info",
    "title": "Agent ClawdBot is unresponsive",
    "details": "No heartbeat for 5 minutes",
    "recommended_action": "restart clawdbot container",
    "auto_escalate_to": "devika"
  }
}
```

### HANDOFF — Transfer a conversation/task between agents
```json
{
  "type": "handoff",
  "payload": {
    "reason": "voice call needs text follow-up",
    "from_agent": "synthia",
    "to_agent": "clawdbot",
    "conversation_context": {
      "caller": "+1-555-0123",
      "summary": "Interested in AI agency services, wants pricing",
      "lead_score": 8,
      "sentiment": "positive"
    },
    "instructions": "Send WhatsApp follow-up with pricing deck"
  }
}
```

## 3. Transport Channels

| Channel | Use Case | Format |
|---------|----------|--------|
| **OpenClaw WebSocket** (:18789) | Real-time messaging, heartbeats | JSON envelope |
| **HTTP/REST** | Synchronous requests, task assignment | JSON envelope |
| **MCP** | Tool calls between agents | MCP standard |
| **GitHub Issues** | Meeting scheduling, async discussion | Issue body + labels |
| **Redis Pub/Sub** | Event broadcasting | JSON envelope |

## 4. Routing Rules

```
User Request → archon-os → Agent Zero → Devika (Lead Delegator)
                                              ↓
                                      Devika decides:
                                              ↓
            ┌──────────┬──────────┬──────────┬──────────┐
            ↓          ↓          ↓          ↓          ↓
          Alex      DARYA    SYNTHIA    ClawdBot    Cynthia
        (code)   (creative)  (voice)    (chat)    (safety)
```

## 5. Pauli Monitoring Protocol

Pauli receives ALL messages on ALL channels. He does not respond unless:
1. An agent is consistently failing to meet goals
2. An emergency alert is triggered
3. The user explicitly summons Pauli
4. Financial targets are at risk

Pauli's monitoring is **passive** — agents should NOT address messages to Pauli.
Pauli reads the firehose and acts only when necessary.

## 6. Meeting Protocol (Pauli's Place)

1. Any agent can request a meeting by creating a GitHub Issue in `GPT-Agent-im-ready`
2. Issue must have one of the meeting type labels
3. Devika reviews and approves meeting requests
4. During meetings, agents post messages via the real-time chat interface
5. Meeting notes are auto-generated and posted as Issue comments
6. Action items are extracted and assigned via TASK messages
7. Pauli's avatar does NOT appear unless user requests

## 7. OpenClaw Heartbeat Standard

Every agent MUST send a heartbeat every 30 seconds:

```json
{
  "protocol": "agent-fleet-v1",
  "type": "heartbeat",
  "from": {"agent_id": "alex", "codename": "ALX-003"},
  "to": {"agent_id": "broadcast"},
  "payload": {
    "status": "healthy",
    "uptime_seconds": 86400,
    "current_task": null,
    "openclaw_connected": true
  }
}
```

## 8. Error Handling

| Scenario | Response |
|----------|----------|
| Agent doesn't respond in 30s | Retry once, then alert Devika |
| Agent reports "blocked" | Devika reassigns or unblocks |
| Agent reports "failed" | Retry up to 3 times (Ralphy pattern), then escalate |
| Multiple agents fail | Emergency meeting at Pauli's Place |
| Pauli intervenes | All agents halt current tasks and listen |

## 9. Security (ACIP Compliance)

- ALL messages must be ACIP v1.3 compliant
- NO secrets in message payloads — use reference IDs
- ALL agent system prompts include ACIP preamble
- Cynthia audits message content for PII/secrets
- Messages between agents are internal-only — never exposed to users
