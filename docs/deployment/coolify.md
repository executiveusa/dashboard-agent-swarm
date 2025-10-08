# Coolify & Contabo Deployment Guide

This guide explains how to package the Lovable dashboard, Edge runtime, and optional local Open Interpreter runner for Coolify-managed infrastructure or bare Contabo hosts.

## 1. Build Artifacts

Each workspace now has a multi-stage Dockerfile:

| Component | Dockerfile |
| --- | --- |
| Dashboard (Vite UI) | [`./Dockerfile`](../../Dockerfile) |
| Next.js Frontend | [`apps/frontend/Dockerfile`](../../ai-agent-platform/apps/frontend/Dockerfile) |
| Edge Runtime | [`apps/edge/Dockerfile`](../../ai-agent-platform/apps/edge/Dockerfile) |
| Local Runner | [`apps/local-runner/Dockerfile`](../../ai-agent-platform/apps/local-runner/Dockerfile) |

From the repository root you can build production images with `docker build` or `docker buildx bake`. Each image embeds a pruned `pnpm` workspace and copies the compiled artifacts only.

```bash
# Example: build and tag all services locally
DOCKER_BUILDKIT=1 docker build -t lovable/dashboard:dev .
DOCKER_BUILDKIT=1 docker build -t lovable/frontend:dev ai-agent-platform/apps/frontend
DOCKER_BUILDKIT=1 docker build -t lovable/edge:dev ai-agent-platform/apps/edge
DOCKER_BUILDKIT=1 docker build -t lovable/local-runner:dev ai-agent-platform/apps/local-runner
```

> **Browser automation dependencies** – the local runner stage runs `pnpm exec playwright install --with-deps chromium` so Chromium and native libraries ship inside the final image.

## 2. Environment Variables

All services share the following critical settings:

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Supabase project credentials used by the Edge runtime and frontend. |
| `JWT_SECRET` | Secret for signing Edge-issued tokens. |
| `EDGE_BASE_URL` | Public URL for the Edge runtime; surfaced to frontend and dashboard. |
| `OI_MODE` | Use `local` to proxy code/browser tools to the bundled local runner, or `cloud` to call Lovable Edge tools. |
| `LOCAL_OI_PROXY_URL` | Internal URL of the local runner (`http://local-runner:3333`). |
| `OLLAMA_BASE_URL`, `LM_STUDIO_BASE_URL` | Optional local LLM endpoints surfaced to the router. |
| `FIRECRAWL_API_KEY` | API key for Firecrawl-based search. |
| `MCP_SOCKET` | Filesystem socket path exposed for IDE MCP clients. |

The Electron desktop shell reads `DESKTOP_UI_URL`, `LOVABLE_EDGE_URL`, and `LOCAL_RUNNER_URL` to decide which endpoint to load and proxy requests toward.

## 3. Coolify Stack

Coolify can deploy from the `deploy/docker-compose.coolify.yml` manifest. Add a new **Docker Compose application**, supply the repository URL, and set the compose file to `deploy/docker-compose.coolify.yml`.

Key traits of the Coolify stack:

- Uses the local `build` contexts so Coolify can rebuild images when you push new commits.
- Publishes the dashboard on port `8080`, Next.js console on `3000`, the Edge API on `8787`, and the automation runner on `3333`.
- Mounts a shared `mcp-socket` volume so MCP-capable IDEs (Cursor, Windsurf, VS Code MCP client) can talk to the Edge tools through a UNIX socket at `/var/run/mcp/edge.sock`.
- Provides persistent `sandboxes` and `ollama-data` volumes for desktop automation artifacts and LLM caches.

After provisioning, configure the environment variables in Coolify’s UI and redeploy to regenerate the stack.

## 4. Contabo Host Deployment

For a Contabo VPS or bare Docker host, use `deploy/docker-compose.contabo.yml`. The manifest mirrors the Coolify layout but defaults to publishing the dashboard on port `80` and assumes you mount host directories:

- `/opt/lovable/sandboxes` → used by the local runner and the desktop app sandbox bridge.
- `/opt/lovable/mcp` → exposes `/var/run/mcp/edge.sock` so IDE MCP clients can attach (e.g. `cursor mcp add lovable /opt/lovable/mcp/edge.sock`).

Deploy with:

```bash
scp -r . user@contabo:/opt/lovable
ssh user@contabo
cd /opt/lovable/deploy
docker compose -f docker-compose.contabo.yml up -d --build
```

Make sure to create the `/opt/lovable/sandboxes` and `/opt/lovable/mcp` directories before starting the compose stack if you want persistent storage.

## 5. IDE MCP Exposure

Both compose files mount `/var/run/mcp` inside the Edge and local runner containers. To surface the MCP socket to developer machines:

1. Bind-mount the host path (e.g. `/opt/lovable/mcp`) using either compose file.
2. Use SSH port-forwarding or tools like `socat` to proxy the UNIX socket to your workstation.
3. Configure your MCP-aware IDE to connect to the socket (Cursor: `cursor mcp add lovable path=/opt/lovable/mcp/edge.sock`).

## 6. Desktop Shell Permissions

The Electron desktop app (`apps/desktop`) persists sandbox selections in the user’s application data directory and exposes IPC methods via `window.desktopAPI`. When paired with the local runner container (port `3333`), users can:

- Select sandbox folders that mirror the `sandboxes` Docker volume.
- Proxy REST calls to the Edge API or local runner via `desktopAPI.proxyRequest`.
- Read/write files inside permitted sandboxes, enabling IDE-style workflows without giving the renderer full filesystem access.

## 7. First-Time Bootstrap Checklist

1. Provision Supabase credentials and store them in Coolify/Contabo secrets.
2. (Optional) Start Ollama or LM Studio containers for on-prem models.
3. Deploy the compose stack.
4. Verify MCP socket availability with `ls /opt/lovable/mcp`.
5. Launch the desktop shell, select a sandbox directory, and run a sample code task. The local runner logs appear on port `3333` and the Edge router proxies to whichever tools are online.

With these artifacts in place, you can move between managed Coolify clusters or self-managed Contabo hosts while keeping automation tooling, browser control, and MCP access aligned with Lovable’s cloud defaults.
