import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Plus, Send, Users, Crown,
  Loader2, RefreshCw, Box
} from "lucide-react";

interface Message {
  id: string;
  role: "human" | "agent";
  sender: string;
  content: string;
  timestamp: string;
}

interface Room {
  id: string;
  name: string;
  participants: string[];
  createdAt: string;
  messageCount: number;
  lastMessage: Message | null;
}

const AGENT_COLORS: Record<string, string> = {
  "Agent Zero":  "text-violet-400 border-violet-500/30 bg-violet-500/10",
  "SYNTHIA":     "text-pink-400 border-pink-500/30 bg-pink-500/10",
  "PAULI BRAIN": "text-amber-400 border-amber-500/30 bg-amber-500/10",
  "Devika":      "text-blue-400 border-blue-500/30 bg-blue-500/10",
};

function agentClass(sender: string) {
  return AGENT_COLORS[sender] ?? "text-green-400 border-green-500/30 bg-green-500/10";
}

const PauliMeetingRoom = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState<"connected" | "checking" | "offline">("checking");
  const [newRoomName, setNewRoomName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const BASE = "/api/meeting";

  const init = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/rooms`);
      if (res.ok) {
        const data = await res.json() as { rooms: Room[] };
        setRooms(data.rooms);
        setConnected("connected");
        if (!activeRoom && data.rooms.length > 0) {
          setActiveRoom(data.rooms[0]);
        }
      } else {
        setConnected("offline");
      }
    } catch {
      setConnected("offline");
    }
  }, [activeRoom]);

  useEffect(() => { init(); }, [init]);

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`${BASE}/rooms/${roomId}/messages`);
      if (res.ok) {
        const data = await res.json() as { messages: Message[] };
        setMessages(data.messages);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    fetchMessages(activeRoom.id);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(activeRoom.id), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeRoom, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      const res = await fetch(`${BASE}/rooms/${activeRoom.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, sender: "You", role: "human" }),
      });
      if (res.ok) {
        const data = await res.json() as { messages: Message[] };
        setMessages(data.messages);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `local-${Date.now()}`, role: "human", sender: "You",
        content: text, timestamp: new Date().toISOString()
      }]);
    } finally {
      setSending(false);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch(`${BASE}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName, participants: ["Agent Zero", "SYNTHIA", "PAULI BRAIN"] }),
      });
      if (res.ok) {
        const room = await res.json() as Room;
        setRooms(prev => [...prev, room]);
        setActiveRoom(room);
        setNewRoomName("");
        setShowCreate(false);
      }
    } catch {}
  };

  const statusColors = { connected: "bg-green-500", checking: "bg-yellow-500", offline: "bg-red-500" };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col bg-card/50">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColors[connected]}`} />
            <span className="text-xs font-medium capitalize">{connected}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showCreate && (
          <div className="p-2 border-b border-border flex gap-1">
            <Input
              value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
              placeholder="Room name..." className="h-7 text-xs"
              onKeyDown={e => e.key === "Enter" && createRoom()}
            />
            <Button size="icon" variant="default" className="h-7 w-7 shrink-0" onClick={createRoom}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room)}
              className={`w-full text-left rounded-md px-2.5 py-2 transition-colors hover:bg-accent ${activeRoom?.id === room.id ? "bg-accent" : ""}`}
            >
              <p className="text-xs font-medium truncate">{room.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Users className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[0.6rem] text-muted-foreground">{room.participants?.length ?? 0} agents</span>
              </div>
            </button>
          ))}
          {rooms.length === 0 && (
            <p className="text-[0.65rem] text-muted-foreground text-center pt-4">No rooms yet</p>
          )}
        </div>

        {/* 3D Mode button */}
        <div className="p-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
            onClick={() => navigate("/king-mode")}
          >
            <Box className="h-3.5 w-3.5" /> View in 3D (King Mode)
          </Button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeRoom ? (
          <>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{activeRoom.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{activeRoom.participants?.join(" · ")}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fetchMessages(activeRoom.id)}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "human" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${msg.role === "human" ? "bg-primary text-primary-foreground" : `border ${agentClass(msg.sender)}`}`}>
                    {msg.role === "agent" && (
                      <p className="text-[0.65rem] font-semibold mb-0.5 flex items-center gap-1">
                        {msg.sender === "Agent Zero" && <Crown className="h-2.5 w-2.5" />}
                        {msg.sender}
                      </p>
                    )}
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className="text-[0.6rem] opacity-50 mt-0.5 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border flex gap-2 shrink-0">
              <Input
                value={input} onChange={e => setInput(e.target.value)}
                placeholder="Message the fleet..."
                className="text-sm"
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={sending}
              />
              <Button onClick={sendMessage} disabled={sending || !input.trim()} size="sm">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select or create a meeting room
          </div>
        )}
      </div>
    </div>
  );
};

export default PauliMeetingRoom;
