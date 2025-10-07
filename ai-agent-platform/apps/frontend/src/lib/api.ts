export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AgentRequest {
  archetype: 'research' | 'coding' | 'automation' | 'data-cleaning' | 'voice' | 'general';
  instructions: string;
  metadata?: Record<string, unknown>;
  stream?: boolean;
}

export interface AgentResult {
  requestId: string;
  output: string;
  steps?: unknown[];
}

export const sendAgentMessage = async (payload: AgentRequest): Promise<AgentResult> => {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: payload, stream: false }),
  });
  if (!response.ok) {
    throw new Error('Agent request failed');
  }
  const data = await response.json();
  return { requestId: data.requestId, output: data.result.output, steps: data.result.steps };
};

export const fetchWorkflows = async (): Promise<Array<{ name: string; description?: string }>> => {
  const response = await fetch('/api/workflows');
  if (!response.ok) {
    throw new Error('Failed to load workflows');
  }
  return response.json();
};

