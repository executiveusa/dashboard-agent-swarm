import { contextBridge, ipcRenderer } from 'electron';

const desktopAgent = {
  selectWorkspace: () => ipcRenderer.invoke('desktop-agent:select-workspace'),
  readTextFile: (filePath: string) => ipcRenderer.invoke('desktop-agent:read-text-file', filePath)
};

contextBridge.exposeInMainWorld('desktopAgent', desktopAgent);
