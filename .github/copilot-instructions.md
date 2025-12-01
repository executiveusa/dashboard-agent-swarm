# Dashboard Agent Swarm – Copilot Guide

**Purpose:** Make Codex/Copilot productive quickly by mapping workspaces, data flows, environment knobs, and the happy-path commands. Keep edits scoped to the correct workspace (npm in root, pnpm inside `ai-agent-platform`).

## Architecture map
- **Web dashboard:** Vite + React + TypeScript under `src/`; routing in `src/pages`, shared UI in `src/components` with shadcn primitives in `src/components/ui`.
- **Real-time data:** `src/integrations/data-service/client.ts` wraps REST snapshots + SSE via `useRealtimeCollection`; defaults to `VITE_DATA_API_BASE_URL` and exposes `transformSnapshot`/`transformEvent` hooks.
- **Desktop shell:** Electron entry in `desktop/` (main/preload) and helpers in `desktop-shell/`; `npm run desktop:dev` launches Vite then Electron, `desktop:package:win` uses electron-builder outputs at `out/desktop`.
- **Backend:** `backend/` holds edge functions (`functions/`) and a lightweight server (`server/`, `server.mjs`); scripts are duplicated in `backend/package.json`, so prefer explicit targets when adjusting start/build.
- **Agent platform:** `ai-agent-platform/` pnpm workspace (see `package.json` there); `packages/shared` exports hooks/types consumed by the dashboard, and vitest projects live in this subtree.
- **Infra configs:** `deploy/` docker-compose flavors, `configs/environments/*.yaml` feed `scripts/provision.mjs`, Supabase migrations under `supabase/migrations`.

## Data, messaging, and analytics
- Use `useRealtimeCollection` for task/log streams; it merges SSE events with optional custom key selectors and limit handling (see `client.ts`).
- Messaging flows come from `@ai-agent-platform/shared` hooks; provide an SSE-capable endpoint (edge functions by default) and the shared Supabase client when persisting threads.
- Analytics pages typically colocate TanStack Query calls next to pages/components; follow the memoised derived-data patterns used in `src/pages` charts.

## UI, styling, and components
- Tailwind tokens live in `src/index.css` (HSL palette, gradients, glow shadows). Reuse semantic utilities like `bg-gradient-primary`/`shadow-glow-primary` instead of redefining colors.
- Charts use `recharts`; icons are `lucide-react`; cards follow `src/components/AgentStatus.tsx` / `TaskMonitor.tsx` patterns (Card + badge variants, mono fonts for metrics, data passed via props).
- Keep heavy logic in hooks/helpers (`hooks/`, `lib/`) and pass data via props so components can be reused in Electron and web.

## Commands and workflows
- **Install:** `npm install` at repo root; pnpm commands should run via `corepack pnpm --dir ai-agent-platform ...` or the provided scripts.
- **Frontend dev:** `docker compose up -d` (Flowise) then `npm run dev` (Vite proxy to Flowise at `/agents`).
- **Desktop dev/build:** `npm run desktop:dev` to pair Vite + Electron; `npm run desktop:build` compiles renderer + main; `npm run desktop:package:win` bundles via electron-builder.
- **Backend:** `npm run build` inside `backend` for TypeScript output; `node server.mjs` or `npm run dev` for functions (be aware of duplicate `start` definitions).
- **Quality gates:** `npm run lint`, `npm run build`, `npm run test` (delegates to pnpm tests in `ai-agent-platform`).

## Environment and provisioning
- Copy `.env.example` → `.env` and fill Flowise + Supabase keys (`VITE_DATA_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, provider keys). Dashboard defaults to origin when `VITE_DATA_API_BASE_URL` is empty.
- `node scripts/provision.mjs <environment> [--skip-migrations]` reads `configs/environments/<env>.yaml`, applies Supabase migrations if configured, writes a temp env file, then injects secrets via `lovable-tagger`.
- `.gitignore` excludes `.env`; keep secrets out of commits. Duplicate names/scripts in `backend/package.json` are known; avoid adding more divergence.
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

