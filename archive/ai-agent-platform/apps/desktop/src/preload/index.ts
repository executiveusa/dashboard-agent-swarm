import { contextBridge, ipcRenderer } from 'electron';

export interface ProxyRequest {
  target?: 'edge' | 'local';
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface SandboxDescriptor {
  id: string;
  label: string;
  path: string;
}

export interface SandboxFilePayload {
  sandboxId: string;
  relativePath: string;
  contents?: string;
  encoding?: BufferEncoding;
}

const api = {
  proxyRequest: (payload: ProxyRequest): Promise<ProxyResponse> => ipcRenderer.invoke('proxy:request', payload),
  listSandboxes: (): Promise<SandboxDescriptor[]> => ipcRenderer.invoke('sandbox:list'),
  addSandbox: (): Promise<SandboxDescriptor[]> => ipcRenderer.invoke('sandbox:add'),
  removeSandbox: (sandboxId: string): Promise<SandboxDescriptor[]> => ipcRenderer.invoke('sandbox:remove', sandboxId),
  readSandboxFile: (payload: SandboxFilePayload): Promise<string> => ipcRenderer.invoke('sandbox:readFile', payload),
  writeSandboxFile: (payload: SandboxFilePayload): Promise<{ ok: boolean }> => ipcRenderer.invoke('sandbox:writeFile', payload),
  openSandbox: (sandboxId: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('sandbox:open', sandboxId),
};

contextBridge.exposeInMainWorld('desktopAPI', api);

export type DesktopAPI = typeof api;

declare global {
  interface Window {
    desktopAPI: DesktopAPI;
  }
}
