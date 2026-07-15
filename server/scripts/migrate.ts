import fs from 'fs';
import path from 'path';
import { sql } from '../index.js';

const MIGRATIONS_DIR = path.join(process.cwd(), '../db/migrations');

async function runMigrations() {
  console.log('Starting migrations...');
  
  try {
    // Ensure migrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const files = fs.readdirSync(MIGRATIONS_DIR).sort();

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      // Check if already applied
      const [existing] = await sql`
        SELECT id FROM migrations WHERE name = ${file}
      `;

      if (existing) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`Applying ${file}...`);
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      
      // Split by semicolon to handle multiple statements if needed, 
      // but postgres.js might handle it. Let's try simple execution first.
      // Note: postgres.js `sql` template tag expects values for interpolation. 
      // For raw SQL file execution, we might need `sql.file` or `sql.unsafe`.
      // `sql.unsafe` is risky but fine for migrations we control.
      
      await sql.unsafe(content);

      await sql`
        INSERT INTO migrations (name) VALUES (${file})
      `;
      
      console.log(`Applied ${file}`);
    }

    console.log('Migrations complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
