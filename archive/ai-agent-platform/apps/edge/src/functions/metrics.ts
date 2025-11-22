import { getSupabaseClient } from '../lib/db.js';

const promEscape = (value: string): string => value.replace(/"/g, '\\"');

export const handler = async (): Promise<Response> => {
  try {
    const client = getSupabaseClient();
    const [metricsResponse, rollupsResponse] = await Promise.all([
      client.from('grafana_metrics').select('metric, category, name, action, total_value'),
      client
        .from('structured_event_rollups')
        .select('bucket, category, name, avg_latency_ms, total_cost, errors, successes')
        .order('bucket', { ascending: false })
        .limit(200),
    ]);

    if (metricsResponse.error) {
      throw new Error(metricsResponse.error.message);
    }
    if (rollupsResponse.error) {
      throw new Error(rollupsResponse.error.message);
    }

    const lines: string[] = [];
    lines.push('# HELP structured_events_total Count of structured events grouped for Grafana dashboards');
    lines.push('# TYPE structured_events_total counter');
    for (const row of metricsResponse.data ?? []) {
      lines.push(
        `structured_events_total{metric="${promEscape(row.metric)}",category="${promEscape(row.category ?? 'unknown')}",name="${promEscape(row.name ?? 'unknown')}",action="${promEscape(row.action ?? 'unknown')}"} ${row.total_value ?? 0}`
      );
    }

    lines.push('# HELP workflow_latency_ms_average Average latency per workflow step bucketed hourly');
    lines.push('# TYPE workflow_latency_ms_average gauge');
    for (const row of rollupsResponse.data ?? []) {
      lines.push(
        `workflow_latency_ms_average{category="${promEscape(row.category ?? 'workflow')}",name="${promEscape(row.name ?? 'unknown')}",bucket="${new Date(row.bucket).toISOString()}"} ${row.avg_latency_ms ?? 0}`
      );
    }

    lines.push('# HELP workflow_cost_usd_total Total spend per workflow step bucketed hourly');
    lines.push('# TYPE workflow_cost_usd_total counter');
    for (const row of rollupsResponse.data ?? []) {
      lines.push(
        `workflow_cost_usd_total{category="${promEscape(row.category ?? 'workflow')}",name="${promEscape(row.name ?? 'unknown')}",bucket="${new Date(row.bucket).toISOString()}"} ${row.total_cost ?? 0}`
      );
    }

    lines.push('# HELP workflow_errors_total Number of workflow errors per step');
    lines.push('# TYPE workflow_errors_total counter');
    for (const row of rollupsResponse.data ?? []) {
      lines.push(
        `workflow_errors_total{category="${promEscape(row.category ?? 'workflow')}",name="${promEscape(row.name ?? 'unknown')}",bucket="${new Date(row.bucket).toISOString()}"} ${row.errors ?? 0}`
      );
    }

    lines.push('# HELP workflow_success_total Number of workflow successes per step');
    lines.push('# TYPE workflow_success_total counter');
    for (const row of rollupsResponse.data ?? []) {
      lines.push(
        `workflow_success_total{category="${promEscape(row.category ?? 'workflow')}",name="${promEscape(row.name ?? 'unknown')}",bucket="${new Date(row.bucket).toISOString()}"} ${row.successes ?? 0}`
      );
    }

    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return new Response(`# error ${(error as Error).message}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    });
  }
};
