import {
  type AgentContext,
  type AgentName,
  type AgentResult,
  type AgentStreamEvent,
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

      emitToolEvent('Router', 'start', 'Selecting optimal research route');
      const decision = await routeLLM(task, simulateLLMExecution);
      context.logger.info('ResearchAgent routed', { decision });
      const routeEvent = context.audit?.newEvent?.('agent_routed', 'ResearchAgent selected provider', { decision });
      if (routeEvent && context.audit) {
        await context.audit.record(routeEvent);
      }
      emitToolEvent('Router', 'complete', `Routed via ${decision.model}`, decision as Record<string, unknown>);
      const actions = Array.isArray(task.metadata?.browserActions)
        ? (task.metadata?.browserActions as { verb: any; args?: any[] }[])
        : [];
      let browser;
      if (actions.length) {
        emitToolEvent('BrowserTool', 'start', `Executing ${actions.length} scripted actions`);
        browser = await browserTool.execute({ actions });
        emitToolEvent('BrowserTool', 'complete', 'Browser automation finished', browser as Record<string, unknown>);
      }
      let crawl;
      if (task.metadata?.firecrawl) {
        emitToolEvent('FirecrawlTool', 'start', 'Starting Firecrawl ingestion');
        crawl = await firecrawlTool.execute(task.metadata.firecrawl as any);
        emitToolEvent('FirecrawlTool', 'complete', 'Firecrawl completed', crawl as Record<string, unknown>);
      }
      let httpResponse;
      if (task.metadata?.probeUrl) {
        emitToolEvent('HTTPTool', 'start', `Fetching ${String(task.metadata.probeUrl)}`);
        httpResponse = await httpTool.execute({ url: String(task.metadata.probeUrl) });
        emitToolEvent('HTTPTool', 'complete', 'HTTP probe finished', httpResponse as Record<string, unknown>);
      }
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

      emitTool('Router', 'start', 'Selecting coding model');
      const decision = await routeLLM(task, simulateLLMExecution);
      emitTool('Router', 'complete', `Routing complete via ${decision.model}`, decision as Record<string, unknown>);
      emitTool('CodeTool', 'start', 'Executing generated code');
      const code = await codeTool.execute({ runtime: 'python', source: task.instructions });
      emitTool('CodeTool', 'complete', 'Code execution finished', code as Record<string, unknown>);
      if (task.metadata?.writePath && typeof task.metadata.writePath === 'string') {
        emitTool('FilesTool', 'start', `Writing output to ${task.metadata.writePath}`);
        await filesTool.write(task.metadata.writePath, code.stdout);
        emitTool('FilesTool', 'complete', 'File write completed');
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
      emitToolEvent('RubeTool', 'start', `Invoking automation service ${service}`);
      const result = await rubeTool.exec({ service: service as any, params: task.metadata?.params as any });
      emitToolEvent('RubeTool', 'complete', 'Automation finished', result as Record<string, unknown>);
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
      emitToolEvent('CodeTool', 'start', 'Running cleaning routine');
      const code = await codeTool.execute({ runtime: 'python', source: task.instructions });
      emitToolEvent('CodeTool', 'complete', 'Cleaning routine finished', code as Record<string, unknown>);
      if (task.metadata?.outputPath && typeof task.metadata.outputPath === 'string') {
        emitToolEvent('FilesTool', 'start', `Persisting cleaned data to ${task.metadata.outputPath}`);
        await filesTool.write(task.metadata.outputPath, code.stdout);
        emitToolEvent('FilesTool', 'complete', 'Data persisted to disk');
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
      emitToolEvent('Router', 'start', 'Selecting voice synthesis provider');
      const decision = await routeLLM(task, simulateLLMExecution);
      emitToolEvent('Router', 'complete', `Voice routed via ${decision.model}`, decision as Record<string, unknown>);
      emitToolEvent('SpeechTool', 'start', 'Generating spoken response');
      const audio = await speechTool.synthesize({ text: task.instructions });
      emitToolEvent('SpeechTool', 'complete', 'Speech synthesis complete', audio as Record<string, unknown>);
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

