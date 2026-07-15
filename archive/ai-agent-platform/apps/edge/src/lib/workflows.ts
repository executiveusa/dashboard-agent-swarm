import yaml from 'js-yaml';
import pLimit from 'p-limit';
import {
  workflowSchema,
  type WorkflowDefinition,
  type WorkflowStepResult,
  type StructuredAuditEvent,
} from '@ai-agent-platform/shared';

export interface WorkflowRuntime {
  runAgentTask: (step: { id: string; agent: string; instructions: string; inputs?: Record<string, unknown> }) => Promise<unknown>;
  callService: (service: string, params: Record<string, unknown>) => Promise<unknown>;
  runCode: (runtime: 'python' | 'node', source: string, inputs?: Record<string, unknown>) => Promise<unknown>;
  runBrowser: (actions: Array<{ verb: string; args?: unknown[] }>) => Promise<unknown>;
  runFirecrawl: (input: { instruction: string; url?: string; mode?: string }) => Promise<unknown>;
}

export interface ExecuteWorkflowOptions {
  inputs?: Record<string, unknown>;
  concurrency?: number;
  audit?: {
    recordStructured?: (event: StructuredAuditEvent) => Promise<void>;
    time?: <T>(
      event: Omit<StructuredAuditEvent, 'action' | 'durationMs' | 'timestamp'> & { metadata?: Record<string, unknown> },
      run: () => Promise<T>,
    ) => Promise<T>;
  };
  requestId?: string;
  sessionId?: string;
}

export interface WorkflowExecutionResult {
  outputs: Record<string, unknown>;
  steps: WorkflowStepResult[];
}

export const parseWorkflow = (content: string): WorkflowDefinition => {
  const parsed = yaml.load(content);
  return workflowSchema.parse(parsed);
};

export const executeWorkflow = async (
  definition: WorkflowDefinition,
  runtime: WorkflowRuntime,
  options: ExecuteWorkflowOptions = {}
): Promise<WorkflowExecutionResult> => {
  const outputs: Record<string, unknown> = {};
  const steps: WorkflowStepResult[] = [];
  const limiter = pLimit(options.concurrency ?? 4);

  for (const step of definition.steps) {
    if (step.if && !evaluateCondition(step.if, { inputs: options.inputs ?? {}, outputs })) {
      steps.push({ stepId: step.id, success: true, output: 'skipped', attempts: 0 });
      continue;
    }

    const fanOutItems = step.fanOut ?? [step.inputs ?? {}];
    const tasks = fanOutItems.map((item) =>
      limiter(() => runStep(step, runtime, mergeInputs(options.inputs, item, outputs), options))
    );

    const collectAll = step.collect?.strategy !== 'first-success';
    const results = collectAll ? await Promise.all(tasks) : await collectUntilSuccess(tasks);

    const flattened = collectAll ? results : [results];
    const success = flattened.every((r) => r.success);
    const last = flattened[flattened.length - 1];
    outputs[step.id] = last.output;
    steps.push(...flattened);

    if (!success && options.audit?.recordStructured) {
      await options.audit.recordStructured({
        category: 'workflow',
        name: step.id,
        action: 'error',
        requestId: options.requestId,
        sessionId: options.sessionId,
        metadata: {
          lastError: flattened.find((r) => !r.success)?.error,
        },
      });
      break;
    }
  }

  return { outputs, steps };
};

const runStep = async (
  step: WorkflowDefinition['steps'][number],
  runtime: WorkflowRuntime,
  resolvedInputs: Record<string, unknown>,
  options: ExecuteWorkflowOptions
): Promise<WorkflowStepResult> => {
  const attempts = step.retries?.attempts ?? 1;
  const backoff = step.retries?.backoffMs ?? 1000;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const run = () => executeByType(step, runtime, resolvedInputs);
      const output = options.audit?.time
        ? await options.audit.time(
            {
              category: 'workflow',
              name: step.id,
              requestId: options.requestId,
              sessionId: options.sessionId,
              metadata: {
                type: step.type,
                attempt,
              },
            },
            run,
          )
        : await run();
      if (options.audit?.recordStructured) {
        await options.audit.recordStructured({
          category: 'workflow',
          name: step.id,
          action: 'finish',
          requestId: options.requestId,
          sessionId: options.sessionId,
          metadata: {
            type: step.type,
            attempt,
          },
        });
      }
      return { stepId: step.id, success: true, output, attempts: attempt };
    } catch (error) {
      lastError = error as Error;
      if (attempt < attempts) {
        await delay(backoff * attempt);
      }
    }
  }

  if (options.audit?.recordStructured) {
    await options.audit.recordStructured({
      category: 'workflow',
      name: step.id,
      action: 'error',
      requestId: options.requestId,
      sessionId: options.sessionId,
      metadata: {
        error: lastError?.message,
      },
    });
  }

  return {
    stepId: step.id,
    success: false,
    output: undefined,
    attempts,
    error: lastError?.message,
  };
};

const executeByType = async (
  step: WorkflowDefinition['steps'][number],
  runtime: WorkflowRuntime,
  resolvedInputs: Record<string, unknown>
): Promise<unknown> => {
  switch (step.type) {
    case 'agent_task':
      return runtime.runAgentTask({ id: step.id, agent: step.agent, instructions: step.instructions, inputs: resolvedInputs });
    case 'call_service':
      return runtime.callService(step.service, { ...step.params, ...resolvedInputs });
    case 'code_step':
      return runtime.runCode(step.runtime ?? 'python', step.source, resolvedInputs);
    case 'browse_step':
      return runtime.runBrowser(step.actions.map((action) => ({ ...action, args: action.args ?? [] })));
    case 'firecrawl_step':
      return runtime.runFirecrawl({ instruction: step.instruction, url: step.url, mode: step.mode });
    default:
      throw new Error(`Unsupported step type: ${(step as { type: string }).type}`);
  }
};

const collectUntilSuccess = async (
  tasks: Array<Promise<WorkflowStepResult>>
): Promise<WorkflowStepResult> => {
  for (const task of tasks) {
    const result = await task;
    if (result.success) {
      return result;
    }
  }
  return await tasks[tasks.length - 1];
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const mergeInputs = (
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown>,
  outputs: Record<string, unknown>
): Record<string, unknown> => ({
  ...(base ?? {}),
  ...override,
  outputs,
});

const evaluateCondition = (expression: string, context: Record<string, unknown>): boolean => {
  if (!expression) return true;
  const value = getProperty(context, expression);
  return Boolean(value);
};

const getProperty = (object: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, object);
};
