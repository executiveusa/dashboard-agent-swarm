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
interface ImportMetaEnv {
  readonly VITE_DATA_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
