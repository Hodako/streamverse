import type { QueryResultRow } from 'pg';
import { pool } from './pool.js';

export async function sql<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const res = await pool.query<T>(text, params);
  return res;
}
