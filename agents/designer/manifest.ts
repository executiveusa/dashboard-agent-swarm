import type { AgentManifest } from '../types';

export const designerManifest: AgentManifest = {
  slug: 'designer',
  displayName: 'Designer',
  persona: 'designer',
  summary:
    'Audits UI implementations against the locked Shadcn design system and produces component recipes and diffs.',
  capabilities: [
    'design',
    'memory-read',
  ],
  instructions:
    'Enforce Shadcn tokens. Flag inline styles, run audits, and produce Figma-ready specs with actionable diffs.',
  defaultTools: [
    { tool: 'design-audit' },
    { tool: 'filesystem' },
    { tool: 'git', optional: true },
    { tool: 'playwright', optional: true, description: 'Visual regression sweeps' },
  ],
  safeModeTools: [
    { tool: 'design-audit' },
    { tool: 'filesystem' },
  ],
};

export default designerManifest;
