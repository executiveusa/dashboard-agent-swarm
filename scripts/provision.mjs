#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EOL } from 'node:os';
import { load } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const [, , environment = process.env.ENVIRONMENT, ...rest] = process.argv;
if (!environment) {
  console.error('Usage: node scripts/provision.mjs <environment> [--skip-migrations]');
  process.exit(1);
}

const skipMigrations = rest.includes('--skip-migrations');
const configPath = resolve(__dirname, '..', 'configs', 'environments', `${environment}.yaml`);

let config;
try {
  config = load(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`Unable to read environment configuration at ${configPath}`);
  console.error(error);
  process.exit(1);
}

const secrets = config?.secrets ?? {};
const supabase = config?.supabase ?? {};

const tmp = mkdtempSync(join(tmpdir(), `lovable-${environment}-`));
const envFile = join(tmp, `.env.${environment}`);
writeFileSync(
  envFile,
  Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join(EOL)
);

console.log(`\n[provision] Wrote ephemeral env file to ${envFile}`);

if (!skipMigrations) {
  if (!supabase?.dbUrl) {
    console.warn('[provision] Missing supabase.dbUrl in configuration, skipping migrations');
  } else {
    console.log(`[provision] Applying Supabase migrations from ${supabase.migrationsDir ?? 'supabase/migrations'}`);
    const result = spawnSync(
      'npx',
      [
        'supabase',
        'db',
        'push',
        '--db-url',
        supabase.dbUrl,
        ...(supabase.schema ? ['--schema', supabase.schema] : []),
        ...(supabase.migrationsDir ? ['--migration-dir', supabase.migrationsDir] : []),
      ],
      {
        stdio: 'inherit',
        cwd: resolve(__dirname, '..'),
        env: { ...process.env, ...secrets },
      }
    );

    if (result.status !== 0) {
      console.error('[provision] Supabase migration step failed');
      cleanup();
      process.exit(result.status ?? 1);
    }
  }
}

console.log('[provision] Syncing secrets via Lovable secret injector');
const injectorResult = spawnSync(
  'npx',
  [
    'lovable-tagger',
    'inject-secrets',
    `--env=${environment}`,
    `--file=${envFile}`,
  ],
  {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, ...secrets },
  }
);

if (injectorResult.status !== 0) {
  console.error('[provision] Failed to inject secrets');
  cleanup();
  process.exit(injectorResult.status ?? 1);
}

console.log('[provision] Provisioning complete');
cleanup();

function cleanup() {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch (error) {
    console.warn('[provision] Failed to clean up temp directory', error);
  }
}
