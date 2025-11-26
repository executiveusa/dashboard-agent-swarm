/**
 * LemonAI Agent Runner
 * Executes agents via LemonAI runtime and logs to agent_runs table
 */

import type { AgentRunRequest, AgentRunResponse } from "@/types/api";
import { getAgentById } from "./agentRegistry";

const LEMONAI_API_URL = import.meta.env.VITE_LEMONAI_API_URL || "http://localhost:3000";

export async function runAgent(request: AgentRunRequest): Promise<AgentRunResponse> {
  const { agentId, orgId, taskKind, input, projectId } = request;
  
  // Validate agent exists
  const agentDef = getAgentById(agentId);
  if (!agentDef) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Build LemonAI request
  const lemonRequest = {
    agent_id: agentId,
    org_id: orgId,
    task_type: taskKind || "general",
    input,
    context: {
      project_id: projectId,
      agent_config: agentDef,
    },
  };

  const startTime = Date.now();
  let result: any;
  let error: string | undefined;

  try {
    // Call LemonAI runtime
    const response = await fetch(`${LEMONAI_API_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lemonRequest),
    });

    if (!response.ok) {
      throw new Error(`LemonAI error: ${response.statusText}`);
    }

    result = await response.json();
  } catch (err) {
    error = (err as Error).message;
    
    // Fallback: if LemonAI is unreachable, return mock response
    console.warn(`LemonAI unavailable, using mock response:`, error);
    result = {
      output: {
        status: "mock",
        message: "LemonAI runtime not available. This is a mock response.",
        agent: agentDef.name,
        input,
      },
      meta: {
        model: agentDef.model || "unknown",
        provider: "mock",
        tokens_used: 0,
      },
    };
  }

  const duration = Date.now() - startTime;

  // Log to agent_runs table via backend API
  const runLog = {
    agentId,
    orgId,
    projectId,
    taskType: taskKind || "general",
    inputMeta: sanitizeInput(input),
    outputMeta: sanitizeOutput(result.output),
    durationMs: duration,
    tokensUsed: result.meta?.tokens_used || 0,
    costUsd: result.meta?.cost || 0,
    modelUsed: result.meta?.model || agentDef.model,
    providerUsed: result.meta?.provider || "unknown",
    env: import.meta.env.MODE === "production" ? "prod" : "dev",
  };

  try {
    await fetch('/api/agents/agent-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runLog),
    });
  } catch (logError) {
    console.error("Failed to log agent run:", logError);
  }

  console.log("[Agent Run Logged]", runLog);

  return {
    id: runLog.id,
    agentId,
    output: result.output,
    tokensUsed: runLog.tokensUsed,
    model: runLog.modelUsed,
    duration: runLog.durationMs,
    createdAt: runLog.createdAt,
  };
}

/**
 * Sanitize input for logging (remove PII, large payloads)
 */
function sanitizeInput(input: any): any {
  if (!input) return {};
  
  // Remove sensitive fields
  const sanitized = { ...input };
  delete sanitized.password;
  delete sanitized.apiKey;
  delete sanitized.token;
  
  // Truncate large strings
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === "string" && sanitized[key].length > 500) {
      sanitized[key] = sanitized[key].substring(0, 500) + "... [truncated]";
    }
  });
  
  return sanitized;
}

/**
 * Sanitize output for logging (summary only, no full content)
 */
function sanitizeOutput(output: any): any {
  if (!output) return {};
  
  return {
    status: output.status || "unknown",
    type: output.type || typeof output,
    hasContent: !!output.content || !!output.data,
    keys: Object.keys(output).slice(0, 10),
  };
}
