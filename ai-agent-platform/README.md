# AI Agent Platform Monorepo

A production-ready monorepo that powers a Lovable Cloud edge workforce built on E-I-G-E-N-T multi-agents, Open Interpreter automation, and a Next.js 15 console.

## Project Structure

- `apps/edge` – Lovable Cloud Edge Functions for `/agent`, webhooks, and workflow triggers.
- `apps/frontend` – Next.js 15 console with chat, voice toggle, and workflow catalog.
- `apps/local-runner` – Optional local Open Interpreter proxy for desktop automation.
- `packages/shared` – Shared types, workflow schema, and sample YAML definitions.
- `configs` – Shared TypeScript and ESLint configuration.

## Getting Started

```bash
pnpm install
pnpm -w build
pnpm -w test
```

Copy `.env.example` to `.env` and populate the values. Lovable deployments read environment variables from project settings.

## Lovable Cloud Deployment

1. **Edge Functions**: In `apps/edge`, run `pnpm build` and deploy with the Lovable CLI:
   ```bash
   pnpm --filter apps/edge deploy
   ```
   The `deploy` script echoes the Lovable CLI command (`lovable deploy --project edge`).

2. **Environment Variables**: Provide all variables from `.env.example` in Lovable. Ensure `OI_MODE`, model endpoints, and API keys are set.

3. **Lovable Cloud Services**:
   - Provision a Lovable Cloud project and collect the `LOVABLE_PROJECT_ID`, `LOVABLE_API_KEY`, and base URLs for the control plane (`LOVABLE_API_URL`) and memory fabric (`LOVABLE_MEMORY_URL`).
   - Audit trails, task telemetry, and workflow definitions are synchronized through the Lovable Cloud API—no Supabase schema is required.
   - Optionally, pin a dedicated memory cluster in Lovable Cloud or point to a self-hosted memory node via the provided Docker compose file (see `docker/compose.lovable.yml`).

4. **Cron Triggers**: Use Lovable scheduler to call `/workflows/trigger` with `trigger.type = "cron"` payloads.

## Local Development Notes

### Edge Functions
- `pnpm --filter apps/edge dev` runs Vitest in watch mode for the edge package.
- Invoke functions locally with `pnpm --filter apps/edge test` for unit coverage.

### Next.js Console
- `pnpm --filter apps/frontend dev` boots the Next.js console on port 3000.
- The console proxies `/api/agent` and `/api/workflows` to the edge functions using `NEXT_PUBLIC_EDGE_URL`.

### Local Open Interpreter Runner
1. `pnpm --filter apps/local-runner build` to compile the proxy.
2. `pnpm --filter apps/local-runner start` runs a minimal HTTP server on `http://localhost:3333` that stubs `/tools/code` and `/tools/browser` endpoints.
3. Set `OI_MODE=local` and `LOCAL_OI_PROXY_URL=http://localhost:3333` to route edge functions through the proxy.

## Testing

- `pnpm -w test` runs Vitest suites, including LLM router fallbacks and workflow fan-out logic.
- `pnpm --filter apps/frontend lint` ensures the Next.js app conforms to ESLint configuration.

## Workflows

Sample YAML definitions live in `packages/shared/workflows`:
- `sample-cleanup.yaml`: Storage trigger → DataCleanerAgent → Gmail notification via Rube.
- `sample-firecrawl.yaml`: Manual trigger → Firecrawl crawl → ResearchAgent summary → Notion export.

Use `/workflows/trigger` to execute workflows programmatically or from Lovable cron/webhook events.

## Pre-merge Checklist

Before merging updates to the platform, double-check the following:

1. **Install dependencies** with `pnpm install` (or reuse the existing lockfiles in CI) to ensure no missing packages. In environments with restricted network access, make sure your `.npmrc` provides the correct registry token (e.g. `//registry.npmjs.org/:_authToken=<token>`) before running the install to avoid 403 responses.
2. **Run the workspace build** using `pnpm -w build` to verify every package compiles with the shared TypeScript config.
3. **Execute the Vitest suites** via `pnpm -w test`; confirm router fallbacks and workflow runners still pass.
4. **Lint affected packages** using `pnpm -w lint` so shared style rules remain consistent across the monorepo.
5. **Refresh environment variables** in Lovable Cloud for any new keys added to `.env.example`.

Completing these steps helps guarantee the edge functions, optimizer, and frontend remain production-ready when the branch lands.
