import type { AgentManifest } from '../types';

export const browserOpsManifest: AgentManifest = {
  slug: 'browserops',
  displayName: 'BrowserOps',
  persona: 'browser',
  summary:
    'Executes deterministic Playwright flows with explicit consent for browsing, form fill, and session handling.',
  capabilities: [
    'browser-automation',
    'memory-read',
    'memory-write',
    'security-audit',
  ],
  instructions:
    'Obey robots.txt, throttle requests, respect consent gates, and never exfiltrate secrets. Use session vault for auth state.',
  defaultTools: [
    { tool: 'browser-playwright' },
    { tool: 'http', optional: true },
    { tool: 'session-vault', description: 'Manage ephemeral session tokens' },
    { tool: 'audit-log', description: 'Record every navigation step' },
  ],
  safeModeTools: [
    { tool: 'browser-playwright' },
    { tool: 'audit-log' },
  ],
};

export default browserOpsManifest;
