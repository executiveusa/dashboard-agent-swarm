import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Send, Sparkles, Square } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type AgentMutationVariables = {
  command: string;
  assistantMessageId: string;
  taskId: string;
};

type AgentMutationResult = {
  response: string;
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const EDGE_FUNCTION_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/agent`
  : "/functions/v1/agent";

const formatTaskType = (command: string) =>
  command.length > 120 ? `${command.slice(0, 117)}...` : command;

export function CommandInput() {
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const suggestions = useMemo(
    () => ["Organize files", "Clean duplicates", "Backup to cloud", "Analyze usage"],
    []
  );

  const {
    isSupported: isSpeechSupported,
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setCommand((prev) => {
        const next = prev ? `${prev} ${transcript}`.trim() : transcript;
        return next;
      });
      toast.success("Voice command captured", {
        description: transcript,
      });
    },
    onError: (message) => {
      toast.error("Microphone error", {
        description: message,
      });
    },
  });

  useEffect(() => {
    if (!isSpeechSupported) {
      return;
    }

    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isSpeechSupported, isListening, stopListening]);

  const mutation = useMutation<AgentMutationResult, Error, AgentMutationVariables>({
    mutationFn: async ({ command: userCommand, assistantMessageId }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (anonKey) {
        headers.Authorization = `Bearer ${anonKey}`;
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ command: userCommand, stream: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to contact the agent service.");
      }

      const contentType = response.headers.get("content-type") ?? "";
      const isEventStream = contentType.includes("text/event-stream");
      let agentResponse = "";

      if (!response.body) {
        const text = await response.text();
        try {
          const parsed = JSON.parse(text);
          agentResponse = parsed?.output ?? parsed?.response ?? text;
        } catch {
          agentResponse = text;
        }
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: agentResponse || "(no response)" }
              : message
          )
        );
        return { response: agentResponse };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      if (isEventStream) {
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const segments = buffer.split(/\n\n/);
          buffer = segments.pop() ?? "";

          for (const segment of segments) {
            const payload = segment
              .split(/\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => line.replace(/^data:\s*/, ""))
              .filter((line) => line !== "[DONE]")
              .join("\n");

            if (!payload) continue;

            agentResponse += payload;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: agentResponse }
                  : message
              )
            );
          }
        }

        const remainder = buffer
          .split(/\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.replace(/^data:\s*/, ""))
          .filter((line) => line !== "[DONE]")
          .join("\n");

        if (remainder) {
          agentResponse += remainder;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: agentResponse }
                : message
            )
          );
        }
      } else {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          agentResponse += chunk;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: agentResponse }
                : message
            )
          );
        }
      }

      agentResponse = agentResponse.trim();
      const finalResponse = agentResponse || "(no response)";

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: finalResponse }
            : message
        )
      );

      return { response: finalResponse };
    },
    onMutate: () => {
      setIsStreaming(true);
    },
    onSuccess: async ({ response: agentResponse }, { command: userCommand, taskId }) => {
      setIsStreaming(false);

      const { error: taskError } = await supabase
        .from("tasks")
        .upsert(
          {
            id: taskId,
            task_type: formatTaskType(userCommand),
            status: "completed",
            progress: 100,
            model_used: "edge-agent",
            metadata: { command: userCommand, response: agentResponse },
          },
          { onConflict: "id" }
        );

      if (taskError) {
        console.error("Failed to update task record", taskError);
      }

      const { error: logError } = await supabase.from("logs").insert({
        action: "Agent response received",
        risk_level: "low",
        details: { command: userCommand, response: agentResponse },
        task_id: taskId,
      });

      if (logError) {
        console.error("Failed to insert log record", logError);
      }
    },
    onError: async (error, { command: userCommand, assistantMessageId, taskId }) => {
      setIsStreaming(false);
      const message = error.message || "Unexpected agent failure.";

      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === assistantMessageId
            ? { ...entry, content: `⚠️ ${message}` }
            : entry
        )
      );

      toast.error("Agent request failed", {
        description: message,
      });

      const { error: taskError } = await supabase
        .from("tasks")
        .upsert(
          {
            id: taskId,
            task_type: formatTaskType(userCommand),
            status: "failed",
            progress: 100,
            model_used: "edge-agent",
            metadata: { command: userCommand, error: message },
          },
          { onConflict: "id" }
        );

      if (taskError) {
        console.error("Failed to mark task failure", taskError);
      }

      const { error: logError } = await supabase.from("logs").insert({
        action: "Agent request failed",
        risk_level: "high",
        details: { command: userCommand, error: message },
        task_id: taskId,
      });

      if (logError) {
        console.error("Failed to record failure log", logError);
      }
    },
    onSettled: () => {
      setIsStreaming(false);
    },
  });

  const isProcessing = mutation.isPending || isStreaming;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCommand = command.trim();
    if (!trimmedCommand || isProcessing) return;

    if (isListening) {
      stopListening();
    }

    const taskId = crypto.randomUUID();
    const assistantMessageId = `${taskId}-assistant`;

    setMessages((prev) => [
      ...prev,
      { id: `${taskId}-user`, role: "user", content: trimmedCommand },
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    setCommand("");

    const { error: taskError } = await supabase
      .from("tasks")
      .upsert(
        {
          id: taskId,
          task_type: formatTaskType(trimmedCommand),
          status: "running",
          progress: 10,
          model_used: "edge-agent",
          metadata: { command: trimmedCommand },
        },
        { onConflict: "id" }
      );

    if (taskError) {
      console.error("Failed to initialize task record", taskError);
    }

    mutation.mutate({
      command: trimmedCommand,
      assistantMessageId,
      taskId,
    });
  };

  const handleVoiceToggle = () => {
    if (!isSpeechSupported) {
      toast.warning("Speech recognition unavailable", {
        description: "Your browser does not support microphone capture.",
      });
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20 space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Natural Language Interface</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Tell me what to do... (e.g., 'organize my downloads folder')"
            className="flex-1 bg-secondary/50 border-border font-mono"
            disabled={isProcessing}
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleVoiceToggle}
            disabled={isProcessing}
            className={cn(
              "border-accent/50 hover:bg-accent/10 transition-colors",
              isListening && "bg-primary/20 border-primary/60 text-primary animate-pulse"
            )}
          >
            {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            type="submit"
            className="bg-gradient-primary hover:shadow-glow-primary transition-all"
            disabled={isProcessing || !command.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Agent is processing your request...
          </div>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            onClick={() => setCommand(suggestion)}
            className="text-xs font-mono border-muted hover:border-primary/50"
            disabled={isProcessing}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Chat Feed
        </h4>
        <ScrollArea className="mt-3 h-72 rounded-lg border border-border bg-background/40 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No conversations yet. Submit a command to see the agent in action.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "assistant" ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg border px-3 py-2 text-sm font-mono whitespace-pre-wrap leading-relaxed",
                      message.role === "assistant"
                        ? "bg-secondary/70 border-border text-foreground"
                        : "bg-primary/80 border-primary text-primary-foreground"
                    )}
                  >
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                      {message.role === "assistant" ? "Agent" : "You"}
                    </span>
                    {message.content || (message.role === "assistant" ? "Thinking..." : "")}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
