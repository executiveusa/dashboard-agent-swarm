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
import { routeLLM } from './router.js';

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
      const decision = await routeLLM(task, simulateLLMExecution);
      context.logger.info('ResearchAgent routed', { decision });
      const routeEvent = context.audit?.newEvent?.('agent_routed', 'ResearchAgent selected provider', { decision });
      if (routeEvent && context.audit) {
        await context.audit.record(routeEvent);
      }
      const actions = Array.isArray(task.metadata?.browserActions)
        ? (task.metadata?.browserActions as { verb: any; args?: any[] }[])
        : [];
      const browser = actions.length ? await browserTool.execute({ actions }) : undefined;
      const crawl = task.metadata?.firecrawl
        ? await firecrawlTool.execute(task.metadata.firecrawl as any)
        : undefined;
      const httpResponse = task.metadata?.probeUrl
        ? await httpTool.execute({ url: String(task.metadata.probeUrl) })
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
      const code = await codeTool.execute({ runtime: 'python', source: task.instructions });
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
      const result = await rubeTool.exec({ service: service as any, params: task.metadata?.params as any });
      return { agent: 'AutomatorAgent', output: 'Automation executed', steps: [result] };
    },
  },
  DataCleanerAgent: {
    name: 'DataCleanerAgent',
    capabilities: ['CodeTool', 'FilesTool'],
    handler: async (task) => {
      const code = await codeTool.execute({ runtime: 'python', source: task.instructions });
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
      const audio = await speechTool.synthesize({ text: task.instructions });
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

