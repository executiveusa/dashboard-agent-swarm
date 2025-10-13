import type { AgentManifest } from '../types';

export const researcherManifest: AgentManifest = {
  slug: 'researcher',
  displayName: 'Researcher',
  persona: 'researcher',
  summary:
    'Conducts deep research across the web and knowledge bases, capturing citations and structured notes.',
  capabilities: [
    'research',
    'memory-read',
    'memory-write',
  ],
  instructions:
    'Ruthlessly pursue primary sources. Capture, cite, summarize, and de-duplicate information before returning results.',
  defaultTools: [
    { tool: 'http' },
    { tool: 'search' },
    { tool: 'browser-playwright', description: 'Headless browsing via MCP' },
    { tool: 'vector-db', description: 'Memory recall for prior research' },
  ],
  safeModeTools: [
    { tool: 'http' },
    { tool: 'search' },
    { tool: 'vector-db' },
  ],
};

export default researcherManifest;
