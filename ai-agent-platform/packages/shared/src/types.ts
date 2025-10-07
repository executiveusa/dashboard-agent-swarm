import type { z } from 'zod';
import type { workflowSchema } from './workflows/schema.js';

export type WorkflowDefinition = z.infer<typeof workflowSchema>;

export type AgentName =
  | 'ResearchAgent'
  | 'CodingAgent'
  | 'AutomatorAgent'
  | 'DataCleanerAgent'
  | 'VoiceAgent';

export type ToolName =
  | 'BrowserTool'
  | 'CodeTool'
  | 'FilesTool'
  | 'HTTPTool'
  | 'FirecrawlTool'
  | 'RubeTool'
  | 'SpeechTool';

export type TaskArchetype =
  | 'research'
  | 'coding'
  | 'automation'
  | 'data-cleaning'
  | 'voice'
  | 'general';

export interface TaskInput {
  id: string;
  archetype: TaskArchetype;
  instructions: string;
  metadata?: Record<string, unknown>;
  attachments?: Array<{
    name: string;
    type: string;
    url?: string;
    content?: string | ArrayBuffer;
  }>;
}

export interface AgentContext {
  userId?: string;
  sessionId?: string;
  requestId: string;
  env: EnvConfig;
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
  rateLimit?: {
    consume: (tokens: number) => Promise<boolean>;
  };
  audit?: {
    record: (event: AuditEvent) => Promise<void>;
    newEvent?: (type: string, message: string, payload?: Record<string, unknown>) => AuditEvent;
  };
}

export interface AgentResult {
  agent: AgentName;
  output: string;
  cost?: number;
  steps?: Array<Record<string, unknown>>;
  artifacts?: Array<{ name: string; url?: string; contentType?: string }>;
}

export interface RunTaskOptions {
  parallel?: boolean;
  fanOut?: TaskInput[];
}

export interface LLMDecision {
  provider: LLMProvider;
  model: string;
  reason: string;
  costEstimate: number;
}

export type LLMProvider = 'ollama' | 'lmStudio' | 'openRouter' | 'paidFallback';

export interface RouterDecision extends LLMDecision {
  attempted: Array<{
    provider: LLMProvider;
    model: string;
    success: boolean;
    latencyMs: number;
    tokensUsed?: number;
    error?: string;
  }>;
}

export interface OptimizerCacheKey {
  archetype: TaskArchetype;
  tool?: ToolName;
}

export interface OptimizerEntry {
  provider: LLMProvider;
  model: string;
  score: number;
  updatedAt: number;
}

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  JWT_SECRET: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OLLAMA_BASE_URL: string;
  LM_STUDIO_BASE_URL: string;
  OI_MODE: 'cloud' | 'local';
  PLAYWRIGHT_CHROMIUM_PATH?: string;
  LOCAL_OI_PROXY_URL: string;
  FIRECRAWL_API_KEY?: string;
  FIRECRAWL_BASE_URL: string;
  RUBE_BASE_URL?: string;
  RUBE_API_KEY?: string;
  VAPI_API_KEY?: string;
  VOICEFLOW_API_KEY?: string;
  ROUTER_FREE_FIRST: boolean;
  OPTIMIZER_CRON: string;
}

export interface AuditEvent {
  requestId: string;
  sessionId?: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowRunContext {
  workflow: WorkflowDefinition;
  trigger: {
    type: 'cron' | 'webhook' | 'storage' | 'manual';
    payload?: Record<string, unknown>;
  };
  inputs?: Record<string, unknown>;
}

export interface WorkflowStepResult {
  stepId: string;
  success: boolean;
  output?: unknown;
  attempts: number;
  error?: string;
}
