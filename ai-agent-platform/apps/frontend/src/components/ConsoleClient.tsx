'use client';

import { useMemo } from 'react';
import { useAgentMessaging } from '@ai-agent-platform/shared';
import { ChatConsole } from './Chat';
import { VoiceToggle } from './VoiceToggle';
import { supabaseClient } from '../lib/supabaseClient';

interface WorkflowSummary {
  name: string;
  description: string;
}

interface ConsoleClientProps {
  workflows: WorkflowSummary[];
}

export function ConsoleClient({ workflows }: ConsoleClientProps) {
  const endpoint = useMemo(() => '/api/agent', []);

  const messaging = useAgentMessaging({
    endpoint,
    supabase: supabaseClient,
    defaultArchetype: 'general',
  });

  return (
    <main className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">Agent Console</h1>
          <VoiceToggle enabled={messaging.voiceEnabled} onToggle={messaging.toggleVoice} />
        </div>
        <ChatConsole messaging={messaging} />
      </section>
      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-medium text-slate-200">Workflow catalog</h2>
          <p className="text-sm text-slate-400">Enable and monitor declarative workflows.</p>
          <ul className="mt-3 space-y-3">
            {workflows.map((workflow) => (
              <li key={workflow.name} className="rounded-md border border-slate-800 bg-slate-950 p-3 text-sm">
                <div className="font-medium text-slate-100">{workflow.name}</div>
                <p className="text-xs text-slate-400">{workflow.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-medium text-slate-200">Agent log tips</h2>
          <p className="text-sm text-slate-400">
            Inspect the agent steps pane after each interaction for tool usage and delegated tasks.
          </p>
        </div>
      </aside>
    </main>
  );
}
