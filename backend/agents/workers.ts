import { LemonSandbox, LemonTool } from 'lemonai';
import { RubeClient, MCPRequest } from 'rube-mcp-client';
import { z } from 'zod';
import type { WorkflowRole } from '../../shared/workflows/types';

export interface WorkerTask {
  id: string;
  role: WorkflowRole;
  goal: string;
  payload?: Record<string, unknown>;
}

export interface WorkerResult {
  id: string;
  role: WorkflowRole;
  success: boolean;
  output: string;
  artifacts?: Record<string, unknown>;
}

export interface WorkerContext {
  sandbox: LemonSandbox;
  rube: RubeClient;
}

export interface AgentWorker {
  role: WorkflowRole;
  description: string;
  handles: (task: WorkerTask) => boolean;
  execute: (task: WorkerTask, context: WorkerContext) => Promise<WorkerResult>;
}

const rubeRequestSchema = z.object({
  path: z.string(),
  payload: z.record(z.unknown()).optional()
});

function createRubeTool(rube: RubeClient, name: string, description: string, request: MCPRequest): LemonTool {
  return {
    name,
    description,
    async execute(payload: unknown) {
      const parsed = rubeRequestSchema.merge(z.object({ payload: z.any().optional() })).safeParse({
        path: request.path,
        payload: (payload as Record<string, unknown>)?.payload ?? request.payload
      });

      if (!parsed.success) {
        throw new Error(`Invalid Rube MCP payload: ${parsed.error.message}`);
      }

      const response = await rube.invoke({
        path: parsed.data.path,
        payload: parsed.data.payload
      });

      if (response.status >= 400) {
        throw new Error(`Rube MCP responded with status ${response.status}`);
      }

      return response.data;
    }
  };
}

export function registerSandboxTools(sandbox: LemonSandbox, rube: RubeClient) {
  const tools: LemonTool[] = [
    createRubeTool(rube, 'filesystem.read', 'Read a file from the project workspace.', {
      path: '/filesystem/read'
    }),
    createRubeTool(rube, 'filesystem.write', 'Write a file in the project workspace.', {
      path: '/filesystem/write'
    }),
    createRubeTool(rube, 'supabase.sql', 'Execute a SQL query against the project Supabase instance.', {
      path: '/supabase/sql'
    })
  ];

  tools.forEach((tool) => sandbox.registerTool(tool));
}

function createPlannerWorker(): AgentWorker {
  return {
    role: 'planner',
    description: 'Turns user intents into actionable project plans and milestones.',
    handles: (task) => task.role === 'planner',
    async execute(task) {
      const objective = task.goal;
      const subtasks = [
        'Clarify the success criteria',
        'List tooling or context requirements',
        'Break the work into sequenced actionable steps',
        'Highlight dependencies and potential blockers'
      ];

      const plan = subtasks
        .map((step, index) => `${index + 1}. ${step}`)
        .join('\n');

      return {
        id: task.id,
        role: 'planner',
        success: true,
        output: `Plan for: ${objective}\n${plan}`
      };
    }
  };
}

function createResearcherWorker(): AgentWorker {
  return {
    role: 'researcher',
    description: 'Gathers data and context via LemonAI sandbox tools and Rube endpoints.',
    handles: (task) => task.role === 'researcher',
    async execute(task, context) {
      const targetFile = task.payload?.file as string | undefined;
      let notes = 'No direct file research performed.';

      if (targetFile) {
        const fileContents = await context.sandbox.listTools()
          .find((tool) => tool.name === 'filesystem.read')
          ?.execute({ payload: { path: targetFile } });

        notes = `Collected file contents for ${targetFile}: ${JSON.stringify(fileContents)}`;
      }

      return {
        id: task.id,
        role: 'researcher',
        success: true,
        output: `Research summary for goal: ${task.goal}\n${notes}`
      };
    }
  };
}

function createBuilderWorker(): AgentWorker {
  return {
    role: 'builder',
    description: 'Implements code changes using the sandbox tooling.',
    handles: (task) => task.role === 'builder',
    async execute(task, context) {
      const plannedDiff = task.payload?.diff as string | undefined;

      if (plannedDiff) {
        const writeTool = context.sandbox.listTools().find((tool) => tool.name === 'filesystem.write');
        if (!writeTool) {
          return {
            id: task.id,
            role: 'builder',
            success: false,
            output: 'filesystem.write tool not registered',
            artifacts: { diff: plannedDiff }
          };
        }
        await writeTool.execute({ payload: { diff: plannedDiff } });
      }

      return {
        id: task.id,
        role: 'builder',
        success: true,
        output: `Implemented changes for ${task.goal}`,
        artifacts: plannedDiff ? { diff: plannedDiff } : undefined
      };
    }
  };
}

function createReviewerWorker(): AgentWorker {
  return {
    role: 'reviewer',
    description: 'Performs validation and quality checks on outputs.',
    handles: (task) => task.role === 'reviewer',
    async execute(task) {
      const issues = Array.isArray(task.payload?.issues)
        ? (task.payload?.issues as string[])
        : [];

      const summary = issues.length
        ? `Identified ${issues.length} issue(s):\n- ${issues.join('\n- ')}`
        : 'No issues detected.';

      return {
        id: task.id,
        role: 'reviewer',
        success: issues.length === 0,
        output: summary,
        artifacts: { issues }
      };
    }
  };
}

export function createWorkers(): AgentWorker[] {
  return [
    createPlannerWorker(),
    createResearcherWorker(),
    createBuilderWorker(),
    createReviewerWorker()
  ];
}
