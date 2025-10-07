import { EigentClient } from 'eigent';
import { LemonSandbox } from 'lemonai';
import { RubeClient } from 'rube-mcp-client';
import { v4 as uuid } from 'uuid';
import { createWorkers, registerSandboxTools, AgentWorker, WorkerTask, WorkerResult } from './workers';
import { WorkflowRunner, loadWorkflow } from '../../shared/workflows/runner';
import type { WorkflowExecutionContext } from '../../shared/workflows/runner';
import { z } from 'zod';

export interface RouterEnvironment {
  eigentApiKey: string;
  eigentEndpoint?: string;
  lemonApiKey: string;
  rubeApiUrl: string;
  rubeApiKey?: string;
  defaultWorkflow?: string;
}

export interface RouteRequest {
  goal: string;
  context?: Record<string, unknown>;
  workflow?: string;
}

export interface RouteResponse {
  requestId: string;
  workflow: string;
  results: WorkerResult[];
  transcript: string[];
}

const routerEnvSchema: z.ZodType<RouterEnvironment> = z.object({
  eigentApiKey: z.string(),
  eigentEndpoint: z.string().optional(),
  lemonApiKey: z.string(),
  rubeApiUrl: z.string(),
  rubeApiKey: z.string().optional(),
  defaultWorkflow: z.string().optional()
});

export class AgentRouter {
  private eigent: EigentClient;
  private sandbox: LemonSandbox;
  private rube: RubeClient;
  private workers: AgentWorker[];
  private env: RouterEnvironment;

  constructor(environment: RouterEnvironment) {
    this.env = routerEnvSchema.parse(environment);

    this.eigent = new EigentClient({
      apiKey: this.env.eigentApiKey,
      endpoint: this.env.eigentEndpoint,
      project: 'dashboard-agent-swarm'
    });

    this.sandbox = new LemonSandbox({
      apiKey: this.env.lemonApiKey
    });

    this.rube = new RubeClient({
      baseUrl: this.env.rubeApiUrl,
      apiKey: this.env.rubeApiKey
    });

    registerSandboxTools(this.sandbox, this.rube);
    this.workers = createWorkers();
  }

  async route(request: RouteRequest): Promise<RouteResponse> {
    const requestId = uuid();
    const workflowName = request.workflow ?? this.env.defaultWorkflow ?? 'default';
    const workflow = await loadWorkflow(workflowName);

    const transcript: string[] = [`Workflow: ${workflowName}`];

    const runner = new WorkflowRunner(async (step, executionContext: WorkflowExecutionContext) => {
      const worker = await this.selectWorker(step.role, request.goal, request.context);
      const task: WorkerTask = {
        id: `${requestId}-${step.id}`,
        role: step.role,
        goal: step.summary ?? request.goal,
        payload: {
          ...step.input,
          context: executionContext.metadata
        }
      };

      transcript.push(`Executing ${step.role} (${worker.description})`);
      const result = await worker.execute(task, {
        sandbox: this.sandbox,
        rube: this.rube
      });

      transcript.push(result.output);
      return result;
    });

    const runResult = await runner.run(workflow, {
      requestId,
      goal: request.goal,
      metadata: request.context
    });

    const results = runResult.results as WorkerResult[];

    return {
      requestId,
      workflow: workflowName,
      results,
      transcript
    };
  }

  private async selectWorker(
    role: WorkerTask['role'],
    goal: string,
    context?: Record<string, unknown>
  ): Promise<AgentWorker> {
    const matchingWorkers = this.workers.filter((worker) => worker.role === role);
    if (matchingWorkers.length === 0) {
      throw new Error(`No worker available for role ${role}`);
    }

    if (matchingWorkers.length === 1) {
      return matchingWorkers[0];
    }

    const ranked = await this.rankWorkers(role, goal, context);
    return ranked[0];
  }

  private async rankWorkers(
    role: WorkerTask['role'],
    goal: string,
    context?: Record<string, unknown>
  ): Promise<AgentWorker[]> {
    const candidates = this.workers.filter((worker) => worker.role === role);

    if (candidates.length <= 1) {
      return candidates;
    }

    const scored = await Promise.all(
      candidates.map(async (worker) => ({
        worker,
        score: await this.scoreWorker(worker, goal, context)
      }))
    );

    return scored
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.worker);
  }

  private async scoreWorker(
    worker: AgentWorker,
    goal: string,
    context?: Record<string, unknown>
  ): Promise<number> {
    const profile = `${worker.role}: ${worker.description}`;
    const prompt = `Task: ${goal}\nContext: ${JSON.stringify(context ?? {})}\nWorker: ${profile}`;

    try {
      const vector = await this.eigent.embed(prompt);
      const sum = vector.values.reduce((acc, value) => acc + value, 0);
      return vector.values.length ? sum / vector.values.length : 0;
    } catch (error) {
      console.warn('Eigent scoring failed, falling back to heuristic.', error);
      return profile.includes('review') ? 0.4 : 0.5;
    }
  }
}
