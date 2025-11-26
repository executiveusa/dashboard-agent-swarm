import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, TrendingUp, Coins, Package, BarChart3, Network } from "lucide-react";
import { getDaryaAndCuties, getLegacyAgents, getAgentHierarchy } from "@/services/agentRegistry";
import type { AgentDefinition } from "@/types/api";
import { useState } from "react";

const iconMap: Record<string, typeof Bot> = {
  "darya_vomega": Sparkles,
  "cutie_maya": TrendingUp,
  "cutie_luna": Sparkles,
  "cutie_solana": Coins,
  "cutie_vega": Package,
  "cutie_aurora": BarChart3,
};

const colorMap: Record<string, string> = {
  "darya_vomega": "text-primary",
  "cutie_maya": "text-success",
  "cutie_luna": "text-accent",
  "cutie_solana": "text-warning",
  "cutie_vega": "text-destructive",
  "cutie_aurora": "text-muted-foreground",
};

const AgentsConsole = () => {
  const daryaAndCuties = getDaryaAndCuties();
  const legacyAgents = getLegacyAgents();
  const hierarchy = getAgentHierarchy();
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);

  const getStatusVariant = (status: AgentDefinition["status"]) => {
    switch (status) {
      case "core":
        return "default";
      case "concept":
        return "secondary";
      case "future_rl_trained":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary font-heading">
          Agents
        </p>
        <h2 className="mt-1 text-2xl font-semibold font-heading">DARYA + Crypto Cuties Roster</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Meet the agentic team orchestrating your smart sites and fundraising engines.
        </p>
      </header>

      {/* Orchestration Graph */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Network className="h-5 w-5 text-primary" />
            Orchestration Graph
          </CardTitle>
          <CardDescription>
            Agent hierarchy and relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold text-primary">{hierarchy.root.name}</div>
                <div className="text-xs text-muted-foreground">{hierarchy.root.role}</div>
              </div>
            </div>
            <div className="ml-8 space-y-2 border-l-2 border-border/30 pl-4">
              {hierarchy.children.get("darya_vomega")?.map((child) => {
                const Icon = iconMap[child.id] || Bot;
                const color = colorMap[child.id] || "text-foreground";
                return (
                  <div key={child.id} className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="font-medium">{child.name}</span>
                    <span className="text-muted-foreground">→ {child.role}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DARYA + Cuties Grid */}
      <div>
        <h3 className="mb-4 text-lg font-semibold font-heading">Core Team</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {daryaAndCuties.map((agent) => {
            const Icon = iconMap[agent.id] || Bot;
            const color = colorMap[agent.id] || "text-foreground";
            return (
              <Card 
                key={agent.id}
                className="border-border/50 bg-card/30 backdrop-blur transition-all hover:border-primary/30 hover:shadow-glow-primary/20 cursor-pointer"
                onClick={() => setSelectedAgent(agent)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg bg-muted/50 p-2 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-lg">{agent.name}</CardTitle>
                        <CardDescription className="text-xs">{agent.role}</CardDescription>
                      </div>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(agent.status)} className="w-fit text-xs capitalize">
                    {agent.status.replace("_", " ")}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Capabilities
                    </p>
                    <ul className="space-y-1">
                      {agent.capabilities?.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                      {agent.capabilities && agent.capabilities.length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{agent.capabilities.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Legacy Agents */}
      {legacyAgents.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold font-heading">Legacy Agents</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {legacyAgents.map((agent) => (
              <Card 
                key={agent.id}
                className="border-border/50 bg-card/30 backdrop-blur transition-all hover:border-accent/30 cursor-pointer"
                onClick={() => setSelectedAgent(agent)}
              >
                <CardHeader>
                  <CardTitle className="font-heading text-sm">{agent.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{agent.role}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 font-heading text-xl">
                  <Bot className="h-5 w-5 text-primary" />
                  {selectedAgent.name}
                </CardTitle>
                <CardDescription>{selectedAgent.role}</CardDescription>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                System Prompt
              </p>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                  {selectedAgent.systemPrompt || "No system prompt defined"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Model
              </p>
              <Badge variant="outline" className="font-mono">
                {selectedAgent.model || "Not specified"}
              </Badge>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Tools
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.tools?.map((tool, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>

            {selectedAgent.capabilities && selectedAgent.capabilities.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  All Capabilities
                </p>
                <ul className="space-y-1">
                  {selectedAgent.capabilities.map((cap, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgentsConsole;
