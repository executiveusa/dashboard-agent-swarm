import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Server,
  Container,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
} from "lucide-react";

interface ServiceStatus {
  id: string;
  name: string;
  type: "docker" | "vercel" | "vps";
  status: "running" | "stopped" | "deploying" | "error";
  url?: string;
  lastDeploy?: string;
  port?: number;
}

const DeployManager = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      id: "dashboard",
      name: "Dashboard (Frontend)",
      type: "docker",
      status: "running",
      url: "https://dashboard.paulisplace.com",
      lastDeploy: new Date().toISOString(),
      port: 8080,
    },
    {
      id: "backend",
      name: "Backend API",
      type: "docker",
      status: "running",
      lastDeploy: new Date().toISOString(),
      port: 8787,
    },
    {
      id: "devika",
      name: "Devika Agent",
      type: "docker",
      status: "stopped",
      port: 1337,
    },
    {
      id: "pauli",
      name: "Pauli's Place (Meeting Room)",
      type: "docker",
      status: "stopped",
    },
    {
      id: "agent-zero",
      name: "Agent Zero",
      type: "docker",
      status: "stopped",
      port: 8000,
    },
    {
      id: "postgres",
      name: "PostgreSQL",
      type: "docker",
      status: "running",
      port: 5432,
    },
    {
      id: "redis",
      name: "Redis",
      type: "docker",
      status: "running",
      port: 6379,
    },
    {
      id: "flowise",
      name: "Flowise",
      type: "docker",
      status: "stopped",
      port: 3000,
    },
    {
      id: "devika-vercel",
      name: "Devika Frontend (Vercel)",
      type: "vercel",
      status: "running",
      url: "https://devika-agent.vercel.app",
    },
  ]);
  const [deploying, setDeploying] = useState<string | null>(null);

  const statusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "running":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "stopped":
        return <XCircle className="h-4 w-4 text-slate-400" />;
      case "deploying":
        return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
      case "error":
        return <XCircle className="h-4 w-4 text-rose-400" />;
    }
  };

  const statusBadge = (status: ServiceStatus["status"]) => {
    const styles: Record<string, string> = {
      running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      stopped: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      deploying: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      error: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    };
    return styles[status];
  };

  const typeIcon = (type: ServiceStatus["type"]) => {
    switch (type) {
      case "docker":
        return <Container className="h-4 w-4 text-sky-400" />;
      case "vercel":
        return <Globe className="h-4 w-4 text-foreground" />;
      case "vps":
        return <Server className="h-4 w-4 text-amber-400" />;
    }
  };

  const handleDeploy = async (serviceId: string) => {
    setDeploying(serviceId);
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, status: "deploying" as const } : s))
    );

    // Simulate deployment (replace with real Coolify/Docker API calls)
    setTimeout(() => {
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId
            ? { ...s, status: "running" as const, lastDeploy: new Date().toISOString() }
            : s
        )
      );
      setDeploying(null);
    }, 3000);
  };

  const runningCount = services.filter((s) => s.status === "running").length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">
          Deployment
        </p>
        <h2 className="mt-1 text-2xl font-semibold font-heading flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          Alex — Deploy Manager
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage all services across Docker, Vercel, and Hostinger VPS.
        </p>
      </header>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border ">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Services Running</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">
              {runningCount}/{services.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border ">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Docker Containers</p>
            <p className="mt-2 text-2xl font-semibold">
              {services.filter((s) => s.type === "docker").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border ">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Vercel Deployments</p>
            <p className="mt-2 text-2xl font-semibold">
              {services.filter((s) => s.type === "vercel").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Grid */}
      <Card className="border-border ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5 text-primary" />
            All Services
          </CardTitle>
          <CardDescription>
            Start, stop, and redeploy services across your infrastructure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary p-4"
              >
                <div className="flex items-center gap-3">
                  {typeIcon(service.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{service.name}</p>
                      <Badge className={`border text-[0.6rem] ${statusBadge(service.status)}`}>
                        {service.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {service.port && (
                        <span className="text-xs text-muted-foreground font-mono">
                          :{service.port}
                        </span>
                      )}
                      {service.url && (
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {service.url}
                        </a>
                      )}
                      {service.lastDeploy && (
                        <span className="text-xs text-muted-foreground">
                          Last deploy: {new Date(service.lastDeploy).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon(service.status)}
                  <Button
                    size="sm"
                    variant={service.status === "running" ? "secondary" : "default"}
                    onClick={() => handleDeploy(service.id)}
                    disabled={deploying === service.id}
                    className="gap-1"
                  >
                    {deploying === service.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {service.status === "running" ? "Redeploy" : "Deploy"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeployManager;
