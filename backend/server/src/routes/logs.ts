import type { Request, Response } from "express";
import { z } from "zod";

import type { Database } from "../lib/db";
import { createSseConnection } from "../lib/sse";
import type { RuntimeConfig } from "../lib/config";
import { logger } from "../lib/logger";
import { attachStreamCleanup } from "./shared";

const listParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(500).default(100),
});

export function createLogRoutes(db: Database, config: RuntimeConfig) {
  const listLogs = async (req: Request, res: Response) => {
    const params = listParamsSchema.parse(req.query);
    const result = await db.query(
      `SELECT id, created_at, task_id, action, details, risk_level
       FROM logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [params.limit]
    );

    res.json({ data: result.rows });
  };

  const streamLogs = async (_req: Request, res: Response) => {
    const connection = createSseConnection(res, { heartbeatMs: config.SSE_HEARTBEAT_INTERVAL_MS });
    connection.send({ type: "ready" });

    const release = await db.listen("logs_changes", (payload) => {
      try {
        connection.send(JSON.parse(payload));
      } catch (error) {
        logger.error({ error, payload }, "failed to parse log notification payload");
      }
    });

    await attachStreamCleanup({ res, release, connection });
  };

  return { listLogs, streamLogs };
}
