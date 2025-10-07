import { useCallback, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentStreamEvent,
  TaskArchetype,
  TaskInput,
} from '../types.js';

const textDecoder = new TextDecoder();

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

type ToolEvent = Extract<AgentStreamEvent, { type: 'tool' }>;
type StatusEvent = Extract<AgentStreamEvent, { type: 'status' }>;
type ResultEvent = Extract<AgentStreamEvent, { type: 'result' }>;
type ErrorEvent = Extract<AgentStreamEvent, { type: 'error' }>;
type ChunkEvent = Extract<AgentStreamEvent, { type: 'chunk' }>;

type AnyStreamEvent =
  | ToolEvent
  | StatusEvent
  | ResultEvent
  | ErrorEvent
  | ChunkEvent;

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface StreamEventRecord extends AnyStreamEvent {
  requestId: string;
}

export interface SendAgentMessageParams {
  instructions: string;
  archetype?: TaskArchetype;
  metadata?: Record<string, unknown>;
  attachments?: TaskInput['attachments'];
}

export interface UseAgentMessagingOptions {
  endpoint: string;
  supabase?: SupabaseClient<any>;
  userId?: string;
  sessionId?: string;
  defaultArchetype?: TaskArchetype;
  metadata?: Record<string, unknown>;
  initialVoiceEnabled?: boolean;
}

export interface UseAgentMessagingResult {
  messages: ConversationMessage[];
  events: StreamEventRecord[];
  sendMessage: (params: SendAgentMessageParams) => Promise<string | undefined>;
  isStreaming: boolean;
  error: string | null;
  lastResult?: ResultEvent & { requestId: string };
  voiceEnabled: boolean;
  setVoiceEnabled: (value: boolean) => void;
  toggleVoice: () => void;
  activeTaskId?: string;
}

interface ParsedSseEvent {
  event: string;
  data: any;
}

const parseSseSegment = (segment: string): ParsedSseEvent | null => {
  const lines = segment.split('\n');
  let event: string | null = null;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (!event) return null;
  const rawData = dataLines.join('');
  if (!rawData) {
    return { event, data: undefined };
  }
  try {
    return { event, data: JSON.parse(rawData) };
  } catch (error) {
    console.warn('Failed to parse SSE payload', error);
    return { event, data: rawData };
  }
};

const now = () => new Date().toISOString();

const toStreamEvent = (event: string, data: any): AnyStreamEvent | null => {
  switch (event) {
    case 'status':
      if (!data?.status) return null;
      return {
        type: 'status',
        status: data.status,
        message: data.message,
        progress: typeof data.progress === 'number' ? data.progress : undefined,
        timestamp: data.timestamp ?? now(),
      } as StatusEvent;
    case 'tool':
      if (!data?.tool || !data?.status) return null;
      return {
        type: 'tool',
        tool: data.tool,
        status: data.status,
        message: data.message,
        payload: data.payload,
        timestamp: data.timestamp ?? now(),
      } as ToolEvent;
    case 'chunk':
      if (typeof data?.content !== 'string') return null;
      return {
        type: 'chunk',
        content: data.content,
        timestamp: data.timestamp ?? now(),
      } as ChunkEvent;
    case 'result':
      if (typeof data?.output !== 'string' || !data?.agent) return null;
      return {
        type: 'result',
        agent: data.agent,
        output: data.output,
        steps: Array.isArray(data.steps) ? data.steps : undefined,
        metadata: data.metadata,
        timestamp: data.timestamp ?? now(),
      } as ResultEvent;
    case 'error':
      if (!data?.message && !data?.error) return null;
      return {
        type: 'error',
        error: String(data?.message ?? data?.error ?? 'Agent error'),
        timestamp: data.timestamp ?? now(),
      } as ErrorEvent;
    default:
      return null;
  }
};

const statusToTask = (event: StatusEvent) => {
  switch (event.status) {
    case 'queued':
      return { status: 'pending', progress: event.progress ?? 0 };
    case 'running':
      return { status: 'running', progress: event.progress ?? 25 };
    case 'completed':
      return { status: 'completed', progress: 100 };
    case 'failed':
      return { status: 'failed', progress: event.progress ?? 0 };
    default:
      return undefined;
  }
};

export const useAgentMessaging = (
  options: UseAgentMessagingOptions
): UseAgentMessagingResult => {
  const {
    endpoint,
    supabase,
    userId,
    sessionId,
    defaultArchetype = 'general',
    metadata: defaultMetadata,
    initialVoiceEnabled = false,
  } = options;

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [events, setEvents] = useState<StreamEventRecord[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(initialVoiceEnabled);
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>();
  const [lastResult, setLastResult] = useState<(ResultEvent & { requestId: string }) | undefined>();

  const requestIdRef = useRef<string | undefined>();
  const assistantMessageRef = useRef<ConversationMessage | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => !prev);
  }, []);

  const appendAssistantContent = useCallback((content: string, timestamp: string) => {
    setMessages((prev) => {
      if (!assistantMessageRef.current) {
        const message: ConversationMessage = {
          id: createId(),
          role: 'assistant',
          content,
          timestamp,
        };
        assistantMessageRef.current = message;
        return [...prev, message];
      }
      const updated = prev.map((message) =>
        message.id === assistantMessageRef.current?.id
          ? { ...message, content, timestamp }
          : message
      );
      if (assistantMessageRef.current) {
        assistantMessageRef.current.content = content;
        assistantMessageRef.current.timestamp = timestamp;
      }
      return updated;
    });
  }, []);

  const recordEvent = useCallback(
    async (event: AnyStreamEvent, requestId: string, taskId?: string) => {
      setEvents((prev) => [...prev, { ...event, requestId }]);
      const client = supabaseRef.current;
      if (!client || !taskId) {
        return;
      }

      if (event.type === 'tool') {
        const risk = event.status === 'error' ? 'high' : 'low';
        const { error: logError } = await client
          .from('logs')
          .insert({
            task_id: taskId,
            action: `${event.tool}:${event.status}`,
            details: event,
            risk_level: risk,
          });
        if (logError) {
          console.error('Failed to insert tool log', logError);
        }
      } else if (event.type === 'status') {
        const mapped = statusToTask(event);
        if (mapped) {
          const { error: updateError } = await client
            .from('tasks')
            .update(mapped)
            .eq('id', taskId);
          if (updateError) {
            console.error('Failed to update task status', updateError);
          }
        }
      } else if (event.type === 'result') {
        const { error: updateError } = await client
          .from('tasks')
          .update({
            status: 'completed',
            progress: 100,
            metadata: {
              ...(event.metadata ?? {}),
              output: event.output,
            },
          })
          .eq('id', taskId);
        if (updateError) {
          console.error('Failed to finalize task result', updateError);
        }
        const { error: logError } = await client
          .from('logs')
          .insert({
            task_id: taskId,
            action: 'agent_result',
            details: event,
            risk_level: 'low',
          });
        if (logError) {
          console.error('Failed to insert result log', logError);
        }
      } else if (event.type === 'error') {
        const { error: updateError } = await client
          .from('tasks')
          .update({ status: 'failed', progress: 0 })
          .eq('id', taskId);
        if (updateError) {
          console.error('Failed to record failure', updateError);
        }
        const { error: logError } = await client
          .from('logs')
          .insert({
            task_id: taskId,
            action: 'agent_error',
            details: event,
            risk_level: 'high',
          });
        if (logError) {
          console.error('Failed to insert error log', logError);
        }
      }
    },
    []
  );

  const handleStreamEvent = useCallback(
    async (event: AnyStreamEvent, requestId: string, taskId?: string) => {
      if (event.type === 'chunk') {
        appendAssistantContent(
          (assistantMessageRef.current?.content ?? '') + event.content,
          event.timestamp
        );
      } else if (event.type === 'result') {
        appendAssistantContent(event.output, event.timestamp);
        setLastResult({ ...event, requestId });
        assistantMessageRef.current = null;
      } else if (event.type === 'error') {
        setError(event.error);
        assistantMessageRef.current = null;
      }
      await recordEvent(event, requestId, taskId);
    },
    [appendAssistantContent, recordEvent]
  );

  const sendMessage = useCallback(
    async ({ instructions, archetype, metadata, attachments }: SendAgentMessageParams) => {
      if (!instructions.trim()) {
        return undefined;
      }

      controllerRef.current?.abort();
      controllerRef.current = new AbortController();
      requestIdRef.current = undefined;
      assistantMessageRef.current = null;
      setError(null);
      setIsStreaming(true);
      setLastResult(undefined);
      setActiveTaskId(undefined);

      const timestamp = now();
      const userMessage: ConversationMessage = {
        id: createId(),
        role: 'user',
        content: instructions,
        timestamp,
      };
      setMessages((prev) => [...prev, userMessage]);

      let taskId: string | undefined;
      const client = supabaseRef.current;
      if (client) {
        const payload = {
          task_type: archetype ?? defaultArchetype,
          status: 'running',
          progress: 5,
          metadata: {
            instructions,
            ...(defaultMetadata ?? {}),
            ...(metadata ?? {}),
            voice: voiceEnabled,
          },
        };
        const { data, error: insertError } = await client
          .from('tasks')
          .insert(payload)
          .select()
          .single();
        if (insertError) {
          console.error('Failed to create task record', insertError);
        } else if (data) {
          taskId = data.id;
          setActiveTaskId(data.id);
        }
      }

      const mergedMetadata = {
        ...(defaultMetadata ?? {}),
        ...(metadata ?? {}),
        voice: voiceEnabled,
      };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            sessionId,
            stream: true,
            input: {
              archetype: archetype ?? defaultArchetype,
              instructions,
              metadata: mergedMetadata,
              attachments,
            },
          }),
          signal: controllerRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Agent request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += textDecoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const segment = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const parsed = parseSseSegment(segment);
            if (!parsed) {
              boundary = buffer.indexOf('\n\n');
              continue;
            }
            if (parsed.event === 'open' && parsed.data?.requestId) {
              requestIdRef.current = parsed.data.requestId;
              if (taskId && client) {
                const { error: updateError } = await client
                  .from('tasks')
                  .update({
                    metadata: {
                      ...(mergedMetadata ?? {}),
                      instructions,
                      requestId: parsed.data.requestId,
                    },
                  })
                  .eq('id', taskId);
                if (updateError) {
                  console.error('Failed to attach requestId to task', updateError);
                }
              }
              boundary = buffer.indexOf('\n\n');
              continue;
            }

            if (parsed.event === 'close') {
              setIsStreaming(false);
              boundary = buffer.indexOf('\n\n');
              continue;
            }

            const streamEvent = toStreamEvent(parsed.event, parsed.data);
            if (!streamEvent) {
              boundary = buffer.indexOf('\n\n');
              continue;
            }
            const activeRequestId = requestIdRef.current ?? parsed.data?.requestId ?? createId();
            requestIdRef.current = activeRequestId;
            await handleStreamEvent(streamEvent, activeRequestId, taskId);
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Agent request failed';
        setError(message);
        if (taskId && client) {
          await client
            .from('tasks')
            .update({ status: 'failed', progress: 0 })
            .eq('id', taskId);
          await client.from('logs').insert({
            task_id: taskId,
            action: 'agent_error',
            details: { message },
            risk_level: 'high',
          });
        }
      } finally {
        setIsStreaming(false);
        controllerRef.current = null;
      }

      return requestIdRef.current;
    },
    [
      appendAssistantContent,
      defaultArchetype,
      defaultMetadata,
      endpoint,
      handleStreamEvent,
      sessionId,
      userId,
      voiceEnabled,
    ]
  );

  return useMemo(
    () => ({
      messages,
      events,
      sendMessage,
      isStreaming,
      error,
      lastResult,
      voiceEnabled,
      setVoiceEnabled,
      toggleVoice,
      activeTaskId,
    }),
    [
      activeTaskId,
      error,
      events,
      isStreaming,
      lastResult,
      messages,
      sendMessage,
      voiceEnabled,
    ]
  );
};
