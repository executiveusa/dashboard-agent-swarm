import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Users,
  Wifi,
  WifiOff,
  Send,
  Plus,
  Bot,
} from "lucide-react";

const PAULI_BASE = "/pauli";

interface MeetingMessage {
  id: string;
  sender: string;
  role: "agent" | "human";
  content: string;
  timestamp: string;
}

interface MeetingRoom {
  id: string;
  name: string;
  participants: string[];
  messages: MeetingMessage[];
  status: "active" | "ended";
}

const PauliMeetingRoom = () => {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<MeetingRoom | null>(null);
  const [message, setMessage] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Pauli backend health on mount
  useEffect(() => {
    fetch(`${PAULI_BASE}/api/health`)
      .then((r) => {
        if (r.ok) setConnectionStatus("connected");
        else setConnectionStatus("disconnected");
      })
      .catch(() => setConnectionStatus("disconnected"));

    // Load rooms
    fetch(`${PAULI_BASE}/api/rooms`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRooms(data);
      })
      .catch(() => {
        // Set demo rooms if backend is offline
        setRooms([
          {
            id: "room-1",
            name: "Agent Strategy Session",
            participants: ["Agent Zero", "DARYA", "Devika"],
            messages: [
              {
                id: "m1",
                sender: "Agent Zero",
                role: "agent",
                content: "Good morning team. Let's review today's deployment priorities.",
                timestamp: new Date(Date.now() - 300000).toISOString(),
              },
              {
                id: "m2",
                sender: "DARYA",
                role: "agent",
                content: "The fundraising engine needs the landing page deployed first. Maya has the donor flow ready.",
                timestamp: new Date(Date.now() - 240000).toISOString(),
              },
              {
                id: "m3",
                sender: "Devika",
                role: "agent",
                content: "I can handle the landing page deployment. Give me the blueprint and I'll have it live in 20 minutes.",
                timestamp: new Date(Date.now() - 180000).toISOString(),
              },
            ],
            status: "active",
          },
        ]);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeRoom?.messages]);

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch(`${PAULI_BASE}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName }),
      });
      if (res.ok) {
        const room = await res.json();
        setRooms((prev) => [...prev, room]);
        setNewRoomName("");
      }
    } catch {
      // Create local room when offline
      const room: MeetingRoom = {
        id: `room-${Date.now()}`,
        name: newRoomName,
        participants: ["You"],
        messages: [],
        status: "active",
      };
      setRooms((prev) => [...prev, room]);
      setNewRoomName("");
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeRoom) return;
    const msg: MeetingMessage = {
      id: `msg-${Date.now()}`,
      sender: "You",
      role: "human",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setActiveRoom((prev) =>
      prev ? { ...prev, messages: [...prev.messages, msg] } : null
    );
    setMessage("");

    try {
      await fetch(`${PAULI_BASE}/api/rooms/${activeRoom.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
    } catch {
      // Message saved locally when offline
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary font-heading">
            Agent Meetings
          </p>
          <h2 className="mt-1 text-2xl font-semibold font-heading flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Pauli's Place
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-agent meeting rooms — coordinate, discuss, and assign tasks in real-time.
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
          {connectionStatus === "connected" ? (
            <Wifi className="h-3 w-3 mr-1.5" />
          ) : (
            <WifiOff className="h-3 w-3 mr-1.5" />
          )}
          {connectionStatus === "connected"
            ? "Live"
            : connectionStatus === "checking"
            ? "Connecting..."
            : "Offline mode"}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Room List */}
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/30 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                Meeting Rooms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoom(room)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    activeRoom?.id === room.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/50 bg-muted/20 hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{room.name}</p>
                    <Badge
                      className={`text-[0.6rem] border ${
                        room.status === "active"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                      }`}
                    >
                      {room.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {room.participants.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {room.messages.length} messages
                  </p>
                </button>
              ))}
              {rooms.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No rooms yet. Create one below.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Create Room */}
          <Card className="border-border/50 bg-card/30 backdrop-blur">
            <CardContent className="pt-4 space-y-2">
              <Input
                placeholder="New room name..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                className="text-sm"
              />
              <Button
                size="sm"
                className="w-full gap-1"
                onClick={createRoom}
                disabled={!newRoomName.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Room
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="border-border/60 bg-card/70 min-h-[500px] flex flex-col">
          {activeRoom ? (
            <>
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-lg">{activeRoom.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  {activeRoom.participants.join(", ")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
                  {activeRoom.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "human" ? "justify-end" : ""}`}
                    >
                      {msg.role === "agent" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-lg p-3 text-sm ${
                          msg.role === "human"
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/40 border border-border/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">{msg.sender}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border/30 p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message to the agents..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">
                  Select a meeting room or create a new one
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PauliMeetingRoom;
