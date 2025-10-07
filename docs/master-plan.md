# Multi-Agent Platform Master Plan

This document tracks the high-level deliverables required to build the Lovable Cloud powered, Coolify-deployable multi-agent
platform described in the specification.

## Workstreams

1. **Command Surfaces & Telemetry**
   - Replace toast-based interactions with streaming calls into the edge agent.
   - Normalize task/log persistence so every client (web, desktop, mobile) reflects the same telemetry feed.

2. **Agent Runtime & A2A Transport**
   - Implement the JSON schema defined in `a2a/schemas/envelope.schema.json` using a type-safe validation layer.
   - Provision NATS/Redis transports and connect the LemonAI orchestrator to its personas.

3. **Tool Integrations & MCP Registry**
   - Harden wrappers for Open Interpreter, Playwright, Rube MCP, Firecrawl, filesystem, email, calendar, and payment services.
   - Surface one-click activation flows in the integrations dashboard.

4. **Workflow Engine**
   - Attach declarative triggers (cron, storage, webhook) to workflow execution.
   - Persist run metadata and surface history in the UI.

5. **Cross-Platform Clients**
   - Build a Tauri desktop shell and Expo mobile application that share the Shadcn design system.
   - Provide offline/local-runner fallbacks for air-gapped execution.

6. **Deployment & Observability**
   - Package all services as Docker images for Coolify/Contabo deployments.
   - Add CI/CD pipelines, environment bootstrapping docs, and observability dashboards.

## Next Steps

- Flesh out package manifests for each workspace (e.g., `packages/ui`, `packages/sdk`).
- Port existing Supabase-dependent dashboards to the new persistence APIs.
- Begin implementing the A2A router and shared SDK utilities.
