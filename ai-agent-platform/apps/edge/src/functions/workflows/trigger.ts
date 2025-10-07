import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { parseWorkflow, executeWorkflow, type WorkflowRuntime } from '../../lib/workflows.js';
import { createAuditLogger } from '../../lib/audit.js';
import { getEnv } from '../../lib/env.js';
import { runTask } from '../../lib/eigent.js';
import { rubeTool } from '../../lib/tools/rubeTool.js';
import { codeTool } from '../../lib/tools/codeTool.js';
import { browserTool } from '../../lib/tools/browserTool.js';
import { firecrawlTool } from '../../lib/tools/firecrawlTool.js';
import type { AgentContext, TaskInput } from '@ai-agent-platform/shared';
import { lovableApi } from '../../lib/lovable.js';

const requestSchema = z.object({
  workflowName: z.string().optional(),
  definition: z.string().optional(),
  trigger: z.object({
    type: z.enum(['cron', 'webhook', 'storage', 'manual']),
    payload: z.record(z.any()).optional(),
  }),
  inputs: z.record(z.any()).optional(),
});

export const handler = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = requestSchema.parse(await req.json());
  const definition = await resolveWorkflowDefinition(payload.workflowName, payload.definition);
  const env = getEnv();
  const requestId = randomUUID();
  const audit = createAuditLogger({ sessionId: payload.workflowName ?? requestId });

  const agentContext: AgentContext = {
    requestId,
    sessionId: payload.workflowName ?? requestId,
    env,
    logger: {
      info: (message, meta) => console.info(`[workflow:${requestId}] ${message}`, meta),
      warn: (message, meta) => console.warn(`[workflow:${requestId}] ${message}`, meta),
      error: (message, meta) => console.error(`[workflow:${requestId}] ${message}`, meta),
    },
    audit,
  };

  const runtime: WorkflowRuntime = {
    runAgentTask: async (step) => {
      const task: TaskInput = {
        id: `${step.id}-${randomUUID()}`,
        archetype: inferArchetype(step.agent),
        instructions: step.instructions,
        metadata: step.inputs ?? {},
      };
      const result = await runTask(task, agentContext);
      return result.output;
    },
    callService: async (service, params) => rubeTool.exec({ service: service as any, params }),
    runCode: async (runtimeType, source, inputs) => codeTool.execute({ runtime: runtimeType, source: interpolate(source, inputs) }),
    runBrowser: async (actions) => browserTool.execute({ actions: actions as any }),
    runFirecrawl: async (input) => firecrawlTool.execute(input as any),
  };

  const execution = await executeWorkflow(definition, runtime, {
    inputs: payload.inputs,
  });

  const event = audit.newEvent('workflow_run', `Workflow ${definition.name} executed`, {
    trigger: payload.trigger,
    outputs: execution.outputs,
  });
  await audit.record(event);

  return new Response(JSON.stringify({ requestId, ...execution }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

const resolveWorkflowDefinition = async (name?: string, inline?: string) => {
  if (inline) {
    return parseWorkflow(inline);
  }
  if (!name) {
    throw new Error('workflowName or definition required');
  }
  const definition = await lovableApi.fetchWorkflowDefinition(name);
  return parseWorkflow(definition);
};

const inferArchetype = (agent: string) => {
  switch (agent) {
    case 'ResearchAgent':
      return 'research';
    case 'CodingAgent':
      return 'coding';
    case 'AutomatorAgent':
      return 'automation';
    case 'DataCleanerAgent':
      return 'data-cleaning';
    case 'VoiceAgent':
      return 'voice';
    default:
      return 'general';
  }
};

const interpolate = (source: string, inputs?: Record<string, unknown>) => {
  if (!inputs) return source;
  return source.replace(/{{(.*?)}}/g, (_, key) => String(inputs[key.trim()] ?? ''));
};

