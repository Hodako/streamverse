import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  await pool.query(sql);
  await pool.end();
  process.stdout.write('Migration complete\n');
}

main().catch(async (err) => {
  process.stderr.write(String(err) + '\n');
  try {
    await pool.end();
  } catch {
    void 0;
  }
  process.exit(1);
});
