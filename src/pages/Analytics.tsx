import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface RollupRow {
  bucket: string;
  category: string;
  name: string;
  avg_latency_ms: number | null;
  total_cost: number | null;
  errors: number;
  successes: number;
}

interface MetricRow {
  metric: string;
  category: string | null;
  name: string | null;
  action: string | null;
  total_value: number;
}

const fetchRollups = async (): Promise<RollupRow[]> => {
  const { data, error } = await supabase
    .from("structured_event_rollups")
    .select("bucket, category, name, avg_latency_ms, total_cost, errors, successes")
    .order("bucket", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
};

const fetchMetrics = async (): Promise<MetricRow[]> => {
  const { data, error } = await supabase
    .from("grafana_metrics")
    .select("metric, category, name, action, total_value")
    .order("metric", { ascending: true });
  if (error) throw error;
  return data ?? [];
};

const formatBucketLabel = (value: string) => new Date(value).toLocaleString();

const Analytics = () => {
  const rollupsQuery = useQuery({ queryKey: ["metrics", "rollups"], queryFn: fetchRollups, refetchInterval: 60_000 });
  const metricsQuery = useQuery({ queryKey: ["metrics", "totals"], queryFn: fetchMetrics, refetchInterval: 60_000 });

  const latencySeries = useMemo(() => {
    const buckets = new Map<string, Record<string, number | string>>();
    const keys = new Set<string>();
    (rollupsQuery.data ?? []).forEach((row) => {
      const bucketKey = new Date(row.bucket).toISOString();
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { bucket: bucketKey });
      }
      const dataset = buckets.get(bucketKey)!;
      const seriesKey = `${row.category}:${row.name}`;
      keys.add(seriesKey);
      dataset[seriesKey] = row.avg_latency_ms ?? 0;
    });
    const data = Array.from(buckets.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([, value]) => value);
    return { data, keys: Array.from(keys).sort() };
  }, [rollupsQuery.data]);

  const spendSummary = useMemo(() => {
    const totals = new Map<string, number>();
    (rollupsQuery.data ?? []).forEach((row) => {
      const key = `${row.category}:${row.name}`;
      totals.set(key, (totals.get(key) ?? 0) + (row.total_cost ?? 0));
    });
    return Array.from(totals.entries())
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [rollupsQuery.data]);

  const toolUtilization = useMemo(() => {
    const totals = new Map<string, number>();
    (metricsQuery.data ?? [])
      .filter((row) => row.metric.endsWith("_latency_ms") || row.metric.endsWith("_cost_usd"))
      .forEach((row) => {
        const key = `${row.category ?? "unknown"}:${row.name ?? "unknown"}`;
        totals.set(key, (totals.get(key) ?? 0) + row.total_value);
      });
    return Array.from(totals.entries())
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [metricsQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Operational Analytics</h1>
        <p className="text-muted-foreground">
          Monitor agent throughput, workflow health, and tool spend with live Supabase-backed dashboards.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Latency series"
          description="Hourly latency per workflow step"
          loading={rollupsQuery.isLoading}
          error={rollupsQuery.isError}
        >
          <div className="h-56">
            {latencySeries.data.length === 0 ? (
              <EmptyState label="No latency samples yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencySeries.data}>
                  <XAxis dataKey="bucket" type="category" allowDuplicatedCategory={false} tickFormatter={formatBucketLabel} />
                  <YAxis unit="ms" allowDecimals={false} />
                  <Tooltip labelFormatter={formatBucketLabel} formatter={(value: number) => `${value.toFixed(0)} ms`} />
                  {latencySeries.keys.map((seriesKey, index) => (
                    <Line
                      key={seriesKey}
                      type="monotone"
                      dataKey={seriesKey}
                      name={seriesKey}
                      strokeWidth={2}
                      stroke={`hsl(${(index * 57) % 360}deg 80% 60%)`}
                    />
                  ))}
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </MetricCard>

        <MetricCard title="Top spend" description="Aggregate cost per workflow/tool" loading={rollupsQuery.isLoading}>
          <div className="space-y-3">
            {spendSummary.length === 0 ? (
              <EmptyState label="No spend captured" />
            ) : (
              spendSummary.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="font-mono text-sm text-muted-foreground">{item.key}</div>
                  <Badge variant="outline" className="font-mono">
                    ${item.value.toFixed(4)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </MetricCard>

        <MetricCard
          title="Tool utilization"
          description="Relative volume based on latency+spend metrics"
          loading={metricsQuery.isLoading}
        >
          <div className="h-56">
            {toolUtilization.length === 0 ? (
              <EmptyState label="No tool activity" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolUtilization}>
                  <XAxis dataKey="key" hide />
                  <YAxis />
                  <Tooltip formatter={(value: number) => value.toFixed(2)} />
                  <Legend />
                  <Bar dataKey="value" fill="var(--primary)" name="utilization score" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </MetricCard>
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>Raw totals</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsQuery.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : metricsQuery.isError ? (
            <p className="text-sm text-destructive">Failed to load metrics.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Metric</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                    <th className="px-4 py-2 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(metricsQuery.data ?? []).map((row) => (
                    <tr key={`${row.metric}-${row.category}-${row.name}-${row.action}`} className="border-t border-border/60">
                      <td className="px-4 py-2 font-mono">{row.metric}</td>
                      <td className="px-4 py-2">{row.category ?? "-"}</td>
                      <td className="px-4 py-2">{row.name ?? "-"}</td>
                      <td className="px-4 py-2">{row.action ?? "-"}</td>
                      <td className="px-4 py-2 text-right font-mono">{row.total_value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({
  title,
  description,
  children,
  loading,
  error,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: boolean;
}) => (
  <Card className="bg-card/60 backdrop-blur border-border/60">
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardHeader>
    <CardContent>
      {loading ? <Skeleton className="h-40 w-full" /> : error ? <p className="text-destructive text-sm">Failed to load</p> : children}
    </CardContent>
  </Card>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">{label}</div>
);

export default Analytics;
