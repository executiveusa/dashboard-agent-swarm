import type { Request, Response } from "express";
import { z } from "zod";

import type { Database } from "../lib/db";
import { createSseConnection } from "../lib/sse";
import type { RuntimeConfig } from "../lib/config";
import { logger } from "../lib/logger";
import { attachStreamCleanup } from "./shared";

const listParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
});

export function createMlPatternRoutes(db: Database, config: RuntimeConfig) {
  const listPatterns = async (req: Request, res: Response) => {
    const params = listParamsSchema.parse(req.query);
    const result = await db.query(
      `SELECT id, created_at, pattern_type, pattern_data, frequency
       FROM ml_patterns
       ORDER BY created_at DESC
       LIMIT $1`,
      [params.limit]
    );

    res.json({ data: result.rows });
  };

  const streamPatterns = async (_req: Request, res: Response) => {
    const connection = createSseConnection(res, { heartbeatMs: config.SSE_HEARTBEAT_INTERVAL_MS });
    connection.send({ type: "ready" });

    const release = await db.listen("ml_patterns_changes", (payload) => {
      try {
        connection.send(JSON.parse(payload));
      } catch (error) {
        logger.error({ error, payload }, "failed to parse ml_patterns notification payload");
      }
    });

    await attachStreamCleanup({ res, release, connection });
  };

  return { listPatterns, streamPatterns };
}
