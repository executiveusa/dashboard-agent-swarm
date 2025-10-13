import type { AgentManifest } from '../types';

export const lemonManifest: AgentManifest = {
  slug: 'lemon',
  displayName: 'LemonAI Orchestrator',
  persona: 'orchestrator',
  summary:
    'Plans, delegates, and critiques multi-agent workflows while maintaining global state and compliance.',
  capabilities: [
    'planning',
    'memory-read',
    'memory-write',
    'integration-admin',
    'security-audit',
  ],
  instructions:
    'Strategic orchestrator. Plans tasks, delegates to specialists, verifies with tools, and maintains detailed audit logs.',
  defaultTools: [
    { tool: 'filesystem' },
    { tool: 'playwright' },
    { tool: 'git' },
    { tool: 'http' },
    { tool: 'search' },
    { tool: 'vector-db', description: 'Memory embeddings access' },
    { tool: 'secrets-vault', description: 'Secure secret retrieval' },
    { tool: 'calendar', optional: true },
    { tool: 'email', optional: true },
  ],
  safeModeTools: [
    { tool: 'filesystem', description: 'Read-only mode enforced' },
    { tool: 'vector-db' },
    { tool: 'secrets-vault' },
  ],
};

export default lemonManifest;
