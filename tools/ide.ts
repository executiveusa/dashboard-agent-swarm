import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export interface AuditEntry {
  id: string;
  workspaceId: string;
  tool: string;
  action: string;
  payload: unknown;
  success: boolean;
  output?: string;
  error?: string;
  timestamp: string;
}

export interface WorkspaceConfig {
  id: string;
  root: string;
  gitCommands?: string[];
  testCommands?: string[];
}

export interface FilesystemArgs {
  workspaceId: string;
  action: 'read' | 'write' | 'list';
  path: string;
  content?: string;
}

export interface GitArgs {
  workspaceId: string;
  command: string;
  args?: string[];
}

export interface TestArgs {
  workspaceId: string;
  command: string;
  args?: string[];
}

export interface MCPTool<TArgs, TResult> {
  name: string;
  description: string;
  execute: (args: TArgs) => Promise<TResult>;
}

class WorkspaceSandbox {
  constructor(public readonly id: string, root: string) {
    this.root = path.resolve(root);
  }

  readonly root: string;

  resolve(target: string) {
    const resolved = path.resolve(this.root, target);
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Access outside of workspace ${this.id} is not permitted`);
    }
    return resolved;
  }
}

class WorkspaceRegistry {
  private readonly sandboxes = new Map<string, WorkspaceSandbox>();

  constructor(configs: WorkspaceConfig[]) {
    configs.forEach((config) => {
      this.sandboxes.set(config.id, new WorkspaceSandbox(config.id, config.root));
    });
  }

  get(workspaceId: string) {
    const workspace = this.sandboxes.get(workspaceId);
    if (!workspace) throw new Error(`Unknown workspace: ${workspaceId}`);
    return workspace;
  }

  list() {
    return Array.from(this.sandboxes.values()).map((sandbox) => ({ id: sandbox.id, root: sandbox.root }));
  }
}

class AuditTrail {
  private entries: AuditEntry[] = [];

  constructor(private readonly sink?: string) {}

  async record(entry: AuditEntry) {
    this.entries.push(entry);
    if (this.sink) {
      await fs.appendFile(this.sink, `${JSON.stringify(entry)}\n`, 'utf8');
    }
  }

  getAll() {
    return [...this.entries];
  }
}

const createId = () => `audit_${Math.random().toString(36).slice(2, 10)}`;

const createSuccessEntry = (
  workspaceId: string,
  tool: string,
  action: string,
  payload: unknown,
  output?: string,
): AuditEntry => ({
  id: createId(),
  workspaceId,
  tool,
  action,
  payload,
  success: true,
  output,
  timestamp: new Date().toISOString(),
});

const createFailureEntry = (
  workspaceId: string,
  tool: string,
  action: string,
  payload: unknown,
  error: unknown,
): AuditEntry => ({
  id: createId(),
  workspaceId,
  tool,
  action,
  payload,
  success: false,
  error: error instanceof Error ? error.message : String(error),
  timestamp: new Date().toISOString(),
});

const ensureParentDirectory = async (filePath: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const runProcess = async (command: string, args: string[] | undefined, cwd: string) =>
  new Promise<string>((resolve, reject) => {
    const subprocess = spawn(command, args ?? [], { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    subprocess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    subprocess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    subprocess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `Command failed with exit code ${code}`));
      }
    });
  });

export const createIDETools = (config: { workspaces: WorkspaceConfig[]; auditLogPath?: string }) => {
  const registry = new WorkspaceRegistry(config.workspaces);
  const auditTrail = new AuditTrail(config.auditLogPath);

  const filesystem: MCPTool<FilesystemArgs, { entries?: string[]; content?: string }> = {
    name: 'filesystem',
    description: 'Read, write, or list files within a workspace sandbox.',
    execute: async (args) => {
      const workspace = registry.get(args.workspaceId);
      const target = workspace.resolve(args.path);
      try {
        if (args.action === 'list') {
          const entries = await fs.readdir(target, { withFileTypes: true });
          const result = entries.map((entry) => `${entry.isDirectory() ? 'd' : 'f'} ${entry.name}`);
          await auditTrail.record(createSuccessEntry(args.workspaceId, 'filesystem', 'list', args, result.join('\n')));
          return { entries: result };
        }
        if (args.action === 'read') {
          const content = await fs.readFile(target, 'utf8');
          await auditTrail.record(createSuccessEntry(args.workspaceId, 'filesystem', 'read', args));
          return { content };
        }
        if (args.action === 'write') {
          await ensureParentDirectory(target);
          await fs.writeFile(target, args.content ?? '', 'utf8');
          await auditTrail.record(createSuccessEntry(args.workspaceId, 'filesystem', 'write', args));
          return {};
        }
        throw new Error(`Unsupported filesystem action: ${args.action}`);
      } catch (error) {
        await auditTrail.record(createFailureEntry(args.workspaceId, 'filesystem', args.action, args, error));
        throw error;
      }
    },
  };

  const git: MCPTool<GitArgs, { output: string }> = {
    name: 'git',
    description: 'Execute predefined git commands in a sandboxed workspace.',
    execute: async ({ workspaceId, command, args }) => {
      const workspace = registry.get(workspaceId);
      const workspaceConfig = config.workspaces.find((item) => item.id === workspaceId);
      const allowed = workspaceConfig?.gitCommands ?? ['status', 'diff', 'commit'];
      if (!allowed.includes(command)) {
        throw new Error(`Git command ${command} not allowed for workspace ${workspaceId}`);
      }
      try {
        const output = await runProcess('git', [command, ...(args ?? [])], workspace.root);
        await auditTrail.record(createSuccessEntry(workspaceId, 'git', command, { args } , output));
        return { output };
      } catch (error) {
        await auditTrail.record(createFailureEntry(workspaceId, 'git', command, { args }, error));
        throw error;
      }
    },
  };

  const testing: MCPTool<TestArgs, { output: string }> = {
    name: 'testing',
    description: 'Run automated test commands inside the workspace sandbox.',
    execute: async ({ workspaceId, command, args }) => {
      const workspace = registry.get(workspaceId);
      const workspaceConfig = config.workspaces.find((item) => item.id === workspaceId);
      const allowed = workspaceConfig?.testCommands ?? ['npm', 'pnpm'];
      if (!allowed.includes(command)) {
        throw new Error(`Test command ${command} not allowed for workspace ${workspaceId}`);
      }
      try {
        const output = await runProcess(command, args ?? [], workspace.root);
        await auditTrail.record(createSuccessEntry(workspaceId, 'testing', command, { args }, output));
        return { output };
      } catch (error) {
        await auditTrail.record(createFailureEntry(workspaceId, 'testing', command, { args }, error));
        throw error;
      }
    },
  };

  return {
    tools: {
      filesystem,
      git,
      testing,
    },
    listWorkspaces: () => registry.list(),
    getAuditTrail: () => auditTrail.getAll(),
  };
};
