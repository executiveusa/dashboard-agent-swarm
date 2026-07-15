import { Request, Response } from "express";
import type { Database } from "../lib/db";
import type { RuntimeConfig } from "../lib/config";

/**
 * Agent management routes
 * POST /api/agents/:id/run - Invoke an agent with a prompt
 * GET  /api/agents/:id/status - Get agent status
 * GET  /api/agents - List all registered agents with health
 */

interface AgentEndpoints {
  [id: string]: string | undefined;
}

type DevikaExecutionProfile =
  | "devika-pi-default"
  | "devika-pi-safe"
  | "devika-pi-research";

const DEVIKA_EXECUTION_PROFILES: ReadonlySet<DevikaExecutionProfile> = new Set([
  "devika-pi-default",
  "devika-pi-safe",
  "devika-pi-research",
]);

// Known agent backend endpoints
const AGENT_ENDPOINTS: AgentEndpoints = {
  "agent_zero": "http://agent-zero:8000",
  "devika": "http://localhost:1337",
  "pauli": "http://localhost:5001",
  "cynthia": "http://localhost:8787",  // telemetry via backend
};

export function createAgentRoutes(db: Database, config: RuntimeConfig) {
  return {
    /**
     * POST /api/agents/:id/run
     * Body: { prompt: string, projectName?: string, model?: string }
     */
    async runAgent(req: Request, res: Response) {
      const { id } = req.params;
      const { prompt, projectName, model, executionProfile, beadId } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "prompt is required" });
      }

      const endpoint = AGENT_ENDPOINTS[id];
      if (!endpoint) {
        return res.status(404).json({ error: `Unknown agent: ${id}` });
      }

      if (
        id === "devika" &&
        executionProfile !== undefined &&
        !DEVIKA_EXECUTION_PROFILES.has(executionProfile as DevikaExecutionProfile)
      ) {
        return res.status(400).json({
          error: "invalid executionProfile",
          allowed: Array.from(DEVIKA_EXECUTION_PROFILES),
        });
      }

      if (id === "devika" && beadId !== undefined && typeof beadId !== "string") {
        return res.status(400).json({ error: "beadId must be a string" });
      }

      try {
        // Route to the appropriate agent backend
        let agentUrl: string;
        let body: any;

        switch (id) {
          case "devika":
            agentUrl = `${endpoint}/api/execute`;
            body = {
              prompt,
              project_name: projectName || "default",
              executionProfile:
                (executionProfile as DevikaExecutionProfile | undefined) ||
                "devika-pi-default",
              beadId: beadId || `BEAD-DEVIKA-PI-${Date.now()}`,
              // Backward compatibility for legacy devika backends.
              model_id: model || "claude-sonnet-4-20250514",
            };
            break;
          case "agent_zero":
            agentUrl = `${endpoint}/api/task`;
            body = { message: prompt };
            break;
          default:
            agentUrl = `${endpoint}/api/run`;
            body = { prompt, model };
        }

        const agentRes = await fetch(agentUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120000), // 2 min timeout
        });

        if (!agentRes.ok) {
          const text = await agentRes.text();
          return res.status(agentRes.status).json({ error: text });
        }

        const data = await agentRes.json();
        return res.json({
          agentId: id,
          output: data,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        return res.status(502).json({
          error: `Agent ${id} unreachable: ${err.message}`,
        });
      }
    },

    /**
     * GET /api/agents/:id/status
     */
    async getAgentStatus(req: Request, res: Response) {
      const { id } = req.params;
      const endpoint = AGENT_ENDPOINTS[id];

      if (!endpoint) {
        return res.json({ id, status: "unknown", message: "No backend configured" });
      }

      try {
        const healthRes = await fetch(`${endpoint}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        return res.json({
          id,
          status: healthRes.ok ? "online" : "degraded",
          statusCode: healthRes.status,
        });
      } catch {
        return res.json({ id, status: "offline" });
      }
    },

    /**
     * GET /api/agents
     * Returns all agent statuses
     */
    async listAgents(_req: Request, res: Response) {
      const results = await Promise.all(
        Object.entries(AGENT_ENDPOINTS).map(async ([id, endpoint]) => {
          if (!endpoint) return { id, status: "unknown" };
          try {
            const healthRes = await fetch(`${endpoint}/health`, {
              signal: AbortSignal.timeout(2000),
            });
            return { id, status: healthRes.ok ? "online" : "degraded" };
          } catch {
            return { id, status: "offline" };
          }
        })
      );
      return res.json(results);
    },
  };
}
