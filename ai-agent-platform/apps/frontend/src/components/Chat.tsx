'use client';

import { useState, useCallback } from 'react';
import type { AgentResult } from '../lib/api';
import { Loader2, Send } from 'lucide-react';
import { useSharedMessages } from '../hooks/useSharedMessageBus';
import { useAgentMessenger } from '../hooks/useAgentMessenger';

/**
 * Renders a chat UI that displays shared messages and lets the user submit queries to an agent.
 *
 * The component shows the shared message list, a text input with a submit button, a loading
 * indicator while an agent request is in progress, and an expandable view of the last agent's steps when available.
 *
 * @returns The rendered ChatConsole React element
 */
export function ChatConsole() {
  const messages = useSharedMessages();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AgentResult | undefined>();
  const { send } = useAgentMessenger('general');

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!input.trim()) return;
      setInput('');
      setIsLoading(true);
      try {
        const result = await send(input);
        setLastResult(result);
      } catch (error) {
        setLastResult({
          requestId: 'error',
          output: error instanceof Error ? error.message : 'Agent request failed',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, send]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="h-96 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-inner">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">Ask the multi-agent workforce for help.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => (
              <li key={message.id} className="flex gap-2">
                <span className="text-xs uppercase text-slate-500">{message.role}</span>
                <span className="text-sm text-slate-100">
                  {message.content}
                  {message.voice?.status === 'loading' && (
                    <Loader2 className="ml-2 inline h-3 w-3 animate-spin text-slate-400" />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          placeholder="Describe the task"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
        </button>
      </form>
      {lastResult?.steps && (
        <details className="rounded-md border border-slate-800 bg-slate-900 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-200">Agent steps</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-400">
            {JSON.stringify(lastResult.steps, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
