# Agent-to-Agent (A2A) Protocol

This package will house the shared schemas, adapters, and transport utilities that allow every agent runtime to communicate using
the unified envelope format. Downstream services (Edge Functions, local runner, desktop shell, mobile app) should depend on these
types to avoid drift.

## Key Responsibilities

- Maintain JSON Schemas for message envelopes and tool call payloads.
- Provide TypeScript types and validation helpers (e.g., Zod) for runtime safety.
- Expose adapters for NATS subjects and Redis Streams channels so deployments can choose the most appropriate transport.
- Surface testing utilities for end-to-end validation of multi-agent conversations.
