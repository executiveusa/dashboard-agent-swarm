import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOverviewStats, type OverviewStats } from "@/services/mockMetrics";
import { TrendingUp, Users, DollarSign, Zap, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

const MOCK_TIMELINE = [
  { day: "Feb 20", tasks: 14, repos: 2 },
  { day: "Feb 21", tasks: 28, repos: 5 },
  { day: "Feb 22", tasks: 19, repos: 3 },
  { day: "Feb 23", tasks: 42, repos: 8 },
  { day: "Feb 24", tasks: 35, repos: 6 },
  { day: "Feb 25", tasks: 61, repos: 11 },
  { day: "Feb 26", tasks: 53, repos: 9 },
];

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
      hint: "Active projects",
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
        <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">
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
              className="transition-colors hover:border-primary/30"
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

      {/* Metrics Timeline — recharts AreaChart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <TrendingUp className="h-5 w-5 text-success" />
            Agent Activity (7 days)
          </CardTitle>
          <CardDescription>Daily tasks completed + repo health checks</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_TIMELINE} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reposGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="tasks" name="Tasks" stroke="hsl(var(--primary))" fill="url(#tasksGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="repos" name="Repo checks" stroke="hsl(var(--accent))" fill="url(#reposGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
