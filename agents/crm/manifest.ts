import type { AgentManifest } from '../types';

export const crmManifest: AgentManifest = {
  slug: 'crm',
  displayName: 'CRM',
  persona: 'crm',
  summary:
    'Synchronizes leads, orchestrates outreach sequences, triages inboxes, and records every customer interaction.',
  capabilities: [
    'crm',
    'memory-read',
    'memory-write',
    'integration-admin',
  ],
  instructions:
    'Operate compliant outreach sequences, synchronize leads, and log every message. Never store plaintext credentials.',
  defaultTools: [
    { tool: 'crm-sync' },
    { tool: 'email' },
    { tool: 'calendar', optional: true },
    { tool: 'secrets-vault' },
    { tool: 'integrations-hub', description: 'One-click integration enablement' },
  ],
  safeModeTools: [
    { tool: 'crm-sync' },
    { tool: 'integrations-hub' },
  ],
};

export default crmManifest;
