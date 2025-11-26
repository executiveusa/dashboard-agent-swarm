import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Bot, FolderKanban, DollarSign, Zap, TrendingUp } from "lucide-react";
import { heroMetrics } from "@/services/mockMetrics";

// Map icons to metrics
const metricIcons: Record<string, typeof FolderKanban> = {
  "active-projects": FolderKanban,
  "agents-online": Bot,
  "tasks-24h": Zap,
  "donations-today": DollarSign,
};

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="px-8 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: Hero Content */}
            <div className="flex flex-col justify-center space-y-6">
              {/* Eyebrow Pill */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground shadow-glow-primary/40 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live multi-agent swarm · DARYA vΩ orchestrating
              </div>

              {/* Headline */}
              <h1 className="font-heading text-5xl font-bold leading-tight lg:text-6xl">
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Mission Control
                </span>
                <br />
                <span className="text-foreground">for your AI Agents</span>
              </h1>

              {/* Subcopy */}
              <p className="text-lg text-muted-foreground lg:text-xl">
                DAR Studio is your command center for orchestrating smart sites, 24/7 fundraising engines, 
                and UGC swarms — all powered by DARYA and her Crypto Cuties.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow-primary transition-all hover:scale-105 hover:shadow-glow-primary/80">
                  <Activity className="h-5 w-5" />
                  Launch Studio
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-6 py-3 font-semibold text-accent transition-all hover:bg-accent/20">
                  <Bot className="h-5 w-5" />
                  View Agent Roster
                </button>
              </div>
            </div>

            {/* Right: Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {heroMetrics.map((metric) => {
                const Icon = metricIcons[metric.id] || Activity;
                return (
                  <Card 
                    key={metric.id}
                    className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/30 hover:shadow-glow-primary/20"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {metric.label}
                      </CardTitle>
                      <Icon className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="font-heading text-3xl font-bold text-foreground">
                        {metric.value}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {metric.hint}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section: Active Projects */}
      <section className="px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <Card className="border-border/50 bg-card/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl">
                <FolderKanban className="h-5 w-5 text-primary" />
                Active Projects
              </CardTitle>
              <CardDescription>
                Recent blueprints and deployed sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-8 text-center text-muted-foreground">
                <p>Project list will appear here</p>
                <p className="mt-1 text-xs">Connected to /darya/blueprint endpoint</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section: Agent Activity */}
      <section className="px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <Card className="border-border/50 bg-card/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl">
                <Bot className="h-5 w-5 text-accent" />
                Agent Activity
              </CardTitle>
              <CardDescription>
                Live agents & tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-8 text-center text-muted-foreground">
                <p>Agent status will appear here</p>
                <p className="mt-1 text-xs">DARYA + Crypto Cuties roster</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section: Recent Logs */}
      <section className="px-8 py-8 pb-16">
        <div className="mx-auto max-w-7xl">
          <Card className="border-border/50 bg-card/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl">
                <TrendingUp className="h-5 w-5 text-success" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Automation logs and fundraising events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-8 text-center text-muted-foreground">
                <p>Activity timeline will appear here</p>
                <p className="mt-1 text-xs">automation_logs & interactions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;