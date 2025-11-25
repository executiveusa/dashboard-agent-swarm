import { z } from 'zod';

const cronTrigger = z.object({
  type: z.literal('cron'),
  expression: z.string().min(1),
});

const webhookTrigger = z.object({
  type: z.literal('webhook'),
  event: z.string().min(1),
  originWhitelist: z.array(z.string().url()).optional(),
});

const storageTrigger = z.object({
  type: z.literal('storage'),
  bucket: z.string().min(1),
  match: z.string().optional(),
});

const manualTrigger = z.object({
  type: z.literal('manual'),
});

const baseStep = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  if: z.string().optional(),
  retries: z
    .object({
      attempts: z.number().int().min(1).max(5).default(3),
      backoffMs: z.number().int().min(100).default(1000),
    })
    .optional(),
  inputs: z.record(z.any()).optional(),
  fanOut: z.array(z.record(z.any())).optional(),
  collect: z
    .object({
      strategy: z.enum(['all', 'first-success']).default('all'),
    })
    .optional(),
});

const agentTaskStep = baseStep.extend({
  type: z.literal('agent_task'),
  agent: z.string().min(1),
  instructions: z.string().min(1),
});

const callServiceStep = baseStep.extend({
  type: z.literal('call_service'),
  service: z.string().min(1),
  params: z.record(z.any()).default({}),
});

const codeStep = baseStep.extend({
  type: z.literal('code_step'),
  runtime: z.enum(['python', 'node']).default('python'),
  source: z.string().min(1),
});

const browseStep = baseStep.extend({
  type: z.literal('browse_step'),
  actions: z.array(
    z.object({
      verb: z.enum(['open', 'click', 'type', 'waitFor', 'screenshot', 'evaluate']),
      args: z.array(z.any()).default([]),
    })
  ),
});

const firecrawlStep = baseStep.extend({
  type: z.literal('firecrawl_step'),
  instruction: z.string().min(1),
  url: z.string().url().optional(),
  mode: z.enum(['crawl', 'scrape', 'sitemap']).optional(),
});

export const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggers: z.array(cronTrigger.or(webhookTrigger).or(storageTrigger).or(manualTrigger)),
  steps: z
    .array(agentTaskStep.or(callServiceStep).or(codeStep).or(browseStep).or(firecrawlStep))
    .min(1),
  outputs: z.record(z.string(), z.string()).optional(),
});

export type WorkflowSchema = typeof workflowSchema;
