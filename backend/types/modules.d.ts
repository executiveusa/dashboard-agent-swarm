declare module 'eigent' {
  export interface EigentOptions {
    apiKey: string;
    endpoint?: string;
    project?: string;
  }
  export interface EigentEmbeddingOptions {
    model?: string;
    dimensions?: number;
  }
  export interface EigentCompletionOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
  export interface EigentVector {
    id: string;
    values: number[];
    metadata?: Record<string, unknown>;
  }
  export class EigentClient {
    constructor(options: EigentOptions);
    embed(input: string, options?: EigentEmbeddingOptions): Promise<EigentVector>;
    complete(prompt: string, options?: EigentCompletionOptions): Promise<string>;
  }
}

declare module 'lemonai' {
  export interface LemonTool {
    name: string;
    description: string;
    execute(payload: unknown): Promise<unknown>;
  }
  export interface LemonSandboxOptions {
    apiKey: string;
    tools?: LemonTool[];
  }
  export class LemonSandbox {
    constructor(options: LemonSandboxOptions);
    registerTool(tool: LemonTool): void;
    listTools(): LemonTool[];
  }
}

declare module 'rube-mcp-client' {
  export interface MCPRequest {
    path: string;
    payload?: Record<string, unknown>;
  }
  export interface MCPResponse<T = unknown> {
    status: number;
    data: T;
  }
  export interface RubeClientOptions {
    baseUrl: string;
    apiKey?: string;
  }
  export class RubeClient {
    constructor(options: RubeClientOptions);
    invoke<T = unknown>(request: MCPRequest): Promise<MCPResponse<T>>;
  }
}

declare module '@lovable/edge-sdk' {
  export interface LovableContext {
    requestId: string;
    environment: 'development' | 'preview' | 'production';
    secrets: Record<string, string>;
  }
  export type EdgeHandler = (request: Request, context: LovableContext) => Promise<Response>;
  export function withEdgeLogging(handler: EdgeHandler): EdgeHandler;
}
