import type { Request, Response } from "express";
import { z } from "zod";
import type { Database } from "../lib/db";
import { createSseConnection } from "../lib/sse";
import type { RuntimeConfig } from "../lib/config";
import { logger } from "../lib/logger";

const listParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
});

export function createTaskRoutes(db: Database, config: RuntimeConfig) {
  const listTasks = async (req: Request, res: Response) => {
    const params = listParamsSchema.parse(req.query);
    const result = await db.query(
      `SELECT id, created_at, task_type, status, progress, model_used, tokens_used, cost, metadata
       FROM tasks
       ORDER BY created_at DESC
       LIMIT $1`,
      [params.limit]
    );

    res.json({ data: result.rows });
  };

  const streamTasks = async (_req: Request, res: Response) => {
    const sse = createSseConnection(res, { heartbeatMs: config.SSE_HEARTBEAT_INTERVAL_MS });
    sse.send({ type: "ready" });

    const release = await db.listen("tasks_changes", (payload) => {
      try {
        sse.send(JSON.parse(payload));
      } catch (error) {
        logger.error({ error, payload }, "failed to parse task notification payload");
      }
    });

    reqCleanup(res, sse, release);
  };

  return { listTasks, streamTasks };
}

function reqCleanup<T>(
  res: Response,
  sse: ReturnType<typeof createSseConnection<T>>,
  release: () => Promise<void>
) {
  const cleanup = async () => {
    try {
      await release();
    } catch (error) {
      logger.error({ error }, "error releasing task listener");
    }
    sse.close();
  };

  res.on("close", cleanup);
  res.on("finish", cleanup);
}
