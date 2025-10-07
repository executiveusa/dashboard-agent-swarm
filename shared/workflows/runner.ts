import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { z } from 'zod';
import type { WorkflowConfig, WorkflowStepConfig, WorkflowRole } from './types';

const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  triggers: z
    .array(
      z.object({
        type: z.union([z.literal('supabase'), z.literal('lovable')]),
        channel: z.string().optional(),
        schedule: z.string().optional(),
        table: z.string().optional(),
        event: z.enum(['INSERT', 'UPDATE', 'DELETE']).optional()
      })
    )
    .optional(),
  steps: z.array(
   steps: z.array(
     z.object({
       id: z.string(),
       role: z.enum(['planner', 'researcher', 'builder', 'reviewer'] as const),
       summary: z.string().optional(),
       input: z.record(z.unknown()).optional()
     })
   )
  )
});

export async function loadWorkflow(name: string): Promise<WorkflowConfig> {
  const workflowPath = resolveWorkflowPath(name);
  const file = await readFile(workflowPath, 'utf-8');
  const parsed = workflowSchema.parse(YAML.parse(file));
  return parsed as WorkflowConfig;
}

export function resolveWorkflowPath(name: string): string {
  const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
  return path.join(baseDir, `${name}.yaml`);
}

export interface WorkflowExecutionContext {
  requestId: string;
  goal: string;
  metadata?: Record<string, unknown>;
}

export type WorkflowStepExecutor = (step: WorkflowStepConfig, context: WorkflowExecutionContext) => Promise<unknown>;

export class WorkflowRunner {
  constructor(private readonly executor: WorkflowStepExecutor) {}

  async run(workflow: WorkflowConfig, context: WorkflowExecutionContext) {
    const results: unknown[] = [];

    for (const step of workflow.steps) {
      const result = await this.executor(step, context);
      results.push(result);
    }

    return {
      workflow: workflow.id,
      results
    };
  }
}
