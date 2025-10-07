import Constants from 'expo-constants';
import type { TaskArchetype } from '@ai-agent-platform/shared';

export interface AgentRequest {
  archetype: TaskArchetype;
  instructions: string;
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  requestId: string;
  output: string;
  steps?: Array<Record<string, unknown>>;
  artifacts?: Array<Record<string, unknown>>;
}

const getApiUrl = (override?: string) => {
  if (override && override.length > 0) {
    return override;
  }
  const extra = (Constants as { expoConfig?: { extra?: Record<string, unknown> } }).expoConfig?.extra ?? {};
  const value =
    (extra.lovableApiUrl as string | undefined) ??
    (extra.agentApiUrl as string | undefined) ??
    '';
  return value || '/api';
};

export const sendAgentMessage = async (
  payload: AgentRequest,
  options: {
    apiKey?: string;
    projectId?: string;
    apiUrl?: string;
  } = {},
): Promise<AgentResult> => {
  const baseUrl = getApiUrl(options.apiUrl);
  const endpoint = baseUrl.endsWith('/agent') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/agent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
      ...(options.projectId ? { 'X-Lovable-Project': options.projectId } : {}),
    },
    body: JSON.stringify({ input: payload, stream: false }),
  });
  if (!response.ok) {
    throw new Error(`Agent request failed (${response.status})`);
  }
  const data = await response.json();
  const result = data.result ?? {};
  return {
    requestId: data.requestId ?? 'unknown',
    output: result.output ?? '',
    steps: result.steps ?? [],
    artifacts: result.artifacts ?? [],
  };
};
