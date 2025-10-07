import fetch from 'node-fetch';
import {
  type AgentContext,
  type AgentName,
  type AgentResult,
  type RunTaskOptions,
  type TaskInput,
} from '@ai-agent-platform/shared';
import { browserTool } from './tools/browserTool.js';
import { codeTool } from './tools/codeTool.js';
import { filesTool } from './tools/filesTool.js';
import { httpTool } from './tools/httpTool.js';
import { firecrawlTool } from './tools/firecrawlTool.js';
import { rubeTool } from './tools/rubeTool.js';
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

const agentRegistry: Record<AgentName, AgentDefinition> = {
  ResearchAgent: {
    name: 'ResearchAgent',
    capabilities: ['BrowserTool', 'HTTPTool', 'FirecrawlTool', 'RubeTool', 'Router'],
    handler: async (task, context) => {
      const llm = createLLMExecutor(task, context);
      const decision = await routeLLM(task, llm.executor, {
        requiredTools: ['BrowserTool', 'HTTPTool', 'FirecrawlTool'],
        audit: context.audit,
        taskId: task.id,
      });
      context.logger.info('ResearchAgent routed', { decision });
      const llmOutput = llm.getResponse();
      const actions = Array.isArray(task.metadata?.browserActions)
        ? (task.metadata?.browserActions as { verb: any; args?: any[] }[])
        : [];
      const browser = actions.length
        ? await browserTool.execute({ actions }, { sessionId: context.sessionId })
        : undefined;
      const crawl = task.metadata?.firecrawl
        ? await firecrawlTool.execute(task.metadata.firecrawl as any)
        : undefined;
      const httpResponse = task.metadata?.probeUrl
        ? await httpTool.execute({ url: String(task.metadata.probeUrl) })
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
      const llm = createLLMExecutor(task, context);
      const decision = await routeLLM(task, llm.executor, {
        requiredTools: ['CodeTool'],
        audit: context.audit,
        taskId: task.id,
      });
      const llmOutput = llm.getResponse();
      const code = await codeTool.execute({ runtime: 'python', source: task.instructions }, {
        sessionId: context.sessionId,
      });
      if (task.metadata?.writePath && typeof task.metadata.writePath === 'string') {
        await filesTool.write(task.metadata.writePath, code.stdout);
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
      const service = task.metadata?.service as string | undefined;
      if (!service) {
        throw new Error('AutomatorAgent requires metadata.service');
      }
      const result = await rubeTool.exec(
        { service: service as any, params: task.metadata?.params as any, userToken: task.metadata?.userToken as any },
        { sessionId: context.sessionId, audit: context.audit }
      );
      return { agent: 'AutomatorAgent', output: 'Automation executed', steps: [result] };
    },
  },
  DataCleanerAgent: {
    name: 'DataCleanerAgent',
    capabilities: ['CodeTool', 'FilesTool'],
    handler: async (task, context) => {
      const llm = createLLMExecutor(task, context);
      const decision = await routeLLM(task, llm.executor, {
        requiredTools: ['CodeTool'],
        audit: context.audit,
        taskId: task.id,
      });
      const llmOutput = llm.getResponse();
      const code = await codeTool.execute({ runtime: 'python', source: task.instructions }, {
        sessionId: context.sessionId,
      });
      if (task.metadata?.outputPath && typeof task.metadata.outputPath === 'string') {
        await filesTool.write(task.metadata.outputPath, code.stdout);
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
      const llm = createLLMExecutor(task, context);
      const decision = await routeLLM(task, llm.executor, {
        requiredTools: ['SpeechTool'],
        audit: context.audit,
        taskId: task.id,
      });
      const spokenText = llm.getResponse() ?? task.instructions;
      const audio = await speechTool.synthesize({ text: spokenText });
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
  if (options.fanOut?.length) {
    const tasks = options.parallel
      ? await Promise.all(options.fanOut.map((task) => runTask(task, context)))
      : await runSequential(options.fanOut, context);
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
  const dispatchEvent = context.audit?.newEvent?.('agent_dispatch', `Dispatching to ${agentName}`, { taskId: input.id });
  if (dispatchEvent && context.audit) {
    await context.audit.record(dispatchEvent);
  }
  return agent.handler(input, context);
};

const runSequential = async (tasks: TaskInput[], context: AgentContext): Promise<AgentResult[]> => {
  const results: AgentResult[] = [];
  for (const task of tasks) {
    results.push(await runTask(task, context));
  }
  return results;
};

export const listAgents = (): AgentDefinition[] => Object.values(agentRegistry);

