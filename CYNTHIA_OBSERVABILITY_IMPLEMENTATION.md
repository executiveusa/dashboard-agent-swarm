# Cynthia Observability Layer - Implementation Summary

## Overview
Added a **READ-ONLY** observability layer to monitor the external agent "Cynthia" with SSE-based live streaming and session replay capabilities.

## Architecture

### Principles
- **READ-ONLY**: No control or mutation of Cynthia's behavior
- **Secure**: Admin token required for event ingestion, automatic redaction of sensitive data
- **Real-time**: Server-Sent Events (SSE) for live streaming
- **Isolated**: No integration with existing swarm agent logic

---

## Backend Implementation

### 1. Database Schema (`db/migrations/20260129_create_cynthia_telemetry_tables.sql`)

#### Tables Created:

**`agent_sessions`**
- Stores session metadata for Cynthia runs
- Fields: session_id, agent, mode, goal, model, status, started_at, ended_at, metadata
- Supports statuses: active, completed, failed, paused

**`agent_events`**
- Stores individual telemetry events
- Fields: session_id, agent, event_type, summary, data (JSONB), timestamp
- Foreign key to agent_sessions with CASCADE delete

#### Features:
- Comprehensive indexes for performance
- PostgreSQL NOTIFY triggers for real-time streaming (`agent_events_changes` channel)
- Auto-updating `updated_at` timestamp on sessions
- JSONB support for flexible event data

### 2. Redaction Middleware (`backend/server/src/lib/redaction.ts`)

#### Capabilities:
- **Pattern-based detection**: API keys, tokens, JWT, AWS keys, secrets
- **Key-based filtering**: Removes values for sensitive field names
- **Recursive processing**: Handles nested objects and arrays
- **Admin token validation**: `requireAdminToken()` middleware

#### Redacted Patterns:
- API keys and tokens (Bearer, JWT, etc.)
- AWS access keys (AKIA...)
- Hex secrets (40+ chars)
- Base64 encoded secrets
- Common secret field names (password, apiKey, token, etc.)

### 3. Telemetry Routes (`backend/server/src/routes/telemetry.ts`)

#### Endpoints:

**POST /api/telemetry/event** (Admin token required)
- Receives telemetry events from Cynthia
- Auto-creates/updates session
- Applies redaction middleware
- Returns: inserted event with ID

**POST /api/telemetry/session** (Admin token required)
- Updates session metadata (mode, goal, model, status)
- Upserts session data
- Returns: updated session

**GET /api/telemetry/stream** (Public)
- Server-Sent Events (SSE) live stream
- Broadcasts new events in real-time
- Uses PostgreSQL LISTEN/NOTIFY
- Heartbeat keepalive

**GET /api/telemetry/sessions** (Public)
- Lists sessions with pagination (limit: 1-100, default: 20)
- Filters: agent, status
- Includes event count per session
- Returns: sessions array

**GET /api/telemetry/sessions/:id/events** (Public)
- Session replay - retrieves all events for a session
- Ordered by timestamp ASC
- Returns: session metadata + events array

**GET /api/telemetry/events** (Public)
- Lists recent events across all sessions
- Filters: session_id, agent, type
- Pagination (limit: 1-500, default: 100)
- Returns: events with session context

### 4. Server Integration (`backend/server/src/index.ts`)
- Registered telemetry routes
- Applied admin token middleware to mutation endpoints
- Compatible with existing CORS and error handling

---

## Frontend Implementation

### 1. API Service (`src/services/cynthiaTelemetry.ts`)

#### TypeScript Interfaces:
- `TelemetryEvent`: Event structure with id, session_id, type, summary, data, timestamp
- `AgentSession`: Session structure with mode, goal, model, status
- `ListSessionsParams`, `ListEventsParams`: Query parameters

#### API Methods:
- `listSessions(params)`: Get session list
- `getSessionEvents(sessionId, params)`: Retrieve events for session replay
- `listEvents(params)`: Get recent events across sessions
- `subscribeToEventStream(onEvent, onError)`: SSE subscription with cleanup

#### Utility Functions:
- `formatTimestamp()`: Human-readable relative time (e.g., "2h ago", "just now")
- `getEventTypeStyle()`: Icon and color mapping for event types

### 2. UI Components

#### CynthiaStateCard (`src/components/cynthia/CynthiaStateCard.tsx`)
- 4-panel status overview
- Displays: Status (with pulse animation), Mode, Model, Current Goal
- Color-coded status badges
- Live indicator badge when streaming
- Empty state handling

#### CynthiaTimeline (`src/components/cynthia/CynthiaTimeline.tsx`)
- Vertical timeline with visual event cards
- Auto-scroll support for live mode
- Expandable event data (JSON details)
- Event type icons and badges
- Timeline connector lines
- Highlights most recent event

### 3. Main Page (`src/pages/CynthiaWatch.tsx`)

#### Features:
- Session selector dropdown
- Live/Replay mode toggle
- Real-time SSE streaming when live
- Auto-selects most recent active session
- Refresh control
- Live streaming indicator
- Informational footer about READ-ONLY nature

#### State Management:
- React hooks for sessions, events, live mode
- Toast notifications for errors and status changes
- Automatic cleanup of SSE connections

### 4. Routing (`src/App.tsx`)
- Added route: `/agents/cynthia/watch`
- Imported CynthiaWatch component

### 5. Navigation (`src/components/AppSidebar.tsx`)
- Added "Cynthia Watch" nav item with Eye icon
- Positioned under "Agents" section

---

## Event Contract

### Required Fields:
```typescript
{
  session_id: string;     // External session identifier
  agent: string;          // Default: "cynthia"
  type: string;           // Event type (tool_call, reasoning, state_change, error, etc.)
  summary?: string;       // Safe reasoning summary (redacted)
  data: object;           // Event payload (redacted)
  timestamp?: string;     // ISO 8601 datetime (optional, defaults to now())
}
```

### Supported Event Types:
- `tool_call`: Tool/function executions
- `reasoning`: Agent thinking/planning
- `state_change`: Mode/status changes
- `error`: Error events
- `warning`: Warning events
- `success`: Success events
- `info`: Informational events

---

## Security Features

1. **Admin Token Authentication**
   - POST endpoints require `X-Admin-Token` header
   - Token configurable via `ADMIN_TOKEN` env var
   - Default: `dev-admin-token-change-in-production`

2. **Automatic Redaction**
   - Pattern matching for API keys, tokens, secrets
   - Field name filtering (apiKey, password, token, etc.)
   - Recursive object/array processing
   - Applied before database storage

3. **Read-Only Public Endpoints**
   - GET endpoints are public (no mutation possible)
   - No control surface for Cynthia agent
   - Observability only

---

## Deployment Considerations

### Database Migration
Run the migration before deploying:
```bash
psql $DATABASE_URL -f db/migrations/20260129_create_cynthia_telemetry_tables.sql
```

### Environment Variables
```bash
# Required (existing)
DATABASE_URL=postgresql://...
CORS_ORIGIN=http://localhost:5174,http://localhost:8080

# Optional (new)
ADMIN_TOKEN=your-secure-admin-token-here  # Change in production!
```

### Docker Compose Compatibility
- No changes required to `docker-compose.yml`
- Uses existing PostgreSQL service
- Backend image includes new routes automatically
- Frontend build includes new pages/components

### Breaking Changes
**None** - Fully backward compatible

---

## API Usage Examples

### Sending Events (from Cynthia)
```bash
curl -X POST http://localhost:8787/api/telemetry/event \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: dev-admin-token-change-in-production" \
  -d '{
    "session_id": "cynthia-session-123",
    "agent": "cynthia",
    "type": "tool_call",
    "summary": "Calling web search tool for latest AI news",
    "data": {
      "tool": "web_search",
      "query": "latest AI developments 2026"
    }
  }'
```

### Updating Session
```bash
curl -X POST http://localhost:8787/api/telemetry/session \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: dev-admin-token-change-in-production" \
  -d '{
    "session_id": "cynthia-session-123",
    "agent": "cynthia",
    "mode": "research",
    "goal": "Find latest AI papers",
    "model": "gpt-4",
    "status": "active"
  }'
```

### Streaming Events (Frontend)
```typescript
import { subscribeToEventStream } from '@/services/cynthiaTelemetry';

const unsubscribe = subscribeToEventStream(
  (event) => console.log('New event:', event),
  (error) => console.error('Stream error:', error)
);

// Cleanup on unmount
return () => unsubscribe();
```

---

## File Changes Summary

### New Files (11)
1. `db/migrations/20260129_create_cynthia_telemetry_tables.sql` - Database schema
2. `backend/server/src/lib/redaction.ts` - Redaction middleware
3. `backend/server/src/routes/telemetry.ts` - API routes
4. `src/services/cynthiaTelemetry.ts` - Frontend API client
5. `src/components/cynthia/CynthiaStateCard.tsx` - State panel component
6. `src/components/cynthia/CynthiaTimeline.tsx` - Event timeline component
7. `src/pages/CynthiaWatch.tsx` - Main observability page
8. `CYNTHIA_OBSERVABILITY_IMPLEMENTATION.md` - This document

### Modified Files (3)
1. `backend/server/src/index.ts` - Route registration
2. `src/App.tsx` - Route configuration
3. `src/components/AppSidebar.tsx` - Navigation item

---

## Testing Checklist

- [ ] Run database migration
- [ ] Start backend server
- [ ] Verify endpoints respond:
  - [ ] GET /api/telemetry/sessions
  - [ ] GET /api/telemetry/events
  - [ ] GET /api/telemetry/stream (SSE)
- [ ] Test admin token authentication on POST endpoints
- [ ] Send test event via curl/Postman
- [ ] Verify event appears in database
- [ ] Verify redaction working (test with apiKey field)
- [ ] Frontend: Navigate to /agents/cynthia/watch
- [ ] Frontend: Verify session selector works
- [ ] Frontend: Test live streaming mode
- [ ] Frontend: Test session replay

---

## Next Steps

1. **Configure Admin Token**: Set `ADMIN_TOKEN` env var in production
2. **Run Migration**: Apply database schema changes
3. **Deploy Services**: Backend + Frontend with new code
4. **Integrate Cynthia**: Configure Cynthia to send events to `/api/telemetry/event`
5. **Monitor**: Access dashboard at `/agents/cynthia/watch`

---

## Status

✅ **CYNTHIA OBSERVABILITY LAYER READY**

- Database schema created
- Backend API fully implemented
- Frontend dashboard complete
- Security measures in place
- No breaking changes
- Docker-compatible
- Ready for deployment
