import { Hono } from 'hono';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

export const fileRoutes = new Hono();

const ROOT = join(process.cwd(), '..');  // archonx-os-main root

function safeReadDir(dirPath: string): string[] {
  try { return existsSync(dirPath) ? readdirSync(dirPath) : []; } catch { return []; }
}

// GET /api/files/blueprints — list plans/*.md files
fileRoutes.get('/blueprints', (c) => {
  const plansDir = join(ROOT, 'plans');
  const files = safeReadDir(plansDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const fp = join(plansDir, f);
      const stat = statSync(fp);
      return { name: f, path: `plans/${f}`, size: stat.size, modified: stat.mtime.toISOString() };
    });
  return c.json({ blueprints: files });
});

// GET /api/files/configs — list archonx/config/*.yaml files
fileRoutes.get('/configs', (c) => {
  const configDir = join(ROOT, 'archonx', 'config');
  const files = safeReadDir(configDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json'))
    .map(f => {
      const fp = join(configDir, f);
      const stat = statSync(fp);
      return { name: f, path: `archonx/config/${f}`, size: stat.size, modified: stat.mtime.toISOString() };
    });
  return c.json({ configs: files });
});

// GET /api/files/reports — list ops/reports/*.json and *.jsonl
fileRoutes.get('/reports', (c) => {
  const reportsDir = join(ROOT, 'ops', 'reports');
  const files = safeReadDir(reportsDir)
    .filter(f => f.endsWith('.json') || f.endsWith('.jsonl'))
    .map(f => {
      const fp = join(reportsDir, f);
      const stat = statSync(fp);
      return { name: f, path: `ops/reports/${f}`, size: stat.size, modified: stat.mtime.toISOString() };
    });
  return c.json({ reports: files });
});

// GET /api/files/souls — list .agent-souls/**/*.md
fileRoutes.get('/souls', (c) => {
  const soulsDir = join(ROOT, 'dashboard-agent-swarm', '.agent-souls');
  const files: { name: string; path: string; size: number; modified: string }[] = [];
  function walk(dir: string, rel: string) {
    safeReadDir(dir).forEach(f => {
      const fp = join(dir, f);
      const rp = `${rel}/${f}`;
      try {
        const stat = statSync(fp);
        if (stat.isDirectory()) walk(fp, rp);
        else if (f.endsWith('.md')) files.push({ name: f, path: rp, size: stat.size, modified: stat.mtime.toISOString() });
      } catch {}
    });
  }
  walk(soulsDir, '.agent-souls');
  return c.json({ souls: files });
});
