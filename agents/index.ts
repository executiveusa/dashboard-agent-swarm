import type { AgentRegistry } from './types';
import lemonManifest from './lemon/manifest';
import researcherManifest from './researcher/manifest';
import designerManifest from './designer/manifest';
import browserOpsManifest from './browserops/manifest';
import devOpsManifest from './devops/manifest';
import crmManifest from './crm/manifest';

export const systemAgents: AgentRegistry = {
  [lemonManifest.slug]: {
    ...lemonManifest,
    version: '1.0.0',
    owner: 'system',
    enabled: true,
  },
  [researcherManifest.slug]: {
    ...researcherManifest,
    version: '1.0.0',
    owner: 'system',
    enabled: true,
  },
  [designerManifest.slug]: {
    ...designerManifest,
    version: '1.0.0',
    owner: 'system',
    enabled: true,
  },
  [browserOpsManifest.slug]: {
    ...browserOpsManifest,
    version: '1.0.0',
    owner: 'system',
    enabled: true,
  },
  [devOpsManifest.slug]: {
    ...devOpsManifest,
    version: '1.0.0',
    owner: 'system',
    enabled: true,
  },
  [crmManifest.slug]: {
    ...crmManifest,
    version: '1.0.0',
    owner: 'system',
    enabled: true,
  },
};

export const agentList = Object.values(systemAgents);

export type { AgentManifest, AgentCapability, AgentPersona } from './types';
