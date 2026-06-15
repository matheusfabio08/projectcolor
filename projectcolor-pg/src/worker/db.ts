import "dotenv/config";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper: executa query e retorna todas as linhas
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

// Helper: executa query e retorna primeira linha ou null
export async function queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const result = await pool.query(sql, params);
  return (result.rows[0] as T) ?? null;
}

// Helper: executa INSERT/UPDATE/DELETE sem retorno
export async function queryRun(sql: string, params: any[] = []): Promise<void> {
  await pool.query(sql, params);
}

// Helper: executa INSERT com RETURNING id
export async function queryInsert(sql: string, params: any[] = []): Promise<number> {
  const result = await pool.query(sql, params);
  return result.rows[0]?.id as number;
}