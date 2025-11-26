import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOverviewStats, type OverviewStats } from "@/services/mockMetrics";
import { TrendingUp, Users, DollarSign, Zap, BarChart3 } from "lucide-react";

const Analytics = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    getOverviewStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Active Projects",
      value: stats.projects,
      hint: "Smart sites & engines",
      icon: BarChart3,
      color: "text-primary",
    },
    {
      label: "Agents Online",
      value: stats.agentsOnline,
      hint: "DARYA + Cuties",
      icon: Users,
      color: "text-accent",
    },
    {
      label: "24h Tasks",
      value: stats.tasks24h,
      hint: "Completed automations",
      icon: Zap,
      color: "text-warning",
    },
    {
      label: "Donations Today",
      value: `$${stats.donationsToday.toLocaleString()}`,
      hint: "Fundraising pipelines",
      icon: DollarSign,
      color: "text-success",
    },
    {
      label: "30-Day Donations",
      value: `$${stats.totalDonations30d.toLocaleString()}`,
      hint: "Monthly total",
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary font-heading">
          Analytics
        </p>
        <h2 className="mt-1 text-2xl font-semibold font-heading">Performance Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your agents, projects, and fundraising metrics.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.label}
              className="border-border/50 bg-card/30 backdrop-blur transition-all hover:border-primary/30 hover:shadow-glow-primary/20"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="font-heading text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.hint}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metrics Timeline Placeholder */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <TrendingUp className="h-5 w-5 text-success" />
            Metrics Timeline
          </CardTitle>
          <CardDescription>
            Daily metrics from metrics_daily table
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/30 bg-muted/20 p-12 text-center text-muted-foreground">
            <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">Chart visualization coming in Phase 3</p>
            <p className="mt-2 text-xs">
              Will display leads, donations, conversions over time
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
