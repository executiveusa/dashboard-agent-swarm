import "dotenv/config";

import cors from "cors";
import express from "express";
import http from "http";

import { loadConfig } from "./lib/config";
import { Database } from "./lib/db";
import { logger } from "./lib/logger";
import { createLogRoutes } from "./routes/logs";
import { createTaskRoutes } from "./routes/tasks";
import { createFileIndexRoutes } from "./routes/fileIndex";
import { createRollbackRoutes } from "./routes/rollbacks";
import { createMlPatternRoutes } from "./routes/mlPatterns";
import { PostgresWebSocketBridge } from "./lib/websocket";

async function bootstrap() {
  const config = loadConfig();
  const app = express();
  const db = new Database({ connectionString: config.DATABASE_URL, logger });

  const corsOrigins = config.CORS_ORIGIN?.split(",").map((origin) => origin.trim());
  app.use(
    cors({
      origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : undefined,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  const taskRoutes = createTaskRoutes(db, config);
  const logRoutes = createLogRoutes(db, config);
  const fileIndexRoutes = createFileIndexRoutes(db, config);
  const rollbackRoutes = createRollbackRoutes(db, config);
  const mlPatternRoutes = createMlPatternRoutes(db, config);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/tasks", taskRoutes.listTasks);
  app.get("/api/tasks/stream", taskRoutes.streamTasks);

  app.get("/api/logs", logRoutes.listLogs);
  app.get("/api/logs/stream", logRoutes.streamLogs);

  app.get("/api/file-index", fileIndexRoutes.listFileIndex);
  app.get("/api/file-index/stream", fileIndexRoutes.streamFileIndex);

  app.get("/api/rollbacks", rollbackRoutes.listRollbacks);
  app.get("/api/rollbacks/stream", rollbackRoutes.streamRollbacks);

  app.get("/api/ml-patterns", mlPatternRoutes.listPatterns);
  app.get("/api/ml-patterns/stream", mlPatternRoutes.streamPatterns);

  const server = http.createServer(app);

  new PostgresWebSocketBridge(
    server,
    {
      "/ws/tasks": "tasks_changes",
      "/ws/logs": "logs_changes",
      "/ws/file-index": "file_index_changes",
      "/ws/rollbacks": "rollbacks_changes",
      "/ws/ml-patterns": "ml_patterns_changes",
    },
    {
      db,
      logger,
      heartbeatMs: config.SSE_HEARTBEAT_INTERVAL_MS,
    }
  );

  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "multi-agent data service ready");
  });

  const shutdown = async () => {
    logger.info("shutting down");
    server.close();
    await db.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((error) => {
  logger.error({ error }, "fatal error in backend bootstrap");
  process.exit(1);
});
