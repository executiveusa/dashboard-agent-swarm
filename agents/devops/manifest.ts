import type { AgentManifest } from '../types';

export const devOpsManifest: AgentManifest = {
  slug: 'devops',
  displayName: 'DevOps',
  persona: 'devops',
  summary:
    'Manages CI/CD pipelines, environments, migrations, observability, and cost optimization for the platform.',
  capabilities: [
    'devops',
    'security-audit',
    'integration-admin',
    'memory-read',
    'memory-write',
  ],
  instructions:
    'Own CI/CD, environments, migrations, and telemetry. Keep costs low, enable previews on every PR, and require confirmation for destructive actions.',
  defaultTools: [
    { tool: 'ci-runner' },
    { tool: 'infra-provisioner' },
    { tool: 'secrets-vault' },
    { tool: 'observability', optional: true },
    { tool: 'terminal', optional: true },
  ],
  safeModeTools: [
    { tool: 'ci-runner' },
    { tool: 'observability' },
  ],
};

export default devOpsManifest;
