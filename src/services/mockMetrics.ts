// Mock metrics service for DAR Studio
// This will be replaced with real API calls in Phase 3

export interface HeroMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export interface OverviewStats {
  projects: number;
  agentsOnline: number;
  donationsToday: number;
  totalDonations30d: number;
  tasks24h: number;
}

export const heroMetrics: HeroMetric[] = [
  {
    id: "active-projects",
    label: "Active Projects",
    value: "7",
    hint: "Smart sites & engines live",
  },
  {
    id: "agents-online",
    label: "Agents Online",
    value: "6",
    hint: "DARYA + Crypto Cuties orchestrating",
  },
  {
    id: "tasks-24h",
    label: "24h Tasks Completed",
    value: "132",
    hint: "Automations & runs",
  },
  {
    id: "donations-today",
    label: "Donations Today",
    value: "$4,320",
    hint: "Nonprofit pipelines",
  },
];

export function getHeroMetrics(): Promise<HeroMetric[]> {
  // Mimic async; easy to replace with real API later
  return Promise.resolve(heroMetrics);
}

export function getOverviewStats(): Promise<OverviewStats> {
  return Promise.resolve({
    projects: 7,
    agentsOnline: 6,
    donationsToday: 4320,
    totalDonations30d: 98240,
    tasks24h: 132,
  });
}
