import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import path from 'node:path';
import { createServer, Server } from 'node:http';
import { createProxyServer, ProxyServer } from 'http-proxy';
import fs from 'node:fs/promises';

const isDev = process.env.NODE_ENV === 'development';
const rendererDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
const backendTarget = process.env.LOVABLE_BACKEND_URL ?? 'https://lovable.dev';
const proxyPort = Number(process.env.DESKTOP_PROXY_PORT ?? 48888);

let mainWindow: BrowserWindow | null = null;
let proxyServer: Server | null = null;
let proxy: ProxyServer | null = null;

const allowedPermissions = new Set([
  'clipboard-read',
  'clipboard-sanitized-write',
  'filesystem',
  'fileSystem',
  'fileSystemWrite',
  'fullscreen',
  'media',
  'notifications',
  'openExternal'
]);

async function createMainWindow() {
  if (mainWindow) {
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    }
  });

  if (isDev) {
    await mainWindow.loadURL(rendererDevServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'undocked' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function startBackendProxy() {
  if (proxyServer) {
    return proxyServer;
  }

  proxy = createProxyServer({
    changeOrigin: true,
    secure: false,
    target: backendTarget,
    ws: true
  });

  proxy.on('error', (error, req, res) => {
    if (!res || res.headersSent) {
      return;
    }

    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'proxy_error',
        message: error.message
      })
    );
  });

  proxyServer = createServer((req, res) => {
    proxy?.web(req, res);
  });

  proxyServer.on('upgrade', (req, socket, head) => {
    proxy?.ws(req, socket, head);
  });

  proxyServer.listen(proxyPort, '127.0.0.1', () => {
    console.log(
      `Desktop proxy listening on http://127.0.0.1:${proxyPort} -> ${backendTarget}`
    );
  });

  return proxyServer;
}

function registerIpcHandlers() {
  ipcMain.handle('desktop-agent:select-workspace', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('desktop-agent:read-text-file', async (_event, filePath: string) => {
    const buffer = await fs.readFile(filePath);
    return buffer.toString('utf8');
  });
}

function configurePermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (!webContents || webContents.getURL().startsWith('devtools:')) {
      callback(false);
      return;
    }

    if (allowedPermissions.has(permission)) {
      callback(true);
      return;
    }

    callback(false);
  });
}

function registerLifecycleHooks() {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });

  app.on('will-quit', () => {
    proxyServer?.close();
    proxyServer = null;
    proxy?.close();
    proxy = null;
  });
}

async function bootstrap() {
  configurePermissions();
  registerIpcHandlers();
  startBackendProxy();
  await createMainWindow();
}

app.whenReady().then(bootstrap).catch((error) => {
  console.error('Failed to launch desktop shell', error);
});

registerLifecycleHooks();
