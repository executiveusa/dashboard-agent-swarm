# Current State: DAR Studio (formerly dashboard-agent-swarm)

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (using CSS variables for theming)
- **Routing:** `react-router-dom` (v6)
- **State Management:** `@tanstack/react-query`
- **Icons:** `lucide-react`
- **Forms/Validation:** `react-hook-form`, `zod`
- **Charts:** `recharts`
- **Other:** `sonner` (toasts), `date-fns`

## File Structure (High-Level)

```
src/
├── App.tsx             # Main application component with routing and layout
├── main.tsx            # Entry point
├── index.css           # Global styles and Tailwind directives (CSS variables)
├── components/         # UI components (shadcn/ui and custom)
│   ├── ui/             # Primitive components (Button, Card, etc.)
│   └── AppSidebar.tsx  # Existing sidebar navigation
├── pages/              # Route components
│   ├── Index.tsx       # Dashboard home
│   ├── AgentsConsole.tsx
│   ├── Analytics.tsx
│   ├── Settings.tsx
│   └── ...
├── lib/                # Utilities (utils.ts)
└── hooks/              # Custom hooks
```

## Existing Routes

- `/` (Index)
- `/tasks`
- `/analytics`
- `/agents` (AgentsConsole)
- `/logs`
- `/files`
- `/settings`

## Constraints & Observations

- **Theme System:** The app uses a CSS variable-based theme system compatible with shadcn/ui. We should respect this and update the variables in `index.css` to match the new DAR Studio design tokens rather than hardcoding values in Tailwind config.
- **Layout:** Currently uses a Sidebar layout (`SidebarProvider`, `AppSidebar`). The new spec calls for a "Mission Control" UI, which might differ. We should likely create a new `AppShell` to accommodate the specific "top nav" or "mission control" requirements if they differ from the sidebar approach, or adapt the sidebar. The spec mentions "Top nav with DAR Studio logo", so we will likely move away from the sidebar to a top-nav layout for the main studio view.
- **Electron:** The project is configured for Electron (`electron-builder`), but we are focusing on the web app portion.
