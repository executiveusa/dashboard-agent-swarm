import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Info, XCircle, Search } from "lucide-react";

interface Log {
  id: string;
  created_at: string;
  action: string;
  risk_level: string | null;
  details: Record<string, unknown> | null;
}

export function LogsViewer() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (data) setLogs(data);
    };

    fetchLogs();

    const channel = supabase
      .channel("logs-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload) => {
          setLogs((prev) => [payload.new as Log, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details ?? {}).toLowerCase().includes(search.toLowerCase())
  );

  const getRiskIcon = (risk: string | null) => {
    switch (risk) {
      case "critical":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "high":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "medium":
        return <Info className="h-4 w-4 text-accent" />;
      case "low":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskBadge = (risk: string | null) => {
    if (!risk) return null;
    
    const colors: Record<string, string> = {
      critical: "bg-destructive/20 text-destructive border-destructive",
      high: "bg-warning/20 text-warning border-warning",
      medium: "bg-accent/20 text-accent border-accent",
      low: "bg-success/20 text-success border-success",
    };

    return (
      <Badge variant="outline" className={`${colors[risk]} font-mono text-xs`}>
        {risk}
      </Badge>
    );
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">System Logs</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border font-mono"
          />
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No logs found</p>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-all animate-slide-in"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getRiskIcon(log.risk_level)}
                    <span className="font-mono text-sm text-foreground">{log.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRiskBadge(log.risk_level)}
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {log.details && (
                  <pre className="mt-2 text-xs text-muted-foreground font-mono bg-background/50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}