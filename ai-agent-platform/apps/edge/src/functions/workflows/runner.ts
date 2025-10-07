import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
import { getSupabaseClient } from '../../lib/db.js';
import { parseWorkflow, executeWorkflow, type WorkflowRuntime } from '../../lib/workflows.js';
import { createAuditLogger } from '../../lib/audit.js';
import { getEnv } from '../../lib/env.js';
import { runTask } from '../../lib/eigent.js';
import { rubeTool } from '../../lib/tools/rubeTool.js';
import { codeTool } from '../../lib/tools/codeTool.js';
import { browserTool } from '../../lib/tools/browserTool.js';
import { firecrawlTool } from '../../lib/tools/firecrawlTool.js';
import type { AgentContext, WorkflowDefinition, WorkflowStepResult } from '@ai-agent-platform/shared';

type TriggerType = 'cron' | 'webhook' | 'storage' | 'manual' | 'scheduled';

export interface WorkflowTriggerPayload {
  type: TriggerType;
  payload?: Record<string, unknown>;
}

export interface RunWorkflowArgs {
  definition: WorkflowDefinition;
  trigger: WorkflowTriggerPayload;
  inputs?: Record<string, unknown>;
  workflowSlug?: string;
}

export interface RunWorkflowResult {
  runId: string;
  outputs: Record<string, unknown>;
  steps: WorkflowStepResult[];
  status: 'succeeded' | 'failed';
}

const WORKFLOWS_DIR = fileURLToPath(new URL('../../../../../packages/shared/workflows', import.meta.url));

export const workflowSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-_/]+$/i, 'Workflow slug must be a file-friendly name');

export const loadWorkflowFromSlug = async (slug: string): Promise<{ slug: string; definition: WorkflowDefinition }>
 => {
  const safeSlug = workflowSlugSchema.parse(slug).replace(/\.ya?ml$/i, '');
  const candidate = path.join(WORKFLOWS_DIR, `${safeSlug}.yaml`);
  const content = await readFile(candidate, 'utf8');
  return { slug: safeSlug, definition: parseWorkflow(content) };
};

export const listWorkflowDefinitions = async (): Promise<Array<{ slug: string; definition: WorkflowDefinition }>> => {
  const entries = await readdir(WORKFLOWS_DIR);
  const yamlFiles = entries.filter((file) => file.endsWith('.yaml'));
  const definitions = await Promise.all(
    yamlFiles.map(async (file) => {
      const slug = file.replace(/\.yaml$/i, '');
      const content = await readFile(path.join(WORKFLOWS_DIR, file), 'utf8');
      return { slug, definition: parseWorkflow(content) };
    })
  );
  return definitions;
};

export const runWorkflowWithRecording = async ({
  definition,
  trigger,
  inputs,
  workflowSlug,
}: RunWorkflowArgs): Promise<RunWorkflowResult> => {
  const client = getSupabaseClient();
  const env = getEnv();
  const requestId = randomUUID();
  const audit = createAuditLogger({ sessionId: definition.name });

  const agentContext: AgentContext = {
    requestId,
    sessionId: definition.name,
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
      const taskResult = await runTask(
        {
          id: `${step.id}-${randomUUID()}`,
          archetype: inferArchetype(step.agent),
          instructions: step.instructions,
          metadata: step.inputs ?? {},
        },
        agentContext
      );
      return taskResult.output;
    },
    callService: async (service, params) => rubeTool.exec({ service: service as any, params }),
    runCode: async (runtimeType, source, runtimeInputs) =>
      codeTool.execute({ runtime: runtimeType, source: interpolate(source, runtimeInputs) }),
    runBrowser: async (actions) => browserTool.execute({ actions: actions as any }),
    runFirecrawl: async (input) => firecrawlTool.execute(input as any),
  };

  const { data: runRecord, error: insertError } = await client
    .from('workflow_runs')
    .insert({
      workflow_name: definition.name,
      workflow_slug: workflowSlug ?? null,
      trigger_type: trigger.type,
      trigger_payload: trigger.payload ?? null,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !runRecord) {
    throw new Error(`Failed to persist workflow run: ${insertError?.message ?? 'unknown error'}`);
  }

  const runId = runRecord.id as string;

  try {
    const execution = await executeWorkflow(definition, runtime, {
      inputs,
      concurrency: definition.concurrency?.steps ?? undefined,
    });

    const status: RunWorkflowResult['status'] = execution.steps.every((step) => step.success)
      ? 'succeeded'
      : 'failed';

    const artifacts = collectArtifacts(execution.steps);

    const { error: stepsError } = await client.from('workflow_steps').insert(
      execution.steps.map((step) => ({
        run_id: runId,
        step_id: step.stepId,
        status: deriveStepStatus(step),
        attempts: step.attempts,
        output: normalizeJson(step.output),
        error: step.error ?? null,
        artifacts: extractArtifacts(step.output),
      }))
    );

    if (stepsError) {
      throw new Error(`Failed to persist workflow steps: ${stepsError.message}`);
    }

    const { error: updateError } = await client
      .from('workflow_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        outputs: normalizeJson(execution.outputs),
        artifacts: artifacts.length ? artifacts : null,
      })
      .eq('id', runId);

    if (updateError) {
      throw new Error(`Failed to finalize workflow run: ${updateError.message}`);
    }

    const event = audit.newEvent?.('workflow_run', `Workflow ${definition.name} executed`, {
      trigger,
      outputs: execution.outputs,
      status,
    });
    if (event) {
      await audit.record(event);
    }

    return { runId, outputs: execution.outputs, steps: execution.steps, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown workflow error';

    await client
      .from('workflow_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error: message,
      })
      .eq('id', runId);

    throw error;
  }
};

const deriveStepStatus = (step: WorkflowStepResult): 'succeeded' | 'failed' | 'skipped' => {
  if (!step.success) {
    return 'failed';
  }
  if (typeof step.output === 'string' && step.output === 'skipped') {
    return 'skipped';
  }
  return 'succeeded';
};

const extractArtifacts = (output: unknown) => {
  if (output && typeof output === 'object' && 'artifacts' in (output as Record<string, unknown>)) {
    const artifacts = (output as Record<string, unknown>).artifacts;
    if (Array.isArray(artifacts)) {
      return artifacts;
    }
  }
  return null;
};

const collectArtifacts = (steps: WorkflowStepResult[]) => {
  return steps
    .map((step) => extractArtifacts(step.output))
    .filter((value): value is unknown[] => Array.isArray(value))
    .flat();
};

const normalizeJson = (value: unknown) => {
  try {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to normalize JSON payload for workflow run', error);
    return null;
  }
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
