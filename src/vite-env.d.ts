/// <reference types="vite/client" />

declare global {
  interface DesktopAgentBridge {
    selectWorkspace(): Promise<string | null>;
    readTextFile(filePath: string): Promise<string>;
  }

  interface Window {
    desktopAgent?: DesktopAgentBridge;
  }
}

export {};
