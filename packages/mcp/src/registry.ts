import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

type ToolConfig = {
  id: string;
  title: string;
  description?: string;
  mcpServer: string;
  requires?: string[];
};

type RegistryConfig = {
  tools: ToolConfig[];
};

export class MCPRegistry {
  private cache: RegistryConfig | null = null;

  constructor(private readonly configPath = resolve(process.cwd(), 'packages/mcp/registry.yml')) {}

  load(): RegistryConfig {
    if (!this.cache) {
      const file = readFileSync(this.configPath, 'utf-8');
      this.cache = yaml.load(file) as RegistryConfig;
    }
    return this.cache;
  }

  getTool(id: string) {
    return this.load().tools.find((tool) => tool.id === id);
  }

  listTools() {
    return this.load().tools;
  }
}
