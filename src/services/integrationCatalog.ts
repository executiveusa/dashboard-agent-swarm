export type IntegrationPhase = "phase0_contract" | "phase1_core4" | "phase2_all11";

export type IntegrationPolicyClass = "SAFE" | "SENSITIVE-ALLOWED" | "DISALLOWED";

export interface ExternalIntegrationTarget {
  toolId: string;
  displayName: string;
  purpose: string;
  ownerAgents: string[];
  primaryRepos: string[];
  phase: IntegrationPhase;
  defaultClassification: IntegrationPolicyClass;
}

const CORE4 = [
  "dashboard-agent-swarm",
  "agent-zero-Fork",
  "devika-agent",
  "MetaGPT",
] as const;

const ALL11 = [
  ...CORE4,
  "open-agent-platform-pauli",
  "clawdbot-Whatsapp-agent",
  "voice-agents-fork",
  "GPT-Agent-im-ready",
  "phone-call-assistant",
  "VisionClaw",
  "voice-web-architect",
] as const;

const CATALOG: ExternalIntegrationTarget[] = [
  {
    toolId: "markdown_web_browser",
    displayName: "Markdown Web Browser",
    purpose: "Deterministic web capture to markdown for agent-ready context",
    ownerAgents: ["devika", "agent_zero"],
    primaryRepos: ["devika-agent", "agent-zero-Fork"],
    phase: "phase1_core4",
    defaultClassification: "SAFE",
  },
  {
    toolId: "brennerbot_workflow",
    displayName: "BrennerBot Workflow",
    purpose: "Structured multi-agent reasoning orchestration pattern",
    ownerAgents: ["agent_zero"],
    primaryRepos: ["agent-zero-Fork"],
    phase: "phase1_core4",
    defaultClassification: "SENSITIVE-ALLOWED",
  },
  {
    toolId: "cass",
    displayName: "CASS Session Search",
    purpose: "Cross-agent memory/session retrieval and handoff context",
    ownerAgents: ["cynthia", "devika"],
    primaryRepos: ["coding_agent_session_search", "agent-zero-Fork", "devika-agent"],
    phase: "phase1_core4",
    defaultClassification: "SAFE",
  },
  {
    toolId: "claude_code_agent_farm",
    displayName: "Claude Code Agent Farm",
    purpose: "Parallel coding swarm execution via tmux",
    ownerAgents: ["alex", "devika"],
    primaryRepos: ["MetaGPT", "devika-agent"],
    phase: "phase1_core4",
    defaultClassification: "SENSITIVE-ALLOWED",
  },
  {
    toolId: "simultaneous_launch_button",
    displayName: "Simultaneous Launch Button",
    purpose: "Two-person gate for dangerous operations",
    ownerAgents: ["cynthia", "pauli"],
    primaryRepos: ["agent-zero-Fork"],
    phase: "phase1_core4",
    defaultClassification: "SENSITIVE-ALLOWED",
  },
  {
    toolId: "ultimate_mcp_client",
    displayName: "Ultimate MCP Client",
    purpose: "Unified MCP client/gateway for tool discovery and execution",
    ownerAgents: ["agent_zero", "clawdbot"],
    primaryRepos: ["agent-zero-Fork", "clawdbot-Whatsapp-agent"],
    phase: "phase1_core4",
    defaultClassification: "SAFE",
  },
  {
    toolId: "bulk_transcribe_playlist",
    displayName: "Bulk YouTube Playlist Transcription",
    purpose: "Transcribe playlist/video content into reusable text artifacts",
    ownerAgents: ["synthia", "cutie_luna"],
    primaryRepos: ["voice-agents-fork", "phone-call-assistant"],
    phase: "phase2_all11",
    defaultClassification: "SENSITIVE-ALLOWED",
  },
];

export function getExternalIntegrationCatalog(): ExternalIntegrationTarget[] {
  return CATALOG;
}

export function getCore4Repos(): readonly string[] {
  return CORE4;
}

export function getAll11Repos(): readonly string[] {
  return ALL11;
}

export function getIntegrationsByPhase(phase: IntegrationPhase): ExternalIntegrationTarget[] {
  return CATALOG.filter(item => item.phase === phase);
}

export function getIntegrationsByAgent(agentId: string): ExternalIntegrationTarget[] {
  return CATALOG.filter(item => item.ownerAgents.includes(agentId));
}
