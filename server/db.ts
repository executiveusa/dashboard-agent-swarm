import postgres from 'postgres';

/**
 * Shared PostgreSQL client.
 *
 * Extracted from `index.ts` so route handlers can depend on the database
 * without importing the Hono app entrypoint (which previously created a
 * circular import: index.ts -> routes/*.ts -> index.ts).
 */
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://dashboard:changeme@localhost:5432/dashboard';

export const sql = postgres(DATABASE_URL);
