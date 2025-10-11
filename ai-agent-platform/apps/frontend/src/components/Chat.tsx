'use client';

import { useState, useCallback } from 'react';
import type { UseAgentMessagingResult } from '@ai-agent-platform/shared';
import { Loader2, Send } from 'lucide-react';

interface ChatConsoleProps {
  messaging: UseAgentMessagingResult;
}

export function ChatConsole({ messaging }: ChatConsoleProps) {
  const { messages, sendMessage, isStreaming, lastResult, error } = messaging;
  const [input, setInput] = useState('');

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!input.trim()) return;
      await sendMessage({ archetype: 'general', instructions: input });
      setInput('');
    },
    [input, sendMessage]
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
                <span className="text-sm text-slate-100 whitespace-pre-wrap">{message.content}</span>
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
          disabled={isStreaming}
        >
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
        </button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
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
