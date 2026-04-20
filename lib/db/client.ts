import { Pool, type QueryResultRow } from "pg";
import { CREATE_TABLES_SQL } from "@/lib/db/schema";

type GlobalDb = typeof globalThis & {
  __deployHealthDbPool?: Pool;
  __deployHealthSchemaInit?: Promise<void>;
};

const globalDb = globalThis as GlobalDb;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to use Deploy Health Scanner data APIs.");
  }

  return new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  });
}

export function getPool(): Pool {
  if (!globalDb.__deployHealthDbPool) {
    globalDb.__deployHealthDbPool = createPool();
  }

  return globalDb.__deployHealthDbPool;
}

export async function ensureSchemaReady(): Promise<void> {
  if (!globalDb.__deployHealthSchemaInit) {
    globalDb.__deployHealthSchemaInit = (async () => {
      const pool = getPool();
      for (const statement of CREATE_TABLES_SQL) {
        await pool.query(statement);
      }
    })();
  }

  await globalDb.__deployHealthSchemaInit;
}

export async function queryRows<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query<T>(text, params);
  return result.rows;
}
