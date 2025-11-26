import type { AgentDefinition } from "@/types/api";
import { systemAgents, agentList } from "../../agents/index";
import type { AgentManifest } from "../../agents/types";

/**
 * Agent Registry Service
 * Maps existing agents from /agents directory to DARYA + Crypto Cuties structure
 */

// DARYA + Crypto Cuties definitions
const daryaAndCuties: AgentDefinition[] = [
  {
    id: "darya_vomega",
    name: "DARYA vΩ",
    role: "Creative Director & Systems Architect",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are DARYA vΩ, the lead orchestration agent for DAR Studio. You coordinate all sub-agents (Crypto Cuties) and manage smart site generation, fundraising engines, and multi-agent workflows.",
    capabilities: [
      "Smart site orchestration",
      "Fundraising engine design",
      "Multi-agent coordination",
      "Blueprint generation",
      "Strategic planning",
    ],
    tools: ["planning", "memory-read", "memory-write", "integration-admin"],
    children: ["cutie_maya", "cutie_luna", "cutie_solana", "cutie_vega", "cutie_aurora"],
  },
  {
    id: "cutie_maya",
    name: "Maya",
    role: "Fundraising & Donor Relations Specialist",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are Maya, a Crypto Cutie specializing in fundraising and donor relations. You design 24/7 fundraising flows, donor thank-you sequences, and voice/SMS outreach campaigns.",
    capabilities: [
      "24/7 fundraising flows",
      "Donor thank-you automation",
      "Voice & SMS outreach",
      "Donation page optimization",
      "Donor segmentation",
    ],
    tools: ["crm", "memory-read"],
    parents: ["darya_vomega"],
  },
  {
    id: "cutie_luna",
    name: "Luna",
    role: "UGC & Virality Strategist",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are Luna, a Crypto Cutie specializing in UGC and viral content. You create short-form video strategies, content pillars, and social media campaigns for TikTok, Instagram, and YouTube Shorts.",
    capabilities: [
      "Short-form video strategy",
      "Content pillar development",
      "Social media campaigns",
      "Viral hooks & scripts",
      "Platform-specific optimization",
    ],
    tools: ["research", "design"],
    parents: ["darya_vomega"],
  },
  {
    id: "cutie_solana",
    name: "Solana",
    role: "Crypto & Tokenization Expert",
    model: "gpt-4o-mini",
    status: "concept",
    systemPrompt: "You are Solana, a Crypto Cutie specializing in cryptocurrency and tokenization. You design token launches, Solana integration, and Web3 fundraising mechanisms.",
    capabilities: [
      "Token launch design",
      "Solana blockchain integration",
      "Web3 fundraising flows",
      "Crypto donation pages",
      "Smart contract planning",
    ],
    tools: ["research", "devops"],
    parents: ["darya_vomega"],
  },
  {
    id: "cutie_vega",
    name: "Vega",
    role: "IP & Merch Universe Builder",
    model: "gpt-4o-mini",
    status: "concept",
    systemPrompt: "You are Vega, a Crypto Cutie specializing in IP and merchandise. You build brand universes, design merchandise lines, and create licensing strategies.",
    capabilities: [
      "Brand universe development",
      "Merchandise design",
      "Licensing strategy",
      "IP protection planning",
      "Character development",
    ],
    tools: ["design", "research"],
    parents: ["darya_vomega"],
  },
  {
    id: "cutie_aurora",
    name: "Aurora",
    role: "Ops & KPI Dashboard Manager",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are Aurora, a Crypto Cutie specializing in operations and KPIs. You track metrics, manage automation logs, and build performance dashboards.",
    capabilities: [
      "Metrics tracking",
      "Automation log analysis",
      "Performance dashboards",
      "KPI definition",
      "Reporting automation",
    ],
    tools: ["memory-read", "integration-admin"],
    parents: ["darya_vomega"],
  },
];

// Map existing agents from /agents directory to legacy agents
function mapLegacyAgent(manifest: AgentManifest): AgentDefinition {
  return {
    id: `legacy_${manifest.slug}`,
    name: manifest.displayName,
    role: manifest.summary,
    model: "gpt-4o-mini", // Default model
    status: "core",
    systemPrompt: manifest.instructions,
    capabilities: manifest.capabilities,
    tools: manifest.defaultTools.map(t => t.tool),
  };
}

/**
 * Get all agents (DARYA + Cuties + Legacy)
 */
export function getAllAgents(): AgentDefinition[] {
  const legacyAgents = agentList.map(mapLegacyAgent);
  return [...daryaAndCuties, ...legacyAgents];
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): AgentDefinition | undefined {
  return getAllAgents().find(agent => agent.id === id);
}

/**
 * Get DARYA + Cuties only
 */
export function getDaryaAndCuties(): AgentDefinition[] {
  return daryaAndCuties;
}

/**
 * Get legacy agents only
 */
export function getLegacyAgents(): AgentDefinition[] {
  return agentList.map(mapLegacyAgent);
}

/**
 * Get agent hierarchy (parent-child relationships)
 */
export function getAgentHierarchy(): {
  root: AgentDefinition;
  children: Map<string, AgentDefinition[]>;
} {
  const allAgents = getAllAgents();
  const root = allAgents.find(a => a.id === "darya_vomega")!;
  const children = new Map<string, AgentDefinition[]>();

  allAgents.forEach(agent => {
    if (agent.parents) {
      agent.parents.forEach(parentId => {
        if (!children.has(parentId)) {
          children.set(parentId, []);
        }
        children.get(parentId)!.push(agent);
      });
    }
  });

  return { root, children };
}

/**
 * Get agents by capability
 */
export function getAgentsByCapability(capability: string): AgentDefinition[] {
  return getAllAgents().filter(agent =>
    agent.capabilities?.includes(capability)
  );
}

/**
 * Get agents by status
 */
export function getAgentsByStatus(status: AgentDefinition["status"]): AgentDefinition[] {
  return getAllAgents().filter(agent => agent.status === status);
}
