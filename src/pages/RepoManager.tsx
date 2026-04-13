import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Search, GitFork, Users, ChevronDown, CheckCircle2,
  RefreshCw, Download, Crown, Layers, Filter, X
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Repo {
  name: string;
  agent: string;
}

interface Agent {
  id: string;
  name: string;
  codename: string;
  role: string;
  org: string;
  color: string;
  isMain: boolean;
  repoCount: number;
}

// ─── Color map ────────────────────────────────────────────────────────────────
const AGENT_COLORS: Record<string, { badge: string; dot: string; card: string }> = {
  'AGENT-ZERO':    { badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",  dot: "bg-violet-500",  card: "border-violet-500/30 bg-violet-500/5" },
  'AX-SYNTHIA-001':{ badge: "bg-pink-500/15 text-pink-300 border-pink-500/30",        dot: "bg-pink-500",    card: "border-pink-500/30 bg-pink-500/5" },
  'MACS':          { badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",     dot: "bg-amber-500",   card: "border-amber-500/30 bg-amber-500/5" },
  'NEW-WORLD-KIDS':{ badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",dot: "bg-emerald-500",card: "border-emerald-500/30 bg-emerald-500/5" },
  'CHEGGIE':       { badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",        dot: "bg-blue-500",    card: "border-blue-500/30 bg-blue-500/5" },
  'AKASH':         { badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",        dot: "bg-cyan-500",    card: "border-cyan-500/30 bg-cyan-500/5" },
  'UNASSIGNED':    { badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",     dot: "bg-slate-500",   card: "border-slate-500/30 bg-slate-500/5" },
};

function agentColor(id: string) {
  return AGENT_COLORS[id] ?? AGENT_COLORS['UNASSIGNED'];
}

// ─── RepoManager ──────────────────────────────────────────────────────────────
const RepoManager = () => {
  const { toast } = useToast();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [query, setQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Assign dialog state
  const [dialogRepo, setDialogRepo] = useState<Repo | null>(null);

  // Debounced query for predictive search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleQueryChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(v), 150);
  };

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/repos/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
      }
    } catch {
      // server offline – set empty list
    }
  }, []);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (agentFilter) params.set("agent", agentFilter);

      const res = await fetch(`/api/repos?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos);
      }
    } catch {
      // server offline
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, agentFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // ─── Assign a repo ──────────────────────────────────────────────────────────
  const assignRepo = async (repoName: string, agentId: string) => {
    setAssigning(repoName);
    try {
      const res = await fetch(`/api/repos/${encodeURIComponent(repoName)}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: agentId }),
      });
      if (res.ok) {
        setRepos(prev =>
          prev.map(r => r.name === repoName ? { ...r, agent: agentId } : r)
        );
        await fetchAgents();
        const agent = agents.find(a => a.id === agentId);
        toast({
          title: "Repo assigned",
          description: `${repoName} → ${agent?.name ?? agentId}`,
        });
        setDialogRepo(null);
      }
    } catch {
      toast({ title: "Error", description: "Could not reach server", variant: "destructive" });
    } finally {
      setAssigning(null);
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────────
  const exportAssignments = async () => {
    try {
      const res = await fetch("/api/repos/export");
      if (!res.ok) return;
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repo-assignments-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  // ─── Derived state ──────────────────────────────────────────────────────────
  const agentZero = agents.find(a => a.id === "AGENT-ZERO");
  const subAgents = agents.filter(a => !a.isMain && a.id !== "UNASSIGNED");
  const unassignedAgent = agents.find(a => a.id === "UNASSIGNED");
  const activeAgentObj = agents.find(a => a.id === agentFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">
          Repo Management
        </p>
        <h2 className="mt-1 text-2xl font-semibold font-heading">Fleet Assignment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          313 GitHub repos · assign to agents · Agent Zero commands the ecosystem
        </p>
      </header>

      {/* Agent Zero hero card */}
      {agentZero && (
        <Card className="border-violet-500/40 bg-violet-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/20 ring-2 ring-violet-500/50">
                <Crown className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-violet-300">Agent Zero</span>
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40 text-[0.65rem]">
                    CHIEF BRAIN
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{agentZero.role}</p>
                <p className="mt-0.5 text-xs text-violet-300/70">AX-PAULI-BRAIN-002 · The Pauli Effect</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold font-mono text-violet-300">
                {agentZero.repoCount}
              </p>
              <p className="text-xs text-muted-foreground">repos assigned</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-agent cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {subAgents.map(agent => {
          const c = agentColor(agent.id);
          return (
            <Card
              key={agent.id}
              className={`cursor-pointer transition-all border ${c.card} ${agentFilter === agent.id ? "ring-2 ring-primary" : "hover:border-primary/30"}`}
              onClick={() => setAgentFilter(prev => prev === agent.id ? "" : agent.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  <span className="text-lg font-bold font-mono">{agent.repoCount}</span>
                </div>
                <p className="text-sm font-medium leading-tight">{agent.name}</p>
                <p className="text-[0.65rem] text-muted-foreground truncate">{agent.org}</p>
              </CardContent>
            </Card>
          );
        })}
        {unassignedAgent && (
          <Card
            className={`cursor-pointer transition-all border ${agentColor("UNASSIGNED").card} ${agentFilter === "UNASSIGNED" ? "ring-2 ring-primary" : "hover:border-primary/30"}`}
            onClick={() => setAgentFilter(prev => prev === "UNASSIGNED" ? "" : "UNASSIGNED")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                <span className="text-lg font-bold font-mono text-slate-400">{unassignedAgent.repoCount}</span>
              </div>
              <p className="text-sm font-medium leading-tight text-slate-400">Unassigned</p>
              <p className="text-[0.65rem] text-muted-foreground">No agent yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search 313 repos… (predictive)"
            className="pl-9 pr-8 font-mono text-sm"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setDebouncedQuery(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {agentFilter && (
            <Badge
              className={`flex items-center gap-1 cursor-pointer ${agentColor(agentFilter).badge}`}
              onClick={() => setAgentFilter("")}
            >
              <Filter className="h-3 w-3" />
              {activeAgentObj?.name ?? agentFilter}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => { fetchRepos(); fetchAgents(); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAssignments}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Repo table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitFork className="h-4 w-4" />
            {loading ? "Loading…" : `${repos.length} repos`}
            {(debouncedQuery || agentFilter) && (
              <span className="text-xs font-normal text-muted-foreground">
                (filtered from 313)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading repositories…
              </div>
            ) : repos.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                No repos match your search
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Repository</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Agent</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((repo, idx) => {
                    const c = agentColor(repo.agent);
                    const agentObj = agents.find(a => a.id === repo.agent);
                    return (
                      <tr
                        key={repo.name}
                        className={`border-b border-border/50 transition-colors hover:bg-accent/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <GitFork className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[280px]">{repo.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={`text-[0.65rem] border ${c.badge}`}>
                            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${c.dot} inline-block`} />
                            {agentObj?.name ?? repo.agent}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={assigning === repo.name}
                              >
                                {assigning === repo.name ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    Assign <ChevronDown className="h-3 w-3 ml-1" />
                                  </>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {agents.filter(a => a.id !== "UNASSIGNED").map(agent => (
                                <DropdownMenuItem
                                  key={agent.id}
                                  onClick={() => assignRepo(repo.name, agent.id)}
                                  className="text-xs"
                                >
                                  <span className={`mr-2 h-2 w-2 rounded-full ${agentColor(agent.id).dot}`} />
                                  {agent.name}
                                  {repo.agent === agent.id && (
                                    <CheckCircle2 className="ml-auto h-3 w-3 text-primary" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assign dialog (for clicking repo card — unused now but ready) */}
      <Dialog open={!!dialogRepo} onOpenChange={() => setDialogRepo(null)}>
        {dialogRepo && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">{dialogRepo.name}</DialogTitle>
              <DialogDescription>Choose an agent to assign this repo to.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {agents.filter(a => a.id !== "UNASSIGNED").map(agent => {
                const c = agentColor(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => assignRepo(dialogRepo.name, agent.id)}
                    disabled={assigning === dialogRepo.name}
                    className={`w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${c.card} ${dialogRepo.agent === agent.id ? "ring-1 ring-primary" : ""}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${c.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-[0.65rem] text-muted-foreground truncate">{agent.role}</p>
                    </div>
                    <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground">{agent.repoCount}</span>
                    {dialogRepo.agent === agent.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default RepoManager;
