import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, Search, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type RiskLevel = "critical" | "high" | "medium" | "low" | "info";

type LogRecord = {
  id: string;
  createdAt: string;
  action: string;
  risk: RiskLevel;
  details?: string;
};

const FALLBACK_LOGS: LogRecord[] = [
  {
    id: "seed-1",
    createdAt: new Date().toISOString(),
    action: "System bootstrapped",
    risk: "info",
    details: "Local development environment ready.",
  },
  {
    id: "seed-2",
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    action: "Queued demo video",
    risk: "low",
    details: "https://youtu.be/dQw4w9WgXcQ",
  },
];

const riskMeta: Record<RiskLevel, { icon: JSX.Element; badgeClass: string }> = {
  critical: {
    icon: <XCircle className="h-4 w-4 text-destructive" />,
    badgeClass: "bg-destructive/20 text-destructive border-destructive",
  },
  high: {
    icon: <AlertCircle className="h-4 w-4 text-warning" />,
    badgeClass: "bg-warning/20 text-warning border-warning",
  },
  medium: {
    icon: <Info className="h-4 w-4 text-accent" />,
    badgeClass: "bg-accent/20 text-accent border-accent",
  },
  low: {
    icon: <CheckCircle2 className="h-4 w-4 text-success" />,
    badgeClass: "bg-success/20 text-success border-success",
  },
  info: {
    icon: <Info className="h-4 w-4 text-muted-foreground" />,
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

export function LogsViewer() {
  const [query, setQuery] = useState("");

  const logs = useMemo(() => {
    if (!query.trim()) {
      return FALLBACK_LOGS;
    }

    const lower = query.toLowerCase();
    return FALLBACK_LOGS.filter(
      (log) =>
        log.action.toLowerCase().includes(lower) ||
        (log.details?.toLowerCase().includes(lower) ?? false)
    );
  }, [query]);

  return (
    <Card className="">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>Logs</CardTitle>
          <Badge variant="outline" className="font-mono text-xs uppercase">
            Demo feed
          </Badge>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filter by action or details"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px] pr-4">
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No log entries yet.
              </p>
            ) : (
              logs.map((log) => {
                const meta = riskMeta[log.risk];
                return (
                  <div
                    key={log.id}
                    className="rounded-lg border border-border bg-secondary p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {meta.icon}
                        <span className="font-mono text-sm">{log.action}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={meta.badgeClass}>
                          {log.risk}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    {log.details ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {log.details}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default LogsViewer;
