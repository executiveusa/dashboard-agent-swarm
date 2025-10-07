import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseWorkflow, executeWorkflow, type WorkflowRuntime } from '../lib/workflows.js';

const runtime: WorkflowRuntime = {
  runAgentTask: async (step) => `agent:${step.instructions}`,
  callService: async (service, params) => ({ service, params }),
  runCode: async () => 'code-output',
  runBrowser: async () => 'browser-output',
  runFirecrawl: async () => ({ plans: [] }),
};

describe('workflows', () => {
  it('parses sample cleanup workflow', () => {
    const yaml = readFileSync('ai-agent-platform/packages/shared/workflows/sample-cleanup.yaml', 'utf8');
    const workflow = parseWorkflow(yaml);
    expect(workflow.name).toContain('Storage cleanup');
    expect(workflow.steps).toHaveLength(2);
  });

  it('executes fan-out workflow with retries', async () => {
    const definition = parseWorkflow(`
name: Fan out test
triggers:
  - type: manual
steps:
  - id: gather
    name: Gather
    type: agent_task
    agent: ResearchAgent
    instructions: base
    fanOut:
      - instructions: first
      - instructions: second
    collect:
      strategy: all
  - id: notify
    name: Notify
    type: call_service
    service: slack.postMessage
    params:
      channel: '#ops'
      message: Done
`);
    const result = await executeWorkflow(definition, runtime, {});
    expect(result.outputs.gather).toBe('agent:second');
    expect(result.steps.length).toBeGreaterThanOrEqual(3);
  });
});

