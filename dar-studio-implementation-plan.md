# DAR Studio Implementation Plan

## Phase 1: Foundation & Layout

### 1. Design System Implementation

- **Strategy:** Update `src/index.css` to reflect the new DAR Studio color palette.
- **Actions:**
  - Convert DAR Studio hex colors to HSL values (to maintain compatibility with shadcn/ui opacity modifiers).
  - Update `--background`, `--foreground`, `--primary`, `--accent`, etc., in `index.css`.
  - Add new utility classes or variables for specific DAR Studio tokens (e.g., `surfaceElevated`, `primarySoft`) if they don't map to standard shadcn tokens.
  - Update `tailwind.config.ts` to include the new font families (`Space Grotesk` for headings).

### 2. Layout & Shell (`AppShell`)

- **New Component:** `src/components/layout/AppShell.tsx`
- **Features:**
  - Top Navigation Bar (replacing the current Sidebar for the main view, per spec "Has a top nav").
  - Responsive container.
  - Background styling (dark mode default).
- **Navigation Items:** Overview, Projects, Agents, Design System, Experiments, Settings.

### 3. Routing Updates (`App.tsx`)

- **Refactor:** Replace the existing `SidebarProvider` layout with the new `AppShell`.
- **Routes:**
  - `/` -> `Home.tsx` (New "Overview" page)
  - `/projects` -> `Projects.tsx` (New)
  - `/agents` -> `Agents.tsx` (Refactor existing `AgentsConsole` or create new)
  - `/design-system` -> `DesignSystem.tsx` (New)
  - `/experiments` -> `Experiments.tsx` (New)
  - `/settings` -> `Settings.tsx` (Keep/Refactor existing)

## Phase 2: Core Components (Home View)

### 1. UI Components

- **Hero Section:** `src/components/home/HomeHero.tsx`
  - Split layout, typography handling.
- **Cards:**
  - `StatCard.tsx`: For metrics.
  - `AgentClusterCard.tsx`: For the "Agent Clusters" grid.
- **Lists/Tables:**
  - `ProjectTable.tsx`: For "Projects Preview".
  - `ActivityTimeline.tsx`: For "Recent Activity".

### 2. Mock Data & API Stubs

- **File:** `src/config/api.ts`
- **Implementation:**
  - Define interfaces for the data.
  - Create mock data objects matching the spec.
  - Create stub functions (`fetchProjects`, `fetchAgents`, etc.) that return mock data for now.

## Phase 3: Page Assembly

### 1. Home Page (`src/pages/Home.tsx`)

- Assemble the Hero, Stats, Agent Clusters, and Projects tables.
- Ensure responsive design (stacking on mobile).

### 2. Design System Page (`src/pages/DesignSystem.tsx`)

- A gallery page to verify the implementation of tokens, typography, and core components.

## Execution Order

1.  **Styles:** Update `index.css` and `tailwind.config.ts`.
2.  **Shell:** Create `AppShell` and update `App.tsx`.
3.  **Components:** Build the core UI components (Hero, Cards).
4.  **Pages:** Assemble the Home page.
