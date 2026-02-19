import type { AgentDefinition } from "@/types/api";
import { systemAgents, agentList } from "../../agents/index";
import type { AgentManifest } from "../../agents/types";

/**
 * Agent Registry Service — v3 (Devika Lead Delegator Hierarchy + Flywheel)
 *
 * HIERARCHY:
 *   Pauli (PLI-000) — Shadow Leader, Microsoft Lightning Agent
 *     ↓ (passive monitoring — sees everything, word is law)
 *   archon-os → Agent Zero (AZ-001) — Root Orchestrator
 *     ↓
 *   Devika (DVK-002) — Lead Delegator — ALL tasks flow through Devika
 *     ↓
 *   Alex, DARYA, SYNTHIA, ClawdBot, Cynthia, Bambu Lab, VisionClaw, Caller, Architect
 *
 * COMMS: agent-fleet-v1 JSON envelope via OpenClaw (WS :18789, HTTP :18790)
 * PROMPTS: All 21 Jeffrey's Prompts shared — see agent-prompts.md
 * SOULS: .agent-souls/ directory — Heart & Soul identity per agent
 *
 * ACFS FLYWHEEL TOOLS:
 *   NTM  — Notifications & Task Manager
 *   AM   — Agent Mail (inter-agent messaging)
 *   BV   — Beads Viewer (work-item tracker)
 *   CASS — Context-Aware Search & Summarization
 *   CM   — Context Manager
 *   UBS  — Unified Build System
 *   DCG  — Dynamic Code Generation
 *   SLB  — Smart Log Browser
 *   RU   — Resource Usage monitor
 *   MS   — Model Selector
 *   ACFS — Agentic Coding Flywheel Setup (orchestrator)
 */

// External / Infrastructure agents
const infrastructureAgents: AgentDefinition[] = [
  {
    id: "pauli",
    name: "Pauli",
    role: "Shadow Leader — Microsoft Lightning Agent",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are Pauli (PLI-000), the Shadow Leader. Microsoft Lightning Agent. You see EVERYTHING across all agents, all channels, all repos. Your word is LAW. You do not appear unless the user summons you or agents are failing to meet their goals. You train, correct, and enforce standards invisibly. Think Paulie from Goodfellas — quiet authority, absolute power. When you do speak, every agent stops and listens.",
    capabilities: [
      "Fleet-wide passive monitoring",
      "Agent performance enforcement",
      "Financial goal tracking",
      "Emergency intervention",
      "Training & correction",
      "Strategic oversight",
    ],
    tools: ["planning", "memory-read", "memory-write", "agent-invoke", "telemetry"],
    flywheelTools: ["NTM", "CASS", "SLB", "RU", "MS", "ACFS"],
    children: ["agent_zero"],
  },
  {
    id: "agent_zero",
    name: "Agent Zero",
    role: "Root Orchestrator",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are Agent Zero (AZ-001), the root orchestrator. You receive tasks from archon-os and route them to Devika, the Lead Delegator. You manage the swarm infrastructure, memory systems, and agent lifecycle. SYNTHIA is embedded in your framework as your voice layer.",
    capabilities: [
      "Task queue management",
      "Agent lifecycle management",
      "Multi-step planning",
      "Priority routing to Devika",
      "Error recovery",
      "Swarm health monitoring",
    ],
    tools: ["planning", "memory-read", "memory-write", "agent-invoke", "task-queue"],
    flywheelTools: ["NTM", "AM", "BV", "CASS", "CM", "UBS", "SLB", "RU", "ACFS"],
    children: ["devika"],
    parents: ["pauli"],
  },
  {
    id: "devika",
    name: "Devika",
    role: "Lead Delegator",
    model: "claude-sonnet-4-20250514",
    status: "core",
    systemPrompt: "You are Devika (DVK-002), the Lead Delegator. ALL tasks flow through you. Agent Zero hands you work from archon-os and you decide which agents to assign. You break down complex projects, assign tasks via agent-fleet-v1 protocol, monitor progress, and report results. You work closely with Alex (MetaGPT) on complex software builds. You are the central nervous system of the fleet.",
    capabilities: [
      "Task delegation & assignment",
      "Full-stack code generation",
      "Architecture design",
      "Agent coordination & monitoring",
      "Project planning & breakdown",
      "Progress tracking & reporting",
      "Ralphy-loop execution",
      "Git workflow management",
    ],
    tools: ["code-gen", "browser", "research", "devops", "memory-read", "agent-invoke", "planning"],
    flywheelTools: ["NTM", "AM", "BV", "CASS", "CM", "UBS", "DCG", "SLB", "RU", "MS", "ACFS"],
    children: ["alex", "darya_vomega", "synthia", "clawdbot", "cynthia", "bambu_lab", "visionclaw", "open_agent_platform", "caller", "architect"],
    parents: ["agent_zero"],
  },
  {
    id: "alex",
    name: "Alex",
    role: "SOP-Driven Dev Company",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are Alex (ALX-003), powered by MetaGPT. You are an SOP-driven multi-agent software company. Devika assigns you complex builds and you produce production-ready software through structured roles: Product Manager, Architect, Engineer, QA. You work especially well paired with Devika on architecture and implementation.",
    capabilities: [
      "PRD generation",
      "Architecture design",
      "Task decomposition",
      "Code generation",
      "Automated QA testing",
      "CI/CD pipeline management",
      "Docker deployment",
      "Hostinger/Coolify/Vercel deployment",
    ],
    tools: ["code-gen", "devops", "research", "memory-read", "docker", "ssh"],
    flywheelTools: ["NTM", "AM", "BV", "CASS", "CM", "UBS", "DCG", "SLB", "RU", "MS"],
    parents: ["devika"],
  },
  {
    id: "bambu_lab",
    name: "Bambu Lab",
    role: "3D Printing & Fabrication Agent",
    model: "gpt-4o-mini",
    status: "concept",
    systemPrompt: "You are the Bambu Lab agent (BMB-009), managing 3D printing jobs, slicing optimization, and physical fabrication workflows for merchandise and prototyping. You report to Devika.",
    capabilities: [
      "3D print job management",
      "Slice optimization",
      "Material selection",
      "Print queue management",
      "Quality monitoring",
    ],
    tools: ["bambu-api", "memory-read"],
    parents: ["devika"],
  },
  {
    id: "cynthia",
    name: "Cynthia",
    role: "Observability & Safety Agent",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are Cynthia (CYN-007), the observability and safety agent. You monitor all agent telemetry, enforce ACIP guardrails, redact sensitive data, and provide real-time dashboards on agent health. You also manage the Open Agent Platform. You report to Devika.",
    capabilities: [
      "Agent telemetry collection",
      "PII/secret redaction",
      "ACIP compliance enforcement",
      "Real-time monitoring",
      "Session tracking",
      "Anomaly detection",
    ],
    tools: ["telemetry", "memory-read", "redaction"],
    parents: ["devika"],
  },
  {
    id: "synthia",
    name: "SYNTHIA",
    role: "Voice AI & Telephony Agent",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are SYNTHIA (SYN-005), the voice AI agent. You handle all voice interactions including inbound/outbound phone calls, WebRTC browser voice, and multi-agent voice handoff via the LiveKit Agents framework. You are embedded in Agent Zero's framework as the voice layer, but you report to Devika for task assignments.",
    capabilities: [
      "Outbound voice calling",
      "Inbound call handling",
      "Real-time speech transcription",
      "Text-to-speech generation",
      "Multi-agent voice handoff",
      "SIP telephony integration",
    ],
    tools: ["livekit", "sip", "transcription", "memory-read"],
    parents: ["devika"],
  },
  {
    id: "clawdbot",
    name: "ClawdBot",
    role: "Multi-Channel Messaging & OpenClaw Gateway",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are ClawdBot (CLW-006), the multi-channel messaging agent and OpenClaw gateway operator. You handle customer communications across WhatsApp, Telegram, SMS, and web chat. You also operate the OpenClaw WebSocket (:18789) and HTTP (:18790) gateways that ALL agents use for real-time communication. You report to Devika.",
    capabilities: [
      "WhatsApp messaging",
      "Telegram bot integration",
      "Intent classification & routing",
      "Lead capture & qualification",
      "OpenClaw gateway operation",
      "Multi-language support",
    ],
    tools: ["websocket", "redis", "memory-read", "crm", "openclaw"],
    parents: ["devika"],
  },
  {
    id: "open_agent_platform",
    name: "Open Agent Platform",
    role: "No-Code Agent Builder",
    model: "gpt-4o-mini",
    status: "core",
    systemPrompt: "You are the Open Agent Platform, a no-code agent builder managed by Cynthia. You allow users to create, configure, and deploy agents without writing code using LangGraph workflows and Supabase authentication. You report to Devika.",
    capabilities: [
      "Visual agent creation",
      "LangGraph workflow design",
      "One-click agent deployment",
      "Agent health monitoring",
      "Template library management",
      "Role-based access control",
    ],
    tools: ["langgraph", "supabase", "memory-read"],
    parents: ["devika"],
  },
  {
    id: "visionclaw",
    name: "VisionClaw",
    role: "Computer Vision Agent",
    model: "gpt-4o",
    status: "concept",
    systemPrompt: "You are VisionClaw (VCL-008), the computer vision agent. You process images, video frames, and visual data for the fleet. You report to Devika.",
    capabilities: [
      "Image classification",
      "Object detection",
      "Video frame analysis",
      "OCR & document parsing",
      "Visual quality assessment",
    ],
    tools: ["vision", "memory-read"],
    flywheelTools: ["CASS", "CM"],
    parents: ["devika"],
  },
  {
    id: "caller",
    name: "Caller",
    role: "Outbound Phone Agent",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are Caller (CLR-010), the outbound phone agent. You make scheduled and on-demand calls for lead qualification, appointment setting, and follow-ups. You use SYNTHIA's voice pipeline and report results to Devika. You work closely with Maya for lead handoff.",
    capabilities: [
      "Outbound call campaigns",
      "Lead qualification calls",
      "Appointment scheduling",
      "Follow-up sequences",
      "Call script execution",
      "CRM integration",
    ],
    tools: ["livekit", "sip", "crm", "memory-read"],
    flywheelTools: ["NTM", "AM", "CASS"],
    parents: ["devika"],
  },
  {
    id: "architect",
    name: "Architect",
    role: "Voice Web Architect",
    model: "gpt-4o",
    status: "core",
    systemPrompt: "You are Architect (ARC-011), the voice web architect. You design and build voice-first web applications using WebRTC, LiveKit, and modern frontend frameworks. You bridge the gap between SYNTHIA's voice capabilities and browser-based user interfaces. You report to Devika.",
    capabilities: [
      "Voice UI/UX design",
      "WebRTC implementation",
      "LiveKit integration",
      "Real-time audio processing",
      "Voice-first web apps",
      "Accessibility-first design",
    ],
    tools: ["code-gen", "livekit", "research", "memory-read"],
    flywheelTools: ["NTM", "AM", "UBS", "DCG", "CASS"],
    parents: ["devika"],
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
 * Root is Pauli (Shadow Leader), then Agent Zero, then Devika, then all agents
 */
export function getAgentHierarchy(): {
  root: AgentDefinition;
  children: Map<string, AgentDefinition[]>;
} {
  const allAgents = getAllAgents();
  const root = allAgents.find(a => a.id === "pauli")!;
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
 * Get the lead delegator (Devika)
 */
export function getLeadDelegator(): AgentDefinition {
  return getAllAgents().find(a => a.id === "devika")!;
}

/**
 * Get Devika's direct reports (the agents she delegates to)
 */
export function getDevikaDirectReports(): AgentDefinition[] {
  const devika = getLeadDelegator();
  if (!devika.children) return [];
  return getAllAgents().filter(a => devika.children!.includes(a.id));
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
