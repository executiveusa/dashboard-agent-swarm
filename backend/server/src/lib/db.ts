import { Client, Pool, QueryResult } from "pg";
import type { Logger } from "pino";

export interface DatabaseDeps {
  connectionString: string;
  logger: Logger;
}

export class Database {
  private pool: Pool;
  private connectionString: string;
  private logger: Logger;

  constructor({ connectionString, logger }: DatabaseDeps) {
    this.pool = new Pool({ connectionString });
    this.connectionString = connectionString;
    this.logger = logger;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async listen(channel: string, handler: (payload: string) => void): Promise<() => Promise<void>> {
    const client = new Client({ connectionString: this.connectionString });
    await client.connect();
    await client.query(`LISTEN ${channel}`);

    const onNotification = (message: { channel: string; payload?: string | null }) => {
      if (!message.payload) {
        return;
      }
      handler(message.payload);
    };

    client.on("notification", onNotification);
    client.on("error", (error) => {
      this.logger.error({ error }, `Listener error on channel ${channel}`);
    });

    this.logger.info({ channel }, "listening for notifications");

    return async () => {
      client.removeListener("notification", onNotification);
      await client.query(`UNLISTEN ${channel}`);
      await client.end();
      this.logger.info({ channel }, "stopped listening");
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
