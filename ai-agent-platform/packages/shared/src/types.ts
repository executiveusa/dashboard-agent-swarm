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

export type AgentStreamEvent =
  | {
      type: 'status';
      status: 'queued' | 'running' | 'completed' | 'failed';
      message?: string;
      progress?: number;
      timestamp: string;
    }
  | {
      type: 'tool';
      tool: ToolName | string;
      status: 'start' | 'complete' | 'error';
      message?: string;
      payload?: Record<string, unknown>;
      timestamp: string;
    }
  | {
      type: 'chunk';
      content: string;
      timestamp: string;
    }
  | {
      type: 'result';
      agent: AgentName;
      output: string;
      steps?: Array<Record<string, unknown>>;
      metadata?: Record<string, unknown>;
      timestamp: string;
    }
  | {
      type: 'error';
      error: string;
      timestamp: string;
    };

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
    recordStructured?: (event: StructuredAuditEvent) => Promise<void>;
    time?: <T>(event: Omit<StructuredAuditEvent, 'action' | 'durationMs' | 'metadata'> & {
      actionName?: string;
      metadata?: Record<string, unknown>;
    }, run: () => Promise<T>) => Promise<T>;
  };
  events?: {
    emit: (event: AgentStreamEvent) => void;
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
  onEvent?: (event: AgentStreamEvent) => void;
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
  responseText?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
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

/**
 * Environment configuration for the AI Agent Platform.
 * Contains credentials, API endpoints, and runtime settings for Lovable Cloud deployment.
 */
export interface EnvConfig {
  /** Supabase project URL used by the Edge runtime and frontend */
  SUPABASE_URL: string;
  /** Supabase anonymous key for client-side authentication */
  SUPABASE_ANON_KEY: string;
  /** Secret for signing Edge-issued JWT tokens */
  JWT_SECRET: string;
  /** Supabase storage bucket name for artifacts (default: 'artifacts') */
  SUPABASE_ARTIFACTS_BUCKET: string;
  /** Time-to-live in seconds for Supabase signed URLs (default: 3600) */
  SUPABASE_SIGNED_URL_TTL: number;
  /** Optional API key for OpenRouter LLM service */
  OPENROUTER_API_KEY?: string;
  /** Optional API key for OpenAI API */
  OPENAI_API_KEY?: string;
  /** Base URL for Ollama local LLM endpoint (default: 'http://localhost:11434') */
  OLLAMA_BASE_URL: string;
  /** Base URL for LM Studio local LLM endpoint (default: 'http://localhost:1234/v1') */
  LM_STUDIO_BASE_URL: string;
  /** Open Interpreter mode: 'cloud' calls Lovable Edge tools, 'local' proxies to local runner */
  OI_MODE: 'cloud' | 'local';
  /** Optional path to Playwright Chromium executable for browser automation */
  PLAYWRIGHT_CHROMIUM_PATH?: string;
  /** Internal URL of the local Open Interpreter runner (default: 'http://localhost:3333') */
  LOCAL_OI_PROXY_URL: string;
  /** Optional Lovable Cloud Open Interpreter API endpoint URL */
  OPEN_INTERPRETER_API_URL?: string;
  /** Optional API key for authenticating with Lovable Cloud Open Interpreter */
  OPEN_INTERPRETER_API_KEY?: string;
  /** Optional API key for Firecrawl web scraping service */
  FIRECRAWL_API_KEY?: string;
  /** Base URL for Firecrawl API (default: 'https://api.firecrawl.dev') */
  FIRECRAWL_BASE_URL: string;
  /** Optional base URL for Rube integration service */
  RUBE_BASE_URL?: string;
  /** Optional API key for Rube service authentication */
  RUBE_API_KEY?: string;
  /** Optional OAuth client ID for Rube service */
  RUBE_OAUTH_CLIENT_ID?: string;
  /** Optional OAuth client secret for Rube service */
  RUBE_OAUTH_CLIENT_SECRET?: string;
  /** Optional API key for VAPI voice service integration */
  VAPI_API_KEY?: string;
  /** Optional API key for Voiceflow conversational AI integration */
  VOICEFLOW_API_KEY?: string;
  /** Whether the LLM router should try free models first before paid fallback (default: true) */
  ROUTER_FREE_FIRST: boolean;
  /** Cron expression for optimizer background job execution (default: every 30 minutes) */
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

export type AuditEventCategory = 'agent' | 'tool' | 'workflow';

export interface StructuredAuditEvent {
  id?: string;
  requestId?: string;
  sessionId?: string;
  category: AuditEventCategory;
  name: string;
  action: 'start' | 'finish' | 'error';
  durationMs?: number;
  costUsd?: number;
  metadata?: Record<string, unknown>;
  timestamp?: string;
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
