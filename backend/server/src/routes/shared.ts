import type { Response } from "express";

import { logger } from "../lib/logger";
import { createSseConnection } from "../lib/sse";

export interface StreamDependencies<T> {
  res: Response;
  release: () => Promise<void>;
  connection: ReturnType<typeof createSseConnection<T>>;
}

export const attachStreamCleanup = async <T>({ res, release, connection }: StreamDependencies<T>) => {
  const cleanup = async () => {
    try {
      await release();
    } catch (error) {
      logger.error({ error }, "error releasing postgres listener");
    }
    connection.close();
  };

  res.on("close", cleanup);
  res.on("finish", cleanup);
};
