import fetch from 'node-fetch';
import {
  type AgentContext,
  type AgentName,
  type AgentResult,
  type AgentStreamEvent,
  type RunTaskOptions,
  type TaskInput,
} from '@ai-agent-platform/shared';
import { browserTool, type BrowserToolInput } from './tools/browserTool.js';
import { codeTool } from './tools/codeTool.js';
import { filesTool } from './tools/filesTool.js';
import { httpTool } from './tools/httpTool.js';
import { firecrawlTool, type FirecrawlInput } from './tools/firecrawlTool.js';
import { rubeTool, type RubeExecInput } from './tools/rubeTool.js';
import { speechTool } from './tools/speechTool.js';
import { routeLLM, type RouteExecutor } from './router.js';
import { normalizeArtifacts } from './storage.js';

type ChatMessage = { role: 'system' | 'user'; content: string };

type LLMUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

interface LLMExecutorState {
  responseText?: string;
  usage?: LLMUsage;
}

interface LLMCallResult {
  text: string;
  usage?: LLMUsage;
}

const SYSTEM_PROMPT =
  'You are Lovable Cloud\'s multi-agent orchestrator. Provide concise, actionable outputs that downstream tools can execute.';

const truncate = (value: string, max = 2000): string => {
  if (!value) {
    return '';
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

const buildMessages = (task: TaskInput): ChatMessage[] => {
  const metadataBlock = task.metadata
    ? `\n\nContext JSON:\n${truncate(JSON.stringify(task.metadata, null, 2), 2000)}`
    : '';
  const attachmentLines = Array.isArray(task.attachments)
    ? task.attachments.slice(0, 5).map((attachment, index) => {
        const label = attachment.name ?? `Attachment ${index + 1}`;
        return `- ${label} (${attachment.type ?? 'unknown'})`;
      })
    : [];
  const attachmentBlock = attachmentLines.length
    ? `\n\nAttachments:\n${attachmentLines.join('\n')}${
        (task.attachments?.length ?? 0) > attachmentLines.length ? '\n- …' : ''
      }`
    : '';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${task.instructions}${metadataBlock}${attachmentBlock}`.trim() },
  ];
};

const createLLMExecutor = (task: TaskInput, context: AgentContext) => {
  const messages = buildMessages(task);
  const state: LLMExecutorState = {};
  const env = context.env;

  const executor: RouteExecutor = async (provider, model) => {
    const started = Date.now();
    try {
      const result = await callProvider(provider, model, messages, env);
      state.responseText = result.text;
      state.usage = result.usage;
      return {
        success: true,
        tokensUsed: result.usage?.totalTokens,
        latencyMs: Date.now() - started,
        responseText: result.text,
        tokenUsage: result.usage,
      };
    } catch (error) {
      context.logger.warn('LLM execution failed', {
        provider,
        model,
        error: (error as Error).message,
      });
      return {
        success: false,
        latencyMs: Date.now() - started,
        error: (error as Error).message,
      };
    }
  };

  return {
    executor,
    getResponse: () => state.responseText,
    getUsage: () => state.usage,
  };
};

const callProvider = async (
  provider: Parameters<RouteExecutor>[0],
  model: string,
  messages: ChatMessage[],
  env: AgentContext['env']
): Promise<LLMCallResult> => {
  switch (provider) {
    case 'ollama':
      return callOllama(env.OLLAMA_BASE_URL, model, messages);
    case 'lmStudio':
      return callOpenAICompatible(env.LM_STUDIO_BASE_URL, model, messages);
    case 'openRouter':
      return callOpenAICompatible('https://openrouter.ai/api/v1', model, messages, env.OPENROUTER_API_KEY, {
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'Lovable Cloud Agents',
      });
    case 'paidFallback':
      return callOpenAICompatible('https://api.openai.com/v1', model, messages, env.OPENAI_API_KEY);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

const callOllama = async (baseUrl: string, model: string, messages: ChatMessage[]): Promise<LLMCallResult> => {
  const url = `${baseUrl.replace(/\/?$/, '')}/api/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `status ${response.status}`;
    throw new Error(`Ollama error: ${message}`);
  }
  const promptTokens = typeof data?.prompt_eval_count === 'number' ? data.prompt_eval_count : undefined;
  const completionTokens = typeof data?.eval_count === 'number' ? data.eval_count : undefined;
  const usage: LLMUsage | undefined = promptTokens || completionTokens ? { promptTokens, completionTokens } : undefined;
  if (usage && promptTokens && completionTokens) {
    usage.totalTokens = promptTokens + completionTokens;
  }
  const text = typeof data?.message?.content === 'string' ? data.message.content : '';
  return { text: text.trim(), usage };
};

const callOpenAICompatible = async (
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  apiKey?: string,
  extraHeaders: Record<string, string> = {}
): Promise<LLMCallResult> => {
  const url = `${baseUrl.replace(/\/?$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : JSON.stringify(data);
    throw new Error(`LLM error (${url}): ${message}`);
  }

  const usage: LLMUsage | undefined = data?.usage
    ? {
        promptTokens: data.usage.prompt_tokens ?? undefined,
        completionTokens: data.usage.completion_tokens ?? undefined,
        totalTokens: data.usage.total_tokens ?? undefined,
      }
    : undefined;

  const text = data?.choices?.[0]?.message?.content ?? '';
  return { text: String(text).trim(), usage };
};

interface AgentDefinition {
  name: AgentName;
  capabilities: string[];
  handler: (task: TaskInput, context: AgentContext) => Promise<AgentResult>;
}

const asBrowserActions = (value: unknown): BrowserToolInput['actions'] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is BrowserToolInput['actions'][number] => {
    return (
      typeof item === 'object' &&
      item !== null &&
      'verb' in item &&
      typeof (item as { verb?: unknown }).verb === 'string'
    );
  }) as BrowserToolInput['actions'];
};

const isFirecrawlInput = (value: unknown): value is FirecrawlInput => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'instruction' in (value as Record<string, unknown>) &&
    typeof (value as { instruction?: unknown }).instruction === 'string'
  );
};

const asRubeParams = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const agentRegistry: Record<AgentName, AgentDefinition> = {
  ResearchAgent: {
    name: 'ResearchAgent',
    capabilities: ['BrowserTool', 'HTTPTool', 'FirecrawlTool', 'RubeTool', 'Router'],
    handler: async (task, context) => {
      const stamp = () => new Date().toISOString();
      const emitToolEvent = (
        tool: string,
        status: 'start' | 'complete' | 'error',
        message?: string,
        payload?: Record<string, unknown>
      ) => {
        context.events?.emit?.({
          type: 'tool',
          tool,
          status,
          message,
          payload,
          timestamp: stamp(),
        });
      };

      const llm = createLLMExecutor(task, context);
      const decision = await routeLLM(task, llm.executor, {
        requiredTools: ['BrowserTool', 'HTTPTool', 'FirecrawlTool'],
        audit: context.audit,
        taskId: task.id,
      });
      context.logger.info('ResearchAgent routed', { decision });
      const llmOutput = llm.getResponse();
      const actions = asBrowserActions(task.metadata?.browserActions);
      const browser =
        actions.length && context.audit?.time
          ? await context.audit.time(
              {
                category: 'tool',
                name: 'BrowserTool',
                requestId: context.requestId,
                sessionId: context.sessionId,
                metadata: { actions },
              },
              () => browserTool.execute({ actions }),
            )
          : actions.length
            ? await browserTool.execute({ actions })
            : undefined;
      const firecrawlInput = isFirecrawlInput(task.metadata?.firecrawl) ? task.metadata?.firecrawl : undefined;
      const crawl = firecrawlInput
        ? context.audit?.time
          ? await context.audit.time(
              {
                category: 'tool',
                name: 'FirecrawlTool',
                requestId: context.requestId,
                sessionId: context.sessionId,
                metadata: firecrawlInput,
              },
              () => firecrawlTool.execute(firecrawlInput),
            )
          : await firecrawlTool.execute(firecrawlInput)
        : undefined;
      const httpResponse = task.metadata?.probeUrl
        ? context.audit?.time
          ? await context.audit.time(
              {
                category: 'tool',
                name: 'HTTPTool',
                requestId: context.requestId,
                sessionId: context.sessionId,
                metadata: { url: String(task.metadata.probeUrl) },
              },
              () => httpTool.execute({ url: String(task.metadata.probeUrl) }),
            )
          : await httpTool.execute({ url: String(task.metadata.probeUrl) })
        : undefined;
      const artifacts = normalizeArtifacts([...(browser?.artifacts ?? [])]);
      return {
        agent: 'ResearchAgent',
        output: llmOutput ?? `Synthesized research using ${decision.model}.`,
        steps: [
          decision,
          llmOutput ? { llm: llmOutput } : undefined,
          browser ? { browser } : undefined,
          crawl ? { firecrawl: crawl } : undefined,
          httpResponse ? { http: httpResponse } : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
        artifacts,
      };
    },
  },
  CodingAgent: {
    name: 'CodingAgent',
    capabilities: ['CodeTool', 'FilesTool', 'Router'],
    handler: async (task, context) => {
      const stamp = () => new Date().toISOString();
      const emitTool = (
        tool: string,
        status: 'start' | 'complete' | 'error',
        message?: string,
        payload?: Record<string, unknown>
      ) => {
        context.events?.emit?.({
          type: 'tool',
          tool,
          status,
          message,
          payload,
          timestamp: stamp(),
        });
      };

      const llm = createLLMExecutor(task, context);
      const decision = await routeLLM(task, llm.executor, {
        requiredTools: ['CodeTool'],
        audit: context.audit,
        taskId: task.id,
      });
      const llmOutput = llm.getResponse();
      const code = context.audit?.time
        ? await context.audit.time(
            {
              category: 'tool',
              name: 'CodeTool',
              requestId: context.requestId,
              sessionId: context.sessionId,
              metadata: { runtime: 'python', taskId: task.id },
            },
            () => codeTool.execute({ runtime: 'python', source: task.instructions }),
          )
        : await codeTool.execute({ runtime: 'python', source: task.instructions });
      if (task.metadata?.writePath && typeof task.metadata.writePath === 'string') {
        emitTool('FilesTool', 'start', `Writing output to ${task.metadata.writePath}`);
        await filesTool.write(task.metadata.writePath, code.stdout);
        emitTool('FilesTool', 'complete', 'File write completed');
      }
      const stdoutSummary = code.stdout.trim()
        ? truncate(code.stdout.trim(), 1500)
        : 'Code executed without stdout.';
      const output = llmOutput ? `${llmOutput}\n\n${stdoutSummary}` : stdoutSummary;
      return {
        agent: 'CodingAgent',
        output,
        steps: [
          decision,
          llmOutput ? { llm: llmOutput } : undefined,
          { stdout: code.stdout, stderr: code.stderr },
        ].filter(Boolean) as Array<Record<string, unknown>>,
        artifacts: normalizeArtifacts(code.artifacts),
      };
    },
  },
  AutomatorAgent: {
    name: 'AutomatorAgent',
    capabilities: ['RubeTool', 'Workflows', 'FilesTool'],
    handler: async (task, context) => {
      const stamp = () => new Date().toISOString();
      const emitToolEvent = (
        tool: string,
        status: 'start' | 'complete' | 'error',
        message?: string,
        payload?: Record<string, unknown>
      ) => {
        context.events?.emit?.({
          type: 'tool',
          tool,
          status,
          message,
          payload,
          timestamp: stamp(),
        });
      };
      const service = task.metadata?.service as string | undefined;
      if (!service) {
        throw new Error('AutomatorAgent requires metadata.service');
      }
      const params = asRubeParams(task.metadata?.params);
      const result = context.audit?.time
        ? await context.audit.time(
            {
              category: 'tool',
              name: 'RubeTool',
              requestId: context.requestId,
              sessionId: context.sessionId,
              metadata: { service, params },
            },
            () => rubeTool.exec({ service: service as RubeExecInput['service'], params }),
          )
        : await rubeTool.exec({ service: service as RubeExecInput['service'], params });
      return { agent: 'AutomatorAgent', output: 'Automation executed', steps: [result] };
    },
  },
  DataCleanerAgent: {
    name: 'DataCleanerAgent',
    capabilities: ['CodeTool', 'FilesTool'],
    handler: async (task, context) => {
      const stamp = () => new Date().toISOString();
      const emitToolEvent = (
        tool: string,
        status: 'start' | 'complete' | 'error',
        message?: string,
        payload?: Record<string, unknown>
      ) => {
        context.events?.emit?.({
          type: 'tool',
          tool,
          status,
          message,
          payload,
          timestamp: stamp(),
        });
      };
      const llm = createLLMExecutor(task, context);
      const decision = await routeLLM(task, llm.executor, {
        requiredTools: ['CodeTool'],
        audit: context.audit,
        taskId: task.id,
      });
      const llmOutput = llm.getResponse();
      const code = context.audit?.time
        ? await context.audit.time(
            {
              category: 'tool',
              name: 'CodeTool',
              requestId: context.requestId,
              sessionId: context.sessionId,
              metadata: { runtime: 'python', taskId: task.id },
            },
            () => codeTool.execute({ runtime: 'python', source: task.instructions }),
          )
        : await codeTool.execute({ runtime: 'python', source: task.instructions });
      if (task.metadata?.outputPath && typeof task.metadata.outputPath === 'string') {
        emitToolEvent('FilesTool', 'start', `Persisting cleaned data to ${task.metadata.outputPath}`);
        await filesTool.write(task.metadata.outputPath, code.stdout);
        emitToolEvent('FilesTool', 'complete', 'Data persisted to disk');
      }
      const normalizedArtifacts = normalizeArtifacts(code.artifacts);
      const summary = llmOutput
        ? `${llmOutput}\n\nPreview:\n${truncate(code.stdout, 1000)}`
        : `Data cleaned. Preview:\n${truncate(code.stdout, 1000)}`;
      return {
        agent: 'DataCleanerAgent',
        output: summary,
        steps: [
          decision,
          llmOutput ? { llm: llmOutput } : undefined,
          { stdout: code.stdout },
        ].filter(Boolean) as Array<Record<string, unknown>>,
        artifacts: normalizedArtifacts,
      };
    },
  },
  VoiceAgent: {
    name: 'VoiceAgent',
    capabilities: ['SpeechTool', 'Router'],
    handler: async (task, context) => {
      const stamp = () => new Date().toISOString();
      const emitToolEvent = (
        tool: string,
        status: 'start' | 'complete' | 'error',
        message?: string,
        payload?: Record<string, unknown>
      ) => {
        context.events?.emit?.({
          type: 'tool',
          tool,
          status,
          message,
          payload,
          timestamp: stamp(),
        });
      };
      const llm = createLLMExecutor(task, context);
      const decision = await routeLLM(task, llm.executor, {
        requiredTools: ['SpeechTool'],
        audit: context.audit,
        taskId: task.id,
      });
      const spokenText = llm.getResponse() ?? task.instructions;
      const audio = context.audit?.time
        ? await context.audit.time(
            {
              category: 'tool',
              name: 'SpeechTool',
              requestId: context.requestId,
              sessionId: context.sessionId,
              metadata: { instructions: task.instructions },
            },
            () => speechTool.synthesize({ text: task.instructions }),
          )
        : await speechTool.synthesize({ text: task.instructions });
      return {
        agent: 'VoiceAgent',
        output: spokenText,
        steps: [
          decision,
          { audio },
        ],
      };
    },
  },
};

const agentByArchetype: Record<TaskInput['archetype'], AgentName> = {
  research: 'ResearchAgent',
  coding: 'CodingAgent',
  automation: 'AutomatorAgent',
  'data-cleaning': 'DataCleanerAgent',
  voice: 'VoiceAgent',
  general: 'ResearchAgent',
};

export const runTask = async (
  input: TaskInput,
  context: AgentContext,
  options: RunTaskOptions = {}
): Promise<AgentResult> => {
  const emit = options.onEvent;
  const contextWithEvents = emit ? { ...context, events: { emit } } : context;

  if (options.fanOut?.length) {
    const tasks = options.parallel
      ? await Promise.all(
          options.fanOut.map((task) => runTask(task, contextWithEvents, { onEvent: emit }))
        )
      : await runSequential(options.fanOut, contextWithEvents, emit);
    const combinedOutput = tasks.map((result) => result.output).join('\n');
    return {
      agent: agentByArchetype[input.archetype],
      output: combinedOutput,
      steps: tasks.flatMap((result) => result.steps ?? []),
      artifacts: tasks.flatMap((result) => result.artifacts ?? []),
    };
  }

  const agentName = agentByArchetype[input.archetype] ?? 'ResearchAgent';
  const agent = agentRegistry[agentName];
  if (!agent) {
    throw new Error(`Agent not found for archetype ${input.archetype}`);
  }

  if (context.rateLimit) {
    const allowed = await context.rateLimit.consume(1);
    if (!allowed) {
      throw new Error('Rate limit exceeded');
    }
  }

  context.logger.info('Dispatching task', { agent: agentName, task: input.id });
  emit?.({
    type: 'status',
    status: 'running',
    message: `Dispatching ${input.id} to ${agentName}`,
    progress: 10,
    timestamp: new Date().toISOString(),
  });
  const dispatchEvent = context.audit?.newEvent?.('agent_dispatch', `Dispatching to ${agentName}`, { taskId: input.id });
  if (dispatchEvent && context.audit) {
    await context.audit.record(dispatchEvent);
  }
  const result = await agent.handler(input, contextWithEvents);
  emit?.({
    type: 'result',
    agent: result.agent,
    output: result.output,
    steps: result.steps,
    metadata: result.artifacts ? { artifacts: result.artifacts } : undefined,
    timestamp: new Date().toISOString(),
  });
  emit?.({
    type: 'status',
    status: 'completed',
    message: `${agentName} completed ${input.id}`,
    progress: 100,
    timestamp: new Date().toISOString(),
  });
  return result;

  if (context.audit?.time) {
    return context.audit.time(
      {
        category: 'agent',
        name: agentName,
        requestId: context.requestId,
        sessionId: context.sessionId,
        metadata: {
          taskId: input.id,
          archetype: input.archetype,
        },
      },
      () => agent.handler(input, context),
    );
  }

  return agent.handler(input, context);
};

const runSequential = async (
  tasks: TaskInput[],
  context: AgentContext,
  emit?: (event: AgentStreamEvent) => void
): Promise<AgentResult[]> => {
  const results: AgentResult[] = [];
  for (const task of tasks) {
    results.push(await runTask(task, context, { onEvent: emit }));
  }
  return results;
};

export const listAgents = (): AgentDefinition[] => Object.values(agentRegistry);

