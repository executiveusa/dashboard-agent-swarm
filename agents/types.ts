export type AgentCapability =
  | 'planning'
  | 'research'
  | 'design'
  | 'browser-automation'
  | 'devops'
  | 'crm'
  | 'memory-read'
  | 'memory-write'
  | 'integration-admin'
  | 'security-audit';

export type AgentPersona =
  | 'orchestrator'
  | 'researcher'
  | 'designer'
  | 'browser'
  | 'devops'
  | 'crm';

export interface MCPToolBinding {
  tool: string;
  optional?: boolean;
  description?: string;
}

export interface AgentManifest {
  slug: string;
  displayName: string;
  persona: AgentPersona;
  summary: string;
  capabilities: AgentCapability[];
  instructions: string;
  defaultTools: MCPToolBinding[];
  safeModeTools?: MCPToolBinding[];
}

export interface AgentRegistryEntry extends AgentManifest {
  version: string;
  owner: 'system' | 'user';
  enabled: boolean;
}

export type AgentRegistry = Record<string, AgentRegistryEntry>;
