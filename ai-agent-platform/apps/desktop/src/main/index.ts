import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ProxyRequest {
  target?: 'edge' | 'local';
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface Sandbox {
  id: string;
  label: string;
  path: string;
}

interface SandboxFilePayload {
  sandboxId: string;
  relativePath: string;
  contents?: string;
  encoding?: BufferEncoding;
}

const EDGE_ENDPOINT = process.env.LOVABLE_EDGE_URL ?? 'https://edge.lovable.dev';
const LOCAL_RUNNER_URL = process.env.LOCAL_RUNNER_URL ?? 'http://localhost:3333';
const UI_URL = process.env.DESKTOP_UI_URL ?? 'http://localhost:3000';
const __dirname = dirname(fileURLToPath(import.meta.url));
const rendererHtml = join(__dirname, '..', 'renderer', 'index.html');

const sandboxStorePath = join(app.getPath('userData'), 'sandboxes.json');
let sandboxes: Sandbox[] = [];

const loadSandboxes = async (): Promise<void> => {
  try {
    const raw = await readFile(sandboxStorePath, 'utf8');
    sandboxes = (JSON.parse(raw) as Sandbox[]).map((sandbox) => ({
      ...sandbox,
      path: resolve(sandbox.path),
    }));
  } catch {
    sandboxes = [];
  }
};

const persistSandboxes = async (): Promise<void> => {
  await mkdir(dirname(sandboxStorePath), { recursive: true });
  await writeFile(sandboxStorePath, JSON.stringify(sandboxes, null, 2), 'utf8');
};

const resolveSandboxPath = (sandboxId: string, relativePath: string): string => {
  const sandbox = sandboxes.find((item) => item.id === sandboxId);
  if (!sandbox) {
    throw new Error(`Unknown sandbox ${sandboxId}`);
  }
  const basePath = resolve(sandbox.path);
  const target = resolve(basePath, relativePath);
  const safePrefix = basePath.endsWith(sep) ? basePath : `${basePath}${sep}`;
  if (target !== basePath && !target.startsWith(safePrefix)) {
    throw new Error('Attempted to escape sandbox boundaries');
  }
  return target;
};

const createWindow = async (): Promise<void> => {
  await loadSandboxes();

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'index.js'),
      sandbox: true,
    },
    show: false,
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  try {
    await window.loadURL(UI_URL);
  } catch (error) {
    console.warn(`Falling back to bundled renderer: ${(error as Error).message}`);
    await window.loadFile(rendererHtml);
  }
};

const bootstrap = async (): Promise<void> => {
  session.defaultSession.setPermissionRequestHandler((_, __, callback) => {
    callback(false);
  });

  ipcMain.handle('proxy:request', async (_event, request: ProxyRequest): Promise<ProxyResponse> => {
    const base = request.target === 'local' ? LOCAL_RUNNER_URL : EDGE_ENDPOINT;
    const url = request.path.startsWith('http') ? new URL(request.path) : new URL(request.path, base);
    const body =
      typeof request.body === 'string' || request.body instanceof Buffer
        ? request.body
        : request.body !== undefined
          ? JSON.stringify(request.body)
          : undefined;
    const response = await fetch(url, {
      method: request.method ?? 'GET',
      headers: request.headers,
      body,
    });

    const bodyText = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: bodyText,
    } satisfies ProxyResponse;
  });

  ipcMain.handle('sandbox:list', async () => {
    await loadSandboxes();
    return sandboxes;
  });

  ipcMain.handle('sandbox:add', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return sandboxes;
    }

    const targetPath = resolve(result.filePaths[0]);
    const label = targetPath.split(/[/\\]/).filter(Boolean).pop() ?? 'Sandbox';
    sandboxes.push({ id: randomUUID(), label, path: targetPath });
    await persistSandboxes();
    return sandboxes;
  });

  ipcMain.handle('sandbox:remove', async (_event, sandboxId: string) => {
    sandboxes = sandboxes.filter((sandbox) => sandbox.id !== sandboxId);
    await persistSandboxes();
    return sandboxes;
  });

  ipcMain.handle('sandbox:readFile', async (_event, payload: SandboxFilePayload) => {
    const filePath = resolveSandboxPath(payload.sandboxId, payload.relativePath);
    const contents = await readFile(filePath, payload.encoding ?? 'utf8');
    return contents;
  });

  ipcMain.handle('sandbox:writeFile', async (_event, payload: SandboxFilePayload) => {
    const filePath = resolveSandboxPath(payload.sandboxId, payload.relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, payload.contents ?? '', payload.encoding ?? 'utf8');
    return { ok: true };
  });

  ipcMain.handle('sandbox:open', async (_event, sandboxId: string) => {
    const sandbox = sandboxes.find((item) => item.id === sandboxId);
    if (!sandbox) {
      throw new Error(`Unknown sandbox ${sandboxId}`);
    }
    await shell.openPath(sandbox.path);
    return { ok: true };
  });

  await createWindow();
};

app.whenReady().then(bootstrap).catch((error) => {
  console.error('Failed to bootstrap desktop shell', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
