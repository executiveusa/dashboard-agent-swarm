# Desktop (Electron) Shell

This package wraps the dashboard in an Electron application.  During development it proxies the local Vite dev server and, in production, loads the compiled static build from `dist/`.  The shell also exposes a hardened IPC surface for file access and other native affordances we will layer in as the YouTube → Transcript/QA → Report pipeline matures.

## Commands

- `npm run desktop:dev` – start Vite and Electron with live reload.
- `npm run desktop:build` – build the web assets and TypeScript sources.
- `npm run desktop:package:win` – example packaging target for Windows via `electron-builder`.

The legacy Tauri and other experimental shells now live under `archive/` for reference.
