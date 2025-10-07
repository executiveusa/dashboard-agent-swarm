import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ChatConsole } from '../../../components/Chat';
import { VoiceToggle } from '../../../components/VoiceToggle';

async function loadWorkflows() {
  const base = join(process.cwd(), '../../packages/shared/workflows');
  const files = ['sample-cleanup.yaml', 'sample-firecrawl.yaml'];
  const entries = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(base, file), 'utf8');
      const [nameLine, descriptionLine] = content.split('\n');
      return {
        name: nameLine.replace('name: ', ''),
        description: descriptionLine?.replace('description: ', '') ?? '---',
      };
    })
  );
  return entries;
}

export default async function ConsolePage() {
  const workflows = await loadWorkflows();
  return (
    <main className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">Agent Console</h1>
          <VoiceToggle />
        </div>
        <ChatConsole />
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

