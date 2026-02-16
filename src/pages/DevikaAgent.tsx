import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Code2,
  Globe,
  GitBranch,
  Loader2,
  Play,
  Square,
  Terminal,
  Sparkles,
} from "lucide-react";

const DEVIKA_BASE = "/devika";

interface DevikaProject {
  name: string;
  status: "idle" | "planning" | "researching" | "coding" | "complete" | "error";
  currentStep?: string;
  messages: Array<{ role: "user" | "devika"; content: string; timestamp: string }>;
}

const DevikaAgent = () => {
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [project, setProject] = useState<DevikaProject | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking");

  // Check Devika backend health on mount
  useState(() => {
    fetch(`${DEVIKA_BASE}/api/health`)
      .then((r) => {
        if (r.ok) setConnectionStatus("connected");
        else setConnectionStatus("disconnected");
      })
      .catch(() => setConnectionStatus("disconnected"));
  });

  const handleSubmit = async () => {
    if (!prompt.trim() || !projectName.trim()) return;

    setIsRunning(true);
    const newProject: DevikaProject = {
      name: projectName,
      status: "planning",
      currentStep: "Breaking down your request...",
      messages: [
        {
          role: "user",
          content: prompt,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    setProject(newProject);

    try {
      const res = await fetch(`${DEVIKA_BASE}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          project_name: projectName,
          model_id: "claude-sonnet-4-20250514",
        }),
      });

      if (!res.ok) throw new Error(`Devika API error: ${res.status}`);

      const data = await res.json();
      setProject((prev) =>
        prev
          ? {
              ...prev,
              status: "complete",
              currentStep: "Done",
              messages: [
                ...prev.messages,
                {
                  role: "devika",
                  content: data.response || "Task completed.",
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : null
      );
    } catch (err) {
      setProject((prev) =>
        prev
          ? {
              ...prev,
              status: "error",
              currentStep: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
            }
          : null
      );
    } finally {
      setIsRunning(false);
    }
  };

  const statusColor = {
    idle: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    planning: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    researching: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    coding: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    complete: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    error: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary font-heading">
            AI Software Engineer
          </p>
          <h2 className="mt-1 text-2xl font-semibold font-heading flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            Devika
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Autonomous coding agent — describe what you need, Devika builds it.
          </p>
        </div>
        <Badge
          className={`border text-xs ${
            connectionStatus === "connected"
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : connectionStatus === "checking"
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
          }`}
        >
          <span
            className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${
              connectionStatus === "connected"
                ? "bg-emerald-400 animate-pulse"
                : connectionStatus === "checking"
                ? "bg-amber-400"
                : "bg-rose-400"
            }`}
          />
          {connectionStatus === "connected"
            ? "Backend connected"
            : connectionStatus === "checking"
            ? "Checking..."
            : "Backend offline"}
        </Badge>
      </header>

      {/* Capabilities */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Globe, label: "Web Research", desc: "Browses & gathers context" },
          { icon: Code2, label: "Code Generation", desc: "Full-stack from prompts" },
          { icon: GitBranch, label: "Git Workflow", desc: "Commits & PRs" },
        ].map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="border-border/50 bg-card/30 backdrop-blur">
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Task Input */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            New Task
          </CardTitle>
          <CardDescription>
            Describe a project or feature for Devika to build autonomously.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Project name (e.g. landing-page-redesign)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="font-mono text-sm"
            disabled={isRunning}
          />
          <Textarea
            placeholder="Describe what you want built. Be specific about tech stack, features, and requirements..."
            className="min-h-[140px] resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isRunning}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {["Build a landing page", "Fix auth bug", "Add REST API endpoint"].map((q) => (
                <button
                  key={q}
                  type="button"
                  className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                  onClick={() => setPrompt(q)}
                  disabled={isRunning}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {isRunning && (
                <Button variant="destructive" size="sm" onClick={() => setIsRunning(false)}>
                  <Square className="h-3.5 w-3.5 mr-1" />
                  Stop
                </Button>
              )}
              <Button onClick={handleSubmit} disabled={isRunning || !prompt.trim() || !projectName.trim()}>
                {isRunning ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {isRunning ? "Running..." : "Execute"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Output */}
      {project && (
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Terminal className="h-5 w-5 text-primary" />
                {project.name}
              </CardTitle>
              <Badge className={`border text-xs ${statusColor[project.status]}`}>
                {project.status}
              </Badge>
            </div>
            {project.currentStep && (
              <CardDescription className="flex items-center gap-2">
                {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                {project.currentStep}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {project.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/40 border border-border/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {msg.role === "user" ? "You" : "Devika"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap font-mono text-xs">{msg.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DevikaAgent;
