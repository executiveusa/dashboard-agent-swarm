import parser from 'cron-parser';
import { z } from 'zod';
import { getSupabaseClient } from '../../lib/db.js';
import { listWorkflowDefinitions, runWorkflowWithRecording } from './runner.js';

type CronTrigger = { type: 'cron'; expression: string };
type ScheduledTrigger = { type: 'scheduled'; every: string };

type PollResponse = Array<{
  workflow: string;
  trigger: string;
  runId?: string;
  status: 'succeeded' | 'failed' | 'skipped';
  reason?: string;
}>;

const bodySchema = z
  .object({
    dryRun: z.boolean().optional(),
  })
  .optional();

export const handler = async (req: Request): Promise<Response> => {
  const isPost = req.method === 'POST';
  if (!isPost && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = isPost ? bodySchema.parse(await req.json().catch(() => ({}))) : {};
  const dryRun = body?.dryRun ?? false;

  const client = getSupabaseClient();
  const definitions = await listWorkflowDefinitions();
  const now = new Date();
  const results: PollResponse = [];

  for (const { slug, definition } of definitions) {
    const triggers = definition.triggers.filter((trigger) => trigger.type === 'cron' || trigger.type === 'scheduled');

    for (const trigger of triggers as Array<CronTrigger | ScheduledTrigger>) {
      const { due, reason } = await determineDue(client, definition.name, trigger, now);
      if (!due) {
        results.push({ workflow: slug, trigger: trigger.type, status: 'skipped', reason });
        continue;
      }

      const runningLimit = definition.concurrency?.runs?.max ?? 1;
      const concurrencyScope = definition.concurrency?.runs?.scope ?? 'workflow';
      const runningCount = await countActiveRuns(client, definition.name, trigger.type, concurrencyScope);
      if (runningCount >= runningLimit) {
        results.push({
          workflow: slug,
          trigger: trigger.type,
          status: 'skipped',
          reason: `Concurrency limit ${runningLimit} reached`,
        });
        continue;
      }

      if (dryRun) {
        results.push({ workflow: slug, trigger: trigger.type, status: 'skipped', reason: 'dry-run' });
        continue;
      }

      try {
        const execution = await runWorkflowWithRecording({
          definition,
          workflowSlug: slug,
          trigger: { type: trigger.type, payload: { reason: reason ?? 'scheduled-run' } },
        });
        results.push({ workflow: slug, trigger: trigger.type, status: execution.status, runId: execution.runId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ workflow: slug, trigger: trigger.type, status: 'failed', reason: message });
      }
    }
  }

  return new Response(JSON.stringify({ now: now.toISOString(), results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

const determineDue = async (
  client: ReturnType<typeof getSupabaseClient>,
  workflowName: string,
  trigger: CronTrigger | ScheduledTrigger,
  now: Date
): Promise<{ due: boolean; reason?: string }> => {
  const { data } = await client
    .from('workflow_runs')
    .select('started_at, finished_at')
    .eq('workflow_name', workflowName)
    .eq('trigger_type', trigger.type)
    .order('started_at', { ascending: false })
    .limit(1);

  const lastTimestamp = data?.[0]?.finished_at ?? data?.[0]?.started_at;
  if (!lastTimestamp) {
    return { due: true, reason: 'No previous runs' };
  }

  const last = new Date(lastTimestamp);

  if (trigger.type === 'cron') {
    try {
      const interval = parser.parseExpression(trigger.expression, { currentDate: last });
      const nextDate = interval.next().toDate();
      return { due: nextDate <= now, reason: `next=${nextDate.toISOString()}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid cron expression';
      return { due: false, reason: message };
    }
  }

  if (trigger.type === 'scheduled') {
    const duration = parseDuration(trigger.every);
    if (!duration) {
      return { due: false, reason: `Invalid duration: ${trigger.every}` };
    }
    const nextDate = new Date(last.getTime() + duration);
    return { due: nextDate <= now, reason: `next=${nextDate.toISOString()}` };
  }

  return { due: false };
};

const countActiveRuns = async (
  client: ReturnType<typeof getSupabaseClient>,
  workflowName: string,
  triggerType: string,
  scope: 'workflow' | 'trigger'
) => {
  let query = client
    .from('workflow_runs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running')
    .eq('workflow_name', workflowName);

  if (scope === 'trigger') {
    query = query.eq('trigger_type', triggerType);
  }

  const { count } = await query;
  return count ?? 0;
};

const parseDuration = (value: string): number | undefined => {
  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multiplier[unit] ?? 0);
};
