# Agent-to-Agent (A2A) Protocol

Provides shared schemas, adapters, and routing helpers that allow agents to communicate using the unified envelope format.

## Modules

- `schemas/envelope.schema.json`: JSON Schema definition for the envelope.
- `adapters/nats.ts`: NATS transport adapter that handles subscription lifecycle and deduplication.
- `adapters/redis.ts`: Redis Streams fallback adapter with polling loop.
- `router.ts`: Minimal LemonAI router helper for emitting validated envelopes.
