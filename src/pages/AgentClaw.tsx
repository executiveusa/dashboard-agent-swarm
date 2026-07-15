import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic, MicOff, Send, RefreshCw, Play, Pause, Trash2,
  Activity, Cpu, HardDrive, Wifi, WifiOff, Volume2,
  Clock, Zap, HelpCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import * as api from "@/services/agentClawApi";

/* ── Types ────────────────────────────────────────── */

interface HistoryEntry {
  type: "user" | "synthia" | "system" | "error";
  text: string;
  time: string;
}

/* ── Component ────────────────────────────────────── */

const AgentClaw = () => {
  // Health / connection
  const [online, setOnline] = useState(false);
  const [health, setHealth] = useState<api.AgentClawHealth | null>(null);

  // Voice / commands
  const [cmdText, setCmdText] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [listening, setListening] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [commands, setCommands] = useState<api.VoiceCommandInfo[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Tasks
  const [tasks, setTasks] = useState<api.TaskEntry[]>([]);
  const [contexts, setContexts] = useState<api.ContextEntry[]>([]);
  const [progressText, setProgressText] = useState("Idle");
  const [progressActive, setProgressActive] = useState(false);

  /* ── Helpers ──────────────────────────────────── */

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const pushHistory = useCallback((type: HistoryEntry["type"], text: string) => {
    setHistory((h) => [...h, { type, text, time: now() }]);
  }, []);

  const popHistory = useCallback(() => {
    setHistory((h) => h.slice(0, -1));
  }, []);

  /* ── Polling ─────────────────────────────────── */

  const pollAgent = useCallback(async () => {
    try {
      const data = await api.poll();
      setOnline(true);
      setTasks(data.tasks ?? []);
      setContexts(data.contexts ?? []);
      setProgressText(data.log_progress ?? "Idle");
      setProgressActive(!!data.log_progress_active);
    } catch {
      setOnline(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
      setOnline(true);
    } catch {
      setOnline(false);
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    pollAgent();
    const iv = setInterval(pollAgent, 2000);
    return () => clearInterval(iv);
  }, [checkHealth, pollAgent]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  /* ── Voice Command Send ──────────────────────── */

  const sendCommand = async (text: string) => {
    if (!text.trim()) return;
    setCmdText("");
    pushHistory("user", text);
    pushHistory("system", "Routing…");

    try {
      const match = await api.routeVoiceCommand(text);
      popHistory();

      if (match.matched_command) {
        pushHistory(
          "synthia",
          `✓ ${match.matched_command} (${Math.round((match.confidence ?? 0) * 100)}%) → ${match.tool_name}`
        );
        if (match.needs_confirmation) {
          pushHistory("synthia", "⚠ Requires confirmation before executing.");
        }
      } else {
        pushHistory("synthia", match.message ?? "No command matched — treating as conversation.");
      }
    } catch (err: unknown) {
      popHistory();
      pushHistory("error", `Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  /* ── Mic ─────────────────────────────────────── */

  const toggleMic = async () => {
    if (listening) {
      setListening(false);
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        pushHistory("system", "Transcribing…");
        try {
          const result = await api.transcribe(blob);
          popHistory();
          const transcript = result.text ?? result.transcript ?? "";
          if (transcript) {
            setCmdText(transcript);
            await sendCommand(transcript);
          } else {
            pushHistory("system", "No speech detected.");
          }
        } catch {
          popHistory();
          pushHistory("error", "Transcription failed.");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setListening(true);
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          setListening(false);
          mediaRecorderRef.current.stop();
        }
      }, 15000);
    } catch {
      pushHistory("error", "Microphone access denied.");
    }
  };

  /* ── TTS Test ────────────────────────────────── */

  const testTTS = async () => {
    pushHistory("system", "Testing TTS…");
    try {
      await api.synthesize("SYNTHIA voice system online. All channels operational.");
      popHistory();
      pushHistory("synthia", "TTS test successful.");
    } catch {
      popHistory();
      pushHistory("error", "TTS test failed.");
    }
  };

  /* ── Command Help ────────────────────────────── */

  const loadCommands = async () => {
    try {
      const data = await api.getVoiceCommandHelp();
      setCommands(data.commands ?? []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadCommands();
  }, []);

  /* ── Task Actions ────────────────────────────── */

  const handleRunTask = async (id: string) => {
    try {
      await api.runTask(id);
      pushHistory("synthia", `Task ${id} triggered.`);
      pollAgent();
    } catch {
      pushHistory("error", `Failed to run task ${id}.`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      pushHistory("synthia", `Task ${id} deleted.`);
      pollAgent();
    } catch {
      pushHistory("error", `Failed to delete task ${id}.`);
    }
  };

  /* ── Grouped commands ────────────────────────── */

  const groupedCommands = commands.reduce<Record<string, api.VoiceCommandInfo[]>>((acc, cmd) => {
    (acc[cmd.category] ??= []).push(cmd);
    return acc;
  }, {});

  /* ── Render ──────────────────────────────────── */

  const cronTasks = tasks.filter((t) => t.type === "scheduled");
  const runningTasks = tasks.filter((t) => t.state === "running");

  const icons: Record<HistoryEntry["type"], string> = {
    user: "🎤",
    synthia: "🤖",
    system: "⚙️",
    error: "❌",
  };

  const typeColors: Record<HistoryEntry["type"], string> = {
    user: "text-cyan-400",
    synthia: "text-emerald-400",
    system: "text-muted-foreground",
    error: "text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-primary font-heading">
            Agent Claw
          </p>
          <h2 className="mt-1 text-2xl font-semibold font-heading">SYNTHIA Control</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Voice-first command center for the autonomous agency
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={online ? "default" : "destructive"} className="gap-1.5">
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? "Online" : "Offline"}
          </Badge>
          {progressActive && (
            <Badge variant="outline" className="gap-1.5 animate-pulse">
              <Zap className="h-3 w-3 text-amber-400" />
              {progressText}
            </Badge>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ── Left Column: Voice + History ────────── */}
        <div className="space-y-4">
          {/* Voice Input */}
          <Card className="border-border ">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-heading">
                <Volume2 className="h-4 w-4 text-primary" />
                SYNTHIA Voice
              </CardTitle>
              <CardDescription>Speak or type a command</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={listening ? "destructive" : "outline"}
                  size="icon"
                  className="h-12 w-12 rounded-full shrink-0"
                  onClick={toggleMic}
                >
                  {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Input
                  value={cmdText}
                  onChange={(e) => setCmdText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendCommand(cmdText)}
                  placeholder="Type a command or speak…"
                  className="flex-1"
                />
                <Button size="icon" onClick={() => sendCommand(cmdText)} disabled={!cmdText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pl-14">
                {listening ? "Listening… click to stop (15s max)" : "Click mic to speak"}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={testTTS}>
                  <Volume2 className="h-3 w-3 mr-1" /> Test TTS
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCommandsOpen(!commandsOpen)}>
                  <HelpCircle className="h-3 w-3 mr-1" /> Commands
                  {commandsOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Command Grid (collapsible) */}
          {commandsOpen && (
            <Card className="border-border ">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(groupedCommands).map(([cat, cmds]) => (
                    <div key={cat}>
                      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-primary mb-1.5">{cat}</p>
                      <div className="flex flex-wrap gap-1">
                        {cmds.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => sendCommand(c.triggers[0] ?? c.id)}
                            className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[0.7rem] hover:border-primary/40 hover:bg-primary/10 transition-all"
                          >
                            {c.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversation History */}
          <Card className="border-border ">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading">Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] rounded-md border border-border bg-background p-3 font-mono text-sm">
                {history.length === 0 && (
                  <p className="text-muted-foreground text-center py-8 text-xs">
                    Say something to SYNTHIA…
                  </p>
                )}
                {history.map((entry, i) => (
                  <div key={i} className="flex gap-2 py-1">
                    <span className="text-[0.65rem] text-muted-foreground w-12 shrink-0">{entry.time}</span>
                    <span className="shrink-0">{icons[entry.type]}</span>
                    <span className={`break-words ${typeColors[entry.type]}`}>{entry.text}</span>
                  </div>
                ))}
                <div ref={historyEndRef} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column: Tasks + Health ────────── */}
        <div className="space-y-4">
          {/* System Health */}
          <Card className="border-border ">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-heading">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  System Health
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={checkHealth} className="h-7 w-7">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/10 p-3 text-center">
                  <Cpu className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{online ? "OK" : "--"}</p>
                  <p className="text-[0.65rem] text-muted-foreground">Agent Core</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/10 p-3 text-center">
                  <HardDrive className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{contexts.length}</p>
                  <p className="text-[0.65rem] text-muted-foreground">Contexts</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/10 p-3 text-center">
                  <Zap className="h-4 w-4 mx-auto mb-1 text-amber-400" />
                  <p className="text-lg font-bold">{runningTasks.length}</p>
                  <p className="text-[0.65rem] text-muted-foreground">Running</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/10 p-3 text-center">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-cyan-400" />
                  <p className="text-lg font-bold">{cronTasks.length}</p>
                  <p className="text-[0.65rem] text-muted-foreground">Cron Jobs</p>
                </div>
              </div>
              {health?.error && (
                <p className="mt-2 text-xs text-red-400">Error: {health.error}</p>
              )}
            </CardContent>
          </Card>

          {/* Running Tasks */}
          <Card className="border-border ">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-heading">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Active Tasks
                </CardTitle>
                <Badge variant="outline" className="text-xs">{runningTasks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {runningTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks running</p>
              ) : (
                <div className="space-y-2">
                  {runningTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/10 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{t.task_name}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{t.type}</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cron Jobs */}
          <Card className="border-border ">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-heading">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  Cron Jobs
                </CardTitle>
                <Badge variant="outline" className="text-xs">{cronTasks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {cronTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No cron jobs</p>
              ) : (
                <div className="space-y-2">
                  {cronTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/10 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.task_name}</p>
                        <p className="text-[0.65rem] font-mono text-muted-foreground">{t.schedule ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant={t.state === "idle" ? "default" : t.state === "error" ? "destructive" : "secondary"}
                          className="text-[0.6rem] px-1.5"
                        >
                          {t.state}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRunTask(t.id)}>
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTask(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Contexts */}
          <Card className="border-border ">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-heading">
                Contexts
                <Badge variant="outline" className="text-xs">{contexts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contexts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No active contexts</p>
              ) : (
                <div className="space-y-1.5">
                  {contexts.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{c.name ?? c.id.slice(0, 8)}</span>
                      <div className="flex items-center gap-1">
                        {c.paused ? (
                          <Badge variant="secondary" className="text-[0.6rem]">Paused</Badge>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => api.pauseContext(c.id)}
                        >
                          {c.paused ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentClaw;
