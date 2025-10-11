import type { Response } from "express";

export interface SseOptions {
  heartbeatMs: number;
}

export interface SseConnection<T> {
  send(data: T): void;
  close(): void;
}

export function createSseConnection<T>(res: Response, options: SseOptions): SseConnection<T> {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    res.write(":keepalive\n\n");
  }, options.heartbeatMs);

  return {
    send(data: T) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      clearInterval(heartbeat);
      res.end();
    },
  };
}
