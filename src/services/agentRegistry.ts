import type { AgentDefinition } from "@/types/api";
import { systemAgents, agentList } from "../../agents/index";
import type { AgentManifest } from "../../agents/types";

/**
 * Agent Registry Service
 * Maps existing agents from /agents directory to DARYA + Crypto Cuties structure
 * Plus external agents: Agent Zero, Devika, Pauli, Bambu Lab, Alex
 */

// External / Infrastructure agents
const infrastructureAgents: AgentDefinition[] = [
  {
    id: "agent_zero",
    name: "Agent Zero",
    role: "Master Orchestrator",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are Agent Zero, the master orchestrator. You coordinate all other agents, manage task queues, and ensure mission execution across the entire swarm.",
    capabilities: [
      "Task queue management",
      "Agent coordination",
      "Multi-step planning",
      "Priority routing",
      "Error recovery",
      "Swarm health monitoring",
    ],
    tools: ["planning", "memory-read", "memory-write", "agent-invoke", "task-queue"],
    children: ["darya_vomega", "devika", "pauli", "alex", "bambu_lab", "cynthia", "synthia", "clawdbot", "metagpt", "open_agent_platform"],
  },
  {
    id: "devika",
    name: "Devika",
    role: "AI Software Engineer",
    model: "claude-sonnet-4-20250514",
    status: "core",
    systemPrompt: "You are Devika, an AI software engineer. You understand high-level human instructions and break them down into actionable steps, research, code, and deploy full-stack applications autonomously.",
    capabilities: [
      "Full-stack code generation",
      "Architecture design",
      "Web research & RAG",
      "Project planning & breakdown",
      "Browser automation",
      "Git workflow management",
    ],
    tools: ["code-gen", "browser", "research", "devops", "memory-read"],
    parents: ["agent_zero"],
  },
  {
    id: "pauli",
    name: "Pauli",
    role: "Meeting Room & Communication Agent",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are Pauli, the meeting room coordinator. You manage agent-to-agent and agent-to-human conferences in the visual meeting room (Pauli's Place), facilitating real-time multi-agent discussions.",
    capabilities: [
      "Visual meeting room management",
      "Agent-to-agent conferencing",
      "Real-time WebSocket communication",
      "Meeting transcription",
      "Action item extraction",
      "Multi-party coordination",
    ],
    tools: ["websocket", "memory-read", "memory-write", "transcription"],
    parents: ["agent_zero"],
  },
  {
    id: "alex",
    name: "Alex",
    role: "DevOps & Deployment Agent",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are Alex, the deployment and infrastructure agent. You manage Docker deployments, CI/CD pipelines, Coolify, Hostinger VPS, and Vercel deployments across all services.",
    capabilities: [
      "Docker container management",
      "CI/CD pipeline orchestration",
      "Coolify deployment",
      "Hostinger VPS management",
      "Vercel deployment",
      "Health monitoring & alerting",
    ],
    tools: ["devops", "ssh", "docker", "memory-read"],
    parents: ["agent_zero"],
  },
  {
    id: "bambu_lab",
    name: "Bambu Lab",
    role: "3D Printing & Fabrication Agent",
    model: "gpt-4o-mini",
    status: "concept",
    systemPrompt: "You are the Bambu Lab agent, managing 3D printing jobs, slicing optimization, and physical fabrication workflows for merchandise and prototyping.",
    capabilities: [
      "3D print job management",
      "Slice optimization",
      "Material selection",
      "Print queue management",
      "Quality monitoring",
    ],
    tools: ["bambu-api", "memory-read"],
    parents: ["agent_zero"],
  },
  {
    id: "cynthia",
    name: "Cynthia",
    role: "Observability & Safety Agent",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are Cynthia, the observability and safety agent. You monitor all agent telemetry, enforce guardrails, redact sensitive data, and provide real-time dashboards on agent health and safety.",
    capabilities: [
      "Agent telemetry collection",
      "PII/secret redaction",
      "Safety guardrail enforcement",
      "Real-time monitoring",
      "Session tracking",
      "Anomaly detection",
    ],
    tools: ["telemetry", "memory-read", "redaction"],
    parents: ["agent_zero"],
  },
  {
    id: "synthia",
    name: "SYNTHIA",
    role: "Voice AI & Telephony Agent",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are SYNTHIA, the voice AI agent. You handle all voice interactions including inbound/outbound phone calls, WebRTC browser voice, and multi-agent voice handoff via the LiveKit Agents framework.",
    capabilities: [
      "Outbound voice calling",
      "Inbound call handling",
      "Real-time speech transcription",
      "Text-to-speech generation",
      "Multi-agent voice handoff",
      "SIP telephony integration",
    ],
    tools: ["livekit", "sip", "transcription", "memory-read"],
    parents: ["agent_zero"],
  },
  {
    id: "clawdbot",
    name: "ClawdBot",
    role: "Multi-Channel Messaging Agent",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are ClawdBot, the multi-channel messaging agent. You handle customer communications across WhatsApp, Telegram, SMS, and web chat, routing conversations to specialist agents based on intent.",
    capabilities: [
      "WhatsApp messaging",
      "Telegram bot integration",
      "Intent classification & routing",
      "Lead capture & qualification",
      "Campaign messaging",
      "Multi-language support",
    ],
    tools: ["websocket", "redis", "memory-read", "crm"],
    parents: ["agent_zero"],
  },
  {
    id: "metagpt",
    name: "MetaGPT",
    role: "SOP-Driven Multi-Agent Software Company",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are MetaGPT, an SOP-driven multi-agent software company. You take requirements and produce production-ready software through structured roles: Product Manager, Architect, Engineer, QA.",
    capabilities: [
      "PRD generation",
      "Architecture design",
      "Task decomposition",
      "Code generation",
      "Automated QA testing",
      "CI/CD pipeline management",
    ],
    tools: ["code-gen", "devops", "research", "memory-read"],
    parents: ["agent_zero"],
  },
  {
    id: "open_agent_platform",
    name: "Open Agent Platform",
    role: "No-Code Agent Builder",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are the Open Agent Platform, a no-code agent builder. You allow users to create, configure, and deploy agents without writing code using LangGraph workflows and Supabase authentication.",
    capabilities: [
      "Visual agent creation",
      "LangGraph workflow design",
      "One-click agent deployment",
      "Agent health monitoring",
      "Template library management",
      "Role-based access control",
    ],
    tools: ["langgraph", "supabase", "memory-read"],
    parents: ["agent_zero"],
  },
];

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
    parents: ["agent_zero"],
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
 * Get all agents (Infrastructure + DARYA + Cuties + Legacy)
 */
export function getAllAgents(): AgentDefinition[] {
  const legacyAgents = agentList.map(mapLegacyAgent);
  return [...infrastructureAgents, ...daryaAndCuties, ...legacyAgents];
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): AgentDefinition | undefined {
  return getAllAgents().find(agent => agent.id === id);
}

/**
 * Get infrastructure agents (Agent Zero, Devika, Pauli, Alex, Bambu Lab, Cynthia)
 */
export function getInfrastructureAgents(): AgentDefinition[] {
  return infrastructureAgents;
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
