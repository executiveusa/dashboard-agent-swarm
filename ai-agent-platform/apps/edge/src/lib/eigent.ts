import {
  type AgentContext,
  type AgentName,
  type AgentResult,
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
import { routeLLM } from './router.js';

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
      const decision = await routeLLM(task, simulateLLMExecution);
      context.logger.info('ResearchAgent routed', { decision });
      const routeEvent = context.audit?.newEvent?.('agent_routed', 'ResearchAgent selected provider', { decision });
      if (routeEvent && context.audit) {
        await context.audit.record(routeEvent);
      }
      if (context.audit?.recordStructured) {
        await context.audit.recordStructured({
          category: 'agent',
          name: 'Router',
          action: 'finish',
          requestId: context.requestId,
          sessionId: context.sessionId,
          metadata: { decision },
        });
      }
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
      return {
        agent: 'ResearchAgent',
        output: `Synthesized research using ${decision.model}.`,
        steps: [decision, browser, crawl, httpResponse].filter(Boolean) as Array<Record<string, unknown>>,
      };
    },
  },
  CodingAgent: {
    name: 'CodingAgent',
    capabilities: ['CodeTool', 'FilesTool', 'Router'],
    handler: async (task) => {
      const decision = await routeLLM(task, simulateLLMExecution);
      if (context.audit?.recordStructured) {
        await context.audit.recordStructured({
          category: 'agent',
          name: 'Router',
          action: 'finish',
          requestId: context.requestId,
          sessionId: context.sessionId,
          metadata: { decision },
        });
      }
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
        await filesTool.write(task.metadata.writePath, code.stdout);
      }
      return {
        agent: 'CodingAgent',
        output: `Executed code snippet with ${decision.model}. Stdout length: ${code.stdout.length}.`,
        steps: [decision, { stdout: code.stdout }],
        artifacts: code.artifacts,
      };
    },
  },
  AutomatorAgent: {
    name: 'AutomatorAgent',
    capabilities: ['RubeTool', 'Workflows', 'FilesTool'],
    handler: async (task) => {
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
    handler: async (task) => {
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
        await filesTool.write(task.metadata.outputPath, code.stdout);
      }
      return {
        agent: 'DataCleanerAgent',
        output: 'Data cleaned and summary generated.',
        steps: [{ stdout: code.stdout }],
        artifacts: code.artifacts,
      };
    },
  },
  VoiceAgent: {
    name: 'VoiceAgent',
    capabilities: ['SpeechTool', 'Router'],
    handler: async (task) => {
      const decision = await routeLLM(task, simulateLLMExecution);
      if (context.audit?.recordStructured) {
        await context.audit.recordStructured({
          category: 'agent',
          name: 'Router',
          action: 'finish',
          requestId: context.requestId,
          sessionId: context.sessionId,
          metadata: { decision },
        });
      }
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
        output: `Voice response generated via ${decision.model}`,
        steps: [decision, audio],
      };
    },
  },
};

const simulateLLMExecution = async () => ({ success: true, tokensUsed: 0, latencyMs: 0, error: undefined });

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

const runSequential = async (tasks: TaskInput[], context: AgentContext): Promise<AgentResult[]> => {
  const results: AgentResult[] = [];
  for (const task of tasks) {
    results.push(await runTask(task, context));
  }
  return results;
};

export const listAgents = (): AgentDefinition[] => Object.values(agentRegistry);

