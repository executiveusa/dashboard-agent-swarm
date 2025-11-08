# Dashboard Agent Swarm – Copilot Guide

## Architecture quick map
- Web dashboard: Vite + React + TypeScript under `src/`. Routes live in `src/pages`, composite widgets under `src/components`, and shadcn primitives in `src/components/ui`.
- Desktop shell: Electron sources in `desktop/` (main/preload) and `desktop-shell/` (proxy helpers). Scripts in `package.json` orchestrate Vite + Electron dev loops.
- Backend workspace: `backend/` contains edge functions (`functions/`) and a separate Express-like server (`server/src`). Review `backend/package.json` for duplicate script definitions before editing.
- Shared agent SDK: `ai-agent-platform/` is a pnpm workspace; `packages/shared` exports hooks/types consumed by the web app. Tests run from this subtree.
- Infrastructure configs: `deploy/` contains Docker Compose variants, `configs/environments/*.yaml` feed `scripts/provision.mjs`, and Supabase migrations live under `supabase/migrations`.

## Data & messaging patterns
- Real-time telemetry (tasks/logs) flows through `src/integrations/data-service/`. Use `useRealtimeCollection` plus helpers like `fetchRecentTasks` and `subscribeToTaskStream`; they wrap EventSource + REST snapshot logic and honor `VITE_API_BASE_URL`.
- Agent conversations rely on `useAgentMessaging` from `@ai-agent-platform/shared`. Provide an SSE-capable endpoint (defaults to the Supabase edge function) and pass the shared Supabase client when you need persistence.
- Analytics queries use Supabase SQL views (`structured_event_rollups`, `grafana_metrics`) via `@tanstack/react-query`. Keep queries colocated with pages and memoize derived datasets as in `src/pages/Analytics.tsx`.

## UI and styling conventions
- Tailwind tokens are centralized in `src/index.css` (HSL palette, gradients, glow shadows). Favor semantic utility combos (`bg-gradient-primary`, `shadow-glow-primary`) instead of re-declaring colors.
- Components expect Lucide icons and `recharts` for charts. When creating new cards or panels, follow the patterns in `src/components/AgentStatus.tsx` and `TaskMonitor.tsx` (Card wrappers, badge variants, font-mono for metrics).
- Keep logic out of JSX where possible—derive values with `useMemo`/`useCallback`, and surface props for data injection to encourage reuse in desktop or future surfaces.

## Tooling and commands
- Install dependencies with `npm install` (root uses npm, the AI platform subtree uses pnpm via scripts).
- Development: `docker compose up -d` (Flowise), `npm run dev` (Vite with proxy), `npm run desktop:dev` for Electron, and `npm run desktop:build` to package.
- Quality gates: `npm run lint`, `npm run build`, and `npm run test` which runs `corepack pnpm --dir ai-agent-platform test -- --run`. Mind that vitest projects live inside the pnpm workspace.
- Environment provisioning: `node scripts/provision.mjs <environment>` writes temp env files, runs Supabase migrations (if configured), then injects secrets via `lovable-tagger`.

## Environment & secrets
- Duplicate keys in `.env.example` reflect Flowise + Lovable expectations; ensure `VITE_API_BASE_URL`, Flowise ports, and all provider keys are filled before running the stack.
- Frontend Supabase access requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the agent edge function also checks `VITE_AGENT_ENDPOINT` when overriding defaults.
- Keep secrets out of source—`.gitignore` already excludes `.env`, and provisioning scripts handle encrypted injection.

