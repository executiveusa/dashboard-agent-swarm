import fetch, { type RequestInit } from 'node-fetch';
import type { AuditEvent } from '@ai-agent-platform/shared';
import { getEnv } from './env.js';

interface LovableRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
}

const buildUrl = (path: string, query: LovableRequestOptions['query'] = {}) => {
  const env = getEnv();
  const base = env.LOVABLE_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  const mergedQuery: Record<string, string | number | boolean | undefined> = {
    projectId: env.LOVABLE_PROJECT_ID,
    ...query,
  };
  for (const [key, value] of Object.entries(mergedQuery)) {
    if (value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url;
};

const request = async <T>(path: string, options: LovableRequestOptions = {}): Promise<T> => {
  const env = getEnv();
  const url = buildUrl(path, options.query);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.LOVABLE_API_KEY}`,
    'X-Lovable-Project': env.LOVABLE_PROJECT_ID,
    ...Object.fromEntries(Object.entries(options.headers ?? {}).map(([key, value]) => [key, String(value)])),
  };

  const response = await fetch(url.toString(), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Lovable Cloud request failed');
    throw new Error(`Lovable Cloud error ${response.status}: ${message}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Failed to parse Lovable Cloud response: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const lovableApi = {
  async recordAudit(event: AuditEvent): Promise<void> {
    await request('/audit/events', {
      method: 'POST',
      body: JSON.stringify({ event }),
    });
  },
  async fetchWorkflowDefinition(name: string): Promise<string> {
    const result = await request<{ definition?: string; workflow?: { definition?: string } }>(
      `/workflows/${encodeURIComponent(name)}`,
      { method: 'GET' },
    );
    const definition = result?.definition ?? result?.workflow?.definition;
    if (!definition) {
      throw new Error(`Workflow ${name} not found in Lovable Cloud`);
    }
    return definition;
  },
};

export type LovableApi = typeof lovableApi;
