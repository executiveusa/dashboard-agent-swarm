import { Hono } from 'hono';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export const repoRoutes = new Hono();

// ─── Static repo catalogue (313 repos from executiveusa org) ──────────────────
const ALL_REPOS: string[] = [
  "-e-commerce-remix", "-la-pina-cdmx", "-lightning-claude-memory-agent",
  "-yt-knowledge-extractor", "AFRO-CLIPZ", "AI-Youtube-Shorts-Generator",
  "AKASHPORTFOLIO", "ARCHON-X2.0", "AVATAR", "AdventureLog-kupri",
  "Agentic-AIGC-MAXX-EDITS", "AionUi-cowork", "AutoAgent", "BMAD-METHOD",
  "BOILER-BOYZ", "BOILERBOYZ", "Business-Website-Template-kimi-K2",
  "CHEGGIE-AI-Trader", "CLONELY-FANZ", "Darya-designs", "ECO-TOUR-DIRECTORY",
  "FRITHCO", "GPT-Agent-im-ready", "GSAP-Awwwards-Website-", "Kupuri-studios",
  "Lumina-DiMOO-image-generator", "MAXX-Research", "MAXX-Video-Agent", "MetaGPT",
  "Nextjs-Ecommerce", "OPENTHC", "Open-clipz", "POSTA-STUDIO.V2",
  "Paper2Video-science-avatar", "Pauli-claw-work", "Pauli-spec-kit",
  "Raft-Landing-Page", "Rube-remix", "Social-Media-Post-Generator---Encore.dev",
  "Suenos--very_good_templates", "Synthia-3.0", "Synthia-4.2", "Telegram-bot",
  "VIPposta", "VisionClaw", "WEB3SAAS-APP", "abby-wellness-nexus", "acip",
  "actual-stash", "afroscribble", "agent-indigo", "agent-kupuri-template",
  "agent-zero-Fork", "agent_flywheel_clawdbot_skills_and_integrations",
  "ai-sdk-computer-use", "ai-tool-kit", "airbnbauto", "aiwear-trend-hub",
  "aiwear-trend-hub-c0e24ba8", "akash-engine-2.0", "akash-last-edit",
  "akash-master-files", "akash-master-files-2", "akash-master-files-3",
  "akash-master-files.2.0", "akash-master.1.0", "akash-orbit-platform",
  "allweatherroofs", "alphadeltarecycling", "amentislibrary", "ani-maze",
  "animeta-roblox-craft", "apify-studiobuilder", "archon-ghl-automator",
  "archon-lovable-nexus", "archon-ui-forge", "archonx-os", "arkan-os-branding",
  "artist-fold-gallery", "auto-shop-turkey", "balldontlie", "base-stack-vite",
  "biophillia-blog", "black-mirror", "blockerbuiltautosales", "botanical-memories",
  "breatheinternational", "butterflytracker", "cafe-cultura-", "chakrana",
  "chat-bot-template", "chatgami-supabuddy", "chef-code-ide",
  "cheggie-lifestyle-finance", "chromium-fork-browser",
  "cinematic-smart-funnels-launchpad", "clandestino-rebellion-launch",
  "claude-kosmos-2_5-containerized", "claude-suna-kortix", "claude-task-master",
  "clawdbot-Whatsapp-agent", "cloneflow-ai-sites", "coachdavis",
  "codex-craft-forge", "coding_agent_session_search", "coding_agent_usage_tracker",
  "continue-claude-agent", "cruise-reposition-oasis", "crush", "cryptocuties",
  "crystal-memory-cube", "cult-directory-template", "culture-shock-sports",
  "cultureshocksports", "darya-design-agent", "darya-design-throne",
  "darya-next-js-landing-page", "dash-vega-luxe", "dashboard-agent-swarm",
  "ddev-diffy-agent-zero-", "devika-agent", "digital-odyssey-scroll",
  "dispatchhelper", "dispatchhelper2", "emergent-wealth-culture",
  "enaswigsandhair", "evershop-e-commerece", "factory-droid-wrap-",
  "fancynancyai", "fish-on-texas", "flow-profit", "frankenstackbyfranklyai",
  "fritco-locale-scaffold", "fritco-v2", "frithco-2.0", "frithco-3.0",
  "frithco-final-version", "frithco-remix", "geist-font-design",
  "genie-assistant-magic", "glassy-focus-flow", "goat-alliance-scaffold",
  "goatalliance", "golden-heart-compass-ai", "goldenhearts", "hiring-compass",
  "humanatar-genesis-suite", "hustle", "hustle-claude", "hustle-claude-code",
  "image-template", "impact-city-builder-verse", "indigo-azul-catalog",
  "infinite-agentic-loop", "interactive-artifact", "ivettemilo", "ivettemushrooms",
  "jeannieflow-", "jzuart-dj-saas", "kauffmans-patterrns",
  "kinetic-code-canvas-dream", "kitchen-creations-planner-pro",
  "kupuri-media-website", "kupuri-studios-landing", "la-silueta", "lamonarchaintl",
  "landscaping1", "lapina", "legalai-nexus-core", "leon-avatar-fork-",
  "lovable-ai-dreamweaver", "lux-desktop-claude", "macs-agent-portal",
  "macscryptocasino", "macstraxx", "mastertoon", "maxx-casino-portal", "maxx-clipz",
  "maxx-coze-studio", "maxx-craft", "maxxclipz", "maxxiescraper",
  "meishael-mini-meish", "memoryblock", "merlina", "metamorfosis-wellness-journey",
  "metamorphsis-cdmx", "midday-suelta-app", "mini-meish", "miranda-portfolio-spark",
  "modernairsolutions", "monorepo-turborepo", "morpho-metrics-academy",
  "nano-banana-generator-pauli-fork", "newworldkids", "next-forge",
  "next-video-starter", "nextjs-ai-chatbot", "nextjs-commerce",
  "nextjs-enterprise-boilerplate", "nexusgymcdmx", "nicetohave", "nodev",
  "nomadasearch", "nomaticthecost", "notion-blog", "onboardingglobe",
  "onlook-synthi", "opal-art-preserve", "open-agent-platform-pauli",
  "open-interpreter-fork", "open-lovable", "opencode", "outlines-second-brain",
  "p-72343185", "pauli-agent-S-computer-use-", "pauli-beads", "pauli-brand-guidelines",
  "pauli-comic-funnel", "pauli-deep-research", "pauli-design-resources-for-developers",
  "pauli-effect-roi-wizard", "pauli-hyperedit", "pauli-iron-claw",
  "pauli-remote-screen-", "pauli-security-red-hat-", "pauli-story-tool-kit",
  "pauli__mail", "paulis-deep-agent", "paulis-pope-bot",
  "paulisworld-openclaw-3d", "payload-rancho-santiago", "peter-sung",
  "peter-sung-website", "phone-call-assistant", "pickaxe-nanobanana-g",
  "portal-mini-store-template-main", "portfolio-starter", "postatees-studio",
  "postateesstudio-", "postateesstudioV.1", "postiz-maxx-clipz", "promptation",
  "prompts", "pv-construction-platform", "qr-code-maker", "que-pedo-cdmx",
  "r-108043", "r-108043-e63b540f", "react-agent-darya-3.0",
  "rebanada-world-pizza-hub", "reddit-focus-finder", "reddit-focus-insight",
  "reel-flux", "reel-flux-2", "remixyoursite.com", "sassyscraper",
  "schoolofterabithia", "seattle-reuse-exchange", "seattle-reuse-exchange-v2",
  "second-brain-agent", "seoforge-ai-builder", "serene-studio-flow-hub",
  "shirt-shop-example", "sista-rolls-flutter-app", "skills-introduction-to-github",
  "smart-plugin-portal", "sovereign-code-cosmos", "speak-to-ship-control",
  "speedtolead", "spy-scape-mustang-maXx", "strapi-cloud-template-blog-e8d531af4f",
  "strapi-template", "strapi-template-new-world-kids", "strix-ai-que-pedo--",
  "sweet-psilocybe-app", "sweet-psilocybe-landing", "sweetmushrooms", "synthia",
  "synthia-4.1", "synthia-demo", "tanda_cdmx", "terabithia", "terabithiaweb3",
  "the-minority-report", "the-pauli-effect", "the-smoke", "thekey", "thenetwork",
  "thepaulieffect", "thepuppetmaster", "tila-airplant-ecommerce", "trail-mixx",
  "trail-mixx-source-code",
  "ui-ux-pro-max-skill-ht27tps-github.com-nextlevelbuilder-ui-ux-pro-max-skill",
  "v0-leonradio-website", "vallarta-voyage-explorer", "veronika-mvp-export",
  "veronika-mvp-final", "voice-agents-fork", "voice-web-architect", "web3sass",
  "wherespauli", "world-matrix", "yappyverse", "yappyverse-drop-control",
  "yappyverse-genesis-project", "yappyverse-merch-forge", "yappyverse-newsletter",
  "youtube-monster-tran", "youtubemonster", "youtubemonster2.1",
  "youtubetranscripts",
];

// ─── Agent definitions ────────────────────────────────────────────────────────
export const AGENTS = [
  {
    id: 'AGENT-ZERO',
    name: 'Agent Zero',
    codename: 'AX-PAULI-BRAIN-002',
    role: 'Chief Brain — orchestrates entire ecosystem',
    org: 'The Pauli Effect',
    color: 'violet',
    isMain: true,
  },
  {
    id: 'AX-SYNTHIA-001',
    name: 'SYNTHIA',
    codename: 'AX-SYNTHIA-001',
    role: 'Kupuri Media — CDMX ops, sales, SAT/CFDI',
    org: 'Kupuri Media',
    color: 'pink',
    isMain: false,
  },
  {
    id: 'MACS',
    name: 'MAXX',
    codename: 'MACS-DIGITAL',
    role: 'Macs Digital Media — video, casino, research',
    org: 'Macs Digital Media',
    color: 'amber',
    isMain: false,
  },
  {
    id: 'NEW-WORLD-KIDS',
    name: 'NWK',
    codename: 'NEW-WORLD-KIDS',
    role: 'New World Kids — children content',
    org: 'New World Kids',
    color: 'green',
    isMain: false,
  },
  {
    id: 'CHEGGIE',
    name: 'CHEGGIE',
    codename: 'CHEGGIE-MEDIA',
    role: 'Cheggie Media — lifestyle finance',
    org: 'Cheggie Media',
    color: 'blue',
    isMain: false,
  },
  {
    id: 'AKASH',
    name: 'AKASH',
    codename: 'AKASH-ENGINE',
    role: 'Akash Engine — infrastructure & portfolio',
    org: 'Akash Engine',
    color: 'cyan',
    isMain: false,
  },
  {
    id: 'UNASSIGNED',
    name: 'Unassigned',
    codename: 'NONE',
    role: 'No agent assigned yet',
    org: '',
    color: 'slate',
    isMain: false,
  },
];

// ─── Default assignments (from personas.yaml) ─────────────────────────────────
const DEFAULT_ASSIGNMENTS: Record<string, string> = {
  // Kupuri Media → SYNTHIA
  "tanda_cdmx": "AX-SYNTHIA-001", "indigo-azul-catalog": "AX-SYNTHIA-001",
  "metamorfosis-wellness-journey": "AX-SYNTHIA-001", "agent-indigo": "AX-SYNTHIA-001",
  "pv-construction-platform": "AX-SYNTHIA-001", "synthia": "AX-SYNTHIA-001",
  "lapina": "AX-SYNTHIA-001", "ivettemilo": "AX-SYNTHIA-001",
  "rebanada-world-pizza-hub": "AX-SYNTHIA-001", "ivettemushrooms": "AX-SYNTHIA-001",
  "clandestino-rebellion-launch": "AX-SYNTHIA-001", "black-mirror": "AX-SYNTHIA-001",
  "que-pedo-cdmx": "AX-SYNTHIA-001", "morpho-metrics-academy": "AX-SYNTHIA-001",
  "kitchen-creations-planner-pro": "AX-SYNTHIA-001", "la-silueta": "AX-SYNTHIA-001",
  "lamonarchaintl": "AX-SYNTHIA-001", "AVATAR": "AX-SYNTHIA-001",
  "sweetmushrooms": "AX-SYNTHIA-001", "tila-airplant-ecommerce": "AX-SYNTHIA-001",
  "merlina": "AX-SYNTHIA-001", "kupuri-media-website": "AX-SYNTHIA-001",
  "strix-ai-que-pedo--": "AX-SYNTHIA-001", "agent-kupuri-template": "AX-SYNTHIA-001",
  "Kupuri-studios": "AX-SYNTHIA-001", "kupuri-studios-landing": "AX-SYNTHIA-001",
  // Macs Digital
  "maxx-craft": "MACS", "macs-agent-portal": "MACS", "maxx-clipz": "MACS",
  "MAXX-Research": "MACS", "maxx-coze-studio": "MACS", "balldontlie": "MACS",
  "MAXX-Video-Agent": "MACS", "Agentic-AIGC-MAXX-EDITS": "MACS",
  "maxx-casino-portal": "MACS", "maxxclipz": "MACS", "postiz-maxx-clipz": "MACS",
  "spy-scape-mustang-maXx": "MACS",
  // New World Kids
  "botanical-memories": "NEW-WORLD-KIDS", "newworldkids": "NEW-WORLD-KIDS",
  "strapi-template-new-world-kids": "NEW-WORLD-KIDS",
  // Cheggie Media
  "cheggie-lifestyle-finance": "CHEGGIE", "dispatchhelper2": "CHEGGIE",
  "CHEGGIE-AI-Trader": "CHEGGIE",
  // Akash Engine
  "akash-orbit-platform": "AKASH", "akash-engine-2.0": "AKASH",
  "akash-last-edit": "AKASH", "akash-master-files": "AKASH",
  "akash-master-files-2": "AKASH", "akash-master-files-3": "AKASH",
  "akash-master-files.2.0": "AKASH", "akash-master.1.0": "AKASH",
  "AKASHPORTFOLIO": "AKASH",
};

// Agent Zero gets everything else (The Pauli Effect)
ALL_REPOS.forEach(repo => {
  if (!DEFAULT_ASSIGNMENTS[repo]) {
    DEFAULT_ASSIGNMENTS[repo] = 'AGENT-ZERO';
  }
});

// ─── Persistence ──────────────────────────────────────────────────────────────
const DATA_PATH = join(process.cwd(), 'server', 'data', 'repo_assignments.json');

function loadAssignments(): Record<string, string> {
  try {
    if (existsSync(DATA_PATH)) {
      return JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_ASSIGNMENTS };
}

function saveAssignments(assignments: Record<string, string>): void {
  try {
    const dir = join(process.cwd(), 'server', 'data');
    if (!existsSync(dir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(DATA_PATH, JSON.stringify(assignments, null, 2));
  } catch (err) {
    console.error('[repos] Failed to persist assignments:', err);
  }
}

let assignments = loadAssignments();

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/repos — all repos with assignment info
repoRoutes.get('/', (c) => {
  const query = (c.req.query('q') || '').toLowerCase();
  const agentFilter = c.req.query('agent') || '';

  let repos = ALL_REPOS.map(name => ({
    name,
    agent: assignments[name] || 'UNASSIGNED',
  }));

  if (query) {
    repos = repos.filter(r => r.name.toLowerCase().includes(query));
  }
  if (agentFilter) {
    repos = repos.filter(r => r.agent === agentFilter);
  }

  return c.json({
    repos,
    total: ALL_REPOS.length,
    filtered: repos.length,
  });
});

// GET /api/repos/agents — agents with counts
repoRoutes.get('/agents', (c) => {
  const counts: Record<string, number> = {};
  AGENTS.forEach(a => { counts[a.id] = 0; });
  counts['UNASSIGNED'] = 0;

  ALL_REPOS.forEach(repo => {
    const agent = assignments[repo] || 'UNASSIGNED';
    counts[agent] = (counts[agent] || 0) + 1;
  });

  const result = AGENTS.map(a => ({
    ...a,
    repoCount: counts[a.id] || 0,
  }));

  return c.json({ agents: result, totalRepos: ALL_REPOS.length });
});

// PATCH /api/repos/:name/assign — update a single repo's agent
repoRoutes.patch('/:name/assign', async (c) => {
  const repoName = decodeURIComponent(c.req.param('name'));
  const body = await c.req.json<{ agent: string }>();

  if (!ALL_REPOS.includes(repoName)) {
    return c.json({ error: `Repo "${repoName}" not found` }, 404);
  }
  if (!AGENTS.find(a => a.id === body.agent)) {
    return c.json({ error: `Agent "${body.agent}" not found` }, 400);
  }

  assignments[repoName] = body.agent;
  saveAssignments(assignments);

  return c.json({
    success: true,
    repo: repoName,
    agent: body.agent,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/repos/bulk-assign — assign multiple repos at once
repoRoutes.post('/bulk-assign', async (c) => {
  const body = await c.req.json<{ repos: string[]; agent: string }>();

  if (!AGENTS.find(a => a.id === body.agent)) {
    return c.json({ error: `Agent "${body.agent}" not found` }, 400);
  }

  const updated: string[] = [];
  body.repos.forEach(repo => {
    if (ALL_REPOS.includes(repo)) {
      assignments[repo] = body.agent;
      updated.push(repo);
    }
  });

  saveAssignments(assignments);
  return c.json({ success: true, updated, count: updated.length });
});

// GET /api/repos/export — export full assignment map
repoRoutes.get('/export', (c) => {
  const byAgent: Record<string, string[]> = {};
  AGENTS.forEach(a => { byAgent[a.id] = []; });
  byAgent['UNASSIGNED'] = [];

  ALL_REPOS.forEach(repo => {
    const agent = assignments[repo] || 'UNASSIGNED';
    if (!byAgent[agent]) byAgent[agent] = [];
    byAgent[agent].push(repo);
  });

  return c.json({
    generatedAt: new Date().toISOString(),
    totalRepos: ALL_REPOS.length,
    byAgent,
  });
});
