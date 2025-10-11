import { createHash } from "crypto";
import type { IncomingMessage, Server as HttpServer } from "http";
import type { Socket } from "net";
import { setInterval, clearInterval } from "timers";

import type { Logger } from "pino";

import type { Database } from "./db";

export interface WebSocketBridgeDeps {
  db: Database;
  logger: Logger;
  heartbeatMs: number;
}

export type WebSocketRouteMap = Record<string, string>;

interface Subscription {
  clients: Set<Socket>;
  release: () => Promise<void>;
}

const WEBSOCKET_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export class PostgresWebSocketBridge {
  private readonly routes: WebSocketRouteMap;
  private readonly db: Database;
  private readonly logger: Logger;
  private readonly heartbeatMs: number;
  private readonly subscriptions = new Map<string, Subscription>();

  constructor(server: HttpServer, routes: WebSocketRouteMap, deps: WebSocketBridgeDeps) {
    this.routes = routes;
    this.db = deps.db;
    this.logger = deps.logger;
    this.heartbeatMs = deps.heartbeatMs;

    server.on("upgrade", (request, socket) => {
      this.handleUpgrade(request, socket).catch((error) => {
        this.logger.error({ error }, "failed to upgrade websocket connection");
        try {
          socket.destroy();
        } catch {
          // ignore
        }
      });
    });
  }

  private async handleUpgrade(request: IncomingMessage, socket: Socket) {
    const { pathname } = new URL(request.url ?? "", "http://localhost");
    const channel = this.routes[pathname];

    if (!channel) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    const key = request.headers["sec-websocket-key"];
    if (!key || Array.isArray(key)) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    const acceptKey = createHash("sha1").update(key + WEBSOCKET_MAGIC).digest("base64");
    const responseHeaders = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n",
    ];
    socket.write(responseHeaders.join("\r\n"));

    const subscription = await this.getOrCreateSubscription(channel);
    subscription.clients.add(socket);

    this.sendJson(socket, { type: "ready" });

    const heartbeat = setInterval(() => {
      this.sendJson(socket, { type: "heartbeat", ts: new Date().toISOString() });
    }, this.heartbeatMs);

    const cleanup = async () => {
      clearInterval(heartbeat);
      subscription.clients.delete(socket);
      try {
        socket.end();
        socket.destroy();
      } catch {
        // ignore
      }

      if (subscription.clients.size === 0) {
        this.subscriptions.delete(channel);
        try {
          await subscription.release();
        } catch (error) {
          this.logger.error({ error, channel }, "error releasing postgres listener for websocket");
        }
      }
    };

    socket.on("close", cleanup);
    socket.on("end", cleanup);
    socket.on("error", (error) => {
      this.logger.warn({ error, channel }, "websocket connection error");
      void cleanup();
    });

    socket.on("data", (buffer) => this.handleClientFrame(socket, buffer));
  }

  private async getOrCreateSubscription(channel: string): Promise<Subscription> {
    const existing = this.subscriptions.get(channel);
    if (existing) {
      return existing;
    }

    const clients = new Set<Socket>();
    const release = await this.db.listen(channel, (payload) => {
      for (const client of clients) {
        this.sendRaw(client, payload);
      }
    });

    const subscription: Subscription = { clients, release };
    this.subscriptions.set(channel, subscription);
    this.logger.info({ channel }, "websocket bridge listening for postgres notifications");
    return subscription;
  }

  private handleClientFrame(socket: Socket, buffer: Buffer) {
    if (buffer.length < 2) {
      return;
    }

    const opcode = buffer[0] & 0x0f;
    const isMasked = (buffer[1] & 0x80) === 0x80;
    let payloadLength = buffer[1] & 0x7f;
    let offset = 2;

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      payloadLength = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }

    let maskingKey: Buffer | undefined;
    if (isMasked) {
      maskingKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    let payload = buffer.slice(offset, offset + payloadLength);
    if (isMasked && maskingKey) {
      payload = unmaskPayload(payload, maskingKey);
    }

    switch (opcode) {
      case 0x8: // close
        this.sendClose(socket);
        break;
      case 0x9: // ping
        this.sendPong(socket, payload);
        break;
      case 0x1: // text
        this.logger.debug({ payload: payload.toString("utf8") }, "received websocket message");
        break;
      default:
        break;
    }
  }

  private sendJson(socket: Socket, data: unknown) {
    try {
      this.sendRaw(socket, JSON.stringify(data));
    } catch (error) {
      this.logger.error({ error }, "failed to serialize websocket payload");
    }
  }

  private sendRaw(socket: Socket, data: string) {
    const payload = Buffer.from(data, "utf8");
    const frame = createFrame(payload);
    try {
      socket.write(frame);
    } catch (error) {
      this.logger.error({ error }, "failed to write websocket frame");
    }
  }

  private sendPong(socket: Socket, payload: Buffer) {
    const frame = createFrame(payload, 0x8a);
    try {
      socket.write(frame);
    } catch (error) {
      this.logger.error({ error }, "failed to send websocket pong");
    }
  }

  private sendClose(socket: Socket) {
    const frame = createFrame(Buffer.alloc(0), 0x88);
    try {
      socket.write(frame);
      socket.end();
    } catch (error) {
      this.logger.error({ error }, "failed to send websocket close frame");
    }
  }
}

function createFrame(payload: Buffer, opcode: number = 0x81): Buffer {
  const length = payload.length;

  if (length < 126) {
    const frame = Buffer.alloc(2 + length);
    frame[0] = opcode;
    frame[1] = length;
    payload.copy(frame, 2);
    return frame;
  }

  if (length < 65536) {
    const frame = Buffer.alloc(4 + length);
    frame[0] = opcode;
    frame[1] = 126;
    frame.writeUInt16BE(length, 2);
    payload.copy(frame, 4);
    return frame;
  }

  const frame = Buffer.alloc(10 + length);
  frame[0] = opcode;
  frame[1] = 127;
  frame.writeBigUInt64BE(BigInt(length), 2);
  payload.copy(frame, 10);
  return frame;
}

function unmaskPayload(payload: Buffer, mask: Buffer): Buffer {
  const result = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    result[i] = payload[i] ^ mask[i % 4];
  }
  return result;
}
