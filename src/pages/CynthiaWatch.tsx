import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, PlayCircle, PauseCircle, RotateCcw, Radio } from "lucide-react";
import { CynthiaStateCard } from "@/components/cynthia/CynthiaStateCard";
import { CynthiaTimeline } from "@/components/cynthia/CynthiaTimeline";
import {
  listSessions,
  getSessionEvents,
  subscribeToEventStream,
  type AgentSession,
  type TelemetryEvent,
} from "@/services/cynthiaTelemetry";
import { useToast } from "@/hooks/use-toast";

const CynthiaWatch = () => {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Subscribe to live stream when live mode is enabled
  useEffect(() => {
    if (!isLive) return;

    const unsubscribe = subscribeToEventStream(
      (data) => {
        if (data.type === "ready") {
          console.log("SSE connection ready");
          return;
        }

        if (data.type === "event" && data.data) {
          // Only add event if it belongs to the selected session (or if no session selected)
          if (!selectedSession || data.data.session_id === selectedSession.session_id) {
            setEvents((prev) => [...prev, data.data]);
          }
        }
      },
      (error) => {
        console.error("SSE error:", error);
        toast({
          title: "Stream Error",
          description: "Lost connection to live stream. Reconnecting...",
          variant: "destructive",
        });
      }
    );

    toast({
      title: "Live Mode Active",
      description: "Streaming real-time events from Cynthia",
    });

    return () => {
      unsubscribe();
    };
  }, [isLive, selectedSession, toast]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await listSessions({ limit: 50, agent: "cynthia" });
      setSessions(response.sessions);

      // Auto-select the most recent active session
      const activeSession = response.sessions.find((s) => s.status === "active");
      if (activeSession && !selectedSession) {
        setSelectedSession(activeSession);
        loadSessionEvents(activeSession.session_id);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionEvents = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await getSessionEvents(sessionId, { limit: 500 });
      setEvents(response.events);
      setSelectedSession(response.session);
    } catch (error) {
      console.error("Failed to load session events:", error);
      toast({
        title: "Error",
        description: "Failed to load session events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionChange = (sessionId: string) => {
    const session = sessions.find((s) => s.session_id === sessionId);
    if (session) {
      setSelectedSession(session);
      loadSessionEvents(sessionId);
      if (isLive) {
        setIsLive(false); // Stop live stream when switching sessions
      }
    }
  };

  const toggleLiveMode = () => {
    if (!selectedSession?.status || selectedSession.status !== "active") {
      toast({
        title: "Cannot enable live mode",
        description: "Selected session is not active",
        variant: "destructive",
      });
      return;
    }
    setIsLive(!isLive);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Eye className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary font-heading">
              Observability
            </p>
            <h2 className="mt-1 text-2xl font-semibold font-heading">Cynthia Agent Monitor</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time observability for external agent "Cynthia" (READ-ONLY)
            </p>
          </div>
        </div>
      </header>

      {/* Controls */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Session Controls</CardTitle>
          <CardDescription>Select a session to view or enable live streaming</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Session Selector */}
            <div className="flex-1">
              <Select
                value={selectedSession?.session_id || ""}
                onValueChange={handleSessionChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a session..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.session_id} value={session.session_id}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={session.status === "active" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {session.status}
                        </Badge>
                        <span className="font-mono text-sm">{session.session_id}</span>
                        {session.event_count && (
                          <span className="text-xs text-muted-foreground">
                            ({session.event_count} events)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant={isLive ? "destructive" : "default"}
                onClick={toggleLiveMode}
                disabled={!selectedSession || selectedSession.status !== "active"}
              >
                {isLive ? (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Stop Live
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Go Live
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={loadSessions} disabled={isLoading}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {isLive && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Radio className="h-4 w-4 text-red-500 animate-pulse" />
              <span>Live streaming active - new events will appear automatically</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* State Cards */}
      {selectedSession && (
        <div>
          <h3 className="mb-4 text-lg font-semibold font-heading">Current State</h3>
          <CynthiaStateCard session={selectedSession} isLive={isLive} />
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="mb-4 text-lg font-semibold font-heading">
          Event Stream
          {selectedSession && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              Session: {selectedSession.session_id}
            </span>
          )}
        </h3>
        <CynthiaTimeline events={events} autoScroll={isLive} />
      </div>

      {/* Info Card */}
      <Card className="border-border/50 bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm font-heading">About This Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            This is a <strong>READ-ONLY</strong> observability layer for the external agent "Cynthia".
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Events are received via secure telemetry endpoints</li>
            <li>Sensitive data (API keys, tokens, secrets) is automatically redacted</li>
            <li>Live streaming uses Server-Sent Events (SSE) for real-time updates</li>
            <li>Session replay available for historical analysis</li>
            <li>No control or mutation of Cynthia's behavior is possible from this interface</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CynthiaWatch;
