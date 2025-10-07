import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { stat, readFile, writeFile, readdir, rename, rm, mkdir } from 'node:fs/promises';
import AdmZip from 'adm-zip';
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOW_ROOTS = [process.cwd(), join(tmpdir(), 'ai-agent-platform')];

const pathSchema = z.string().min(1);

const guardPath = async (target: string): Promise<string> => {
  const resolved = resolve(target);
  for (const root of ALLOW_ROOTS) {
    if (resolved.startsWith(resolve(root))) {
      return resolved;
    }
  }
  throw new Error(`Path not allowed: ${target}`);
};

const ensureParent = async (target: string): Promise<void> => {
  const dir = dirname(target);
  await mkdir(dir, { recursive: true });
};

export const filesTool = {
  name: 'FilesTool',
  async list(path: string) {
    const safe = await guardPath(pathSchema.parse(path));
    const entries = await readdir(safe, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    }));
  },
  async read(path: string) {
    const safe = await guardPath(pathSchema.parse(path));
    const fileStat = await stat(safe);
    if (fileStat.size > MAX_FILE_SIZE) {
      throw new Error('File exceeds size limit');
    }
    return readFile(safe, 'utf8');
  },
  async write(path: string, data: string) {
    const safe = await guardPath(pathSchema.parse(path));
    if (Buffer.byteLength(data, 'utf8') > MAX_FILE_SIZE) {
      throw new Error('Payload exceeds size limit');
    }
    await ensureParent(safe);
    await writeFile(safe, data, 'utf8');
    return { path: safe };
  },
  async move(src: string, dst: string) {
    const safeSrc = await guardPath(pathSchema.parse(src));
    const safeDst = await guardPath(pathSchema.parse(dst));
    await ensureParent(safeDst);
    await rename(safeSrc, safeDst);
    return { from: safeSrc, to: safeDst };
  },
  async remove(path: string) {
    const safe = await guardPath(pathSchema.parse(path));
    await rm(safe, { recursive: true, force: true });
    return { path: safe };
  },
  async unzip(zipPath: string, outDir: string) {
    const safeZip = await guardPath(pathSchema.parse(zipPath));
    const safeOut = await guardPath(pathSchema.parse(outDir));
    await ensureParent(safeOut);
    await mkdir(safeOut, { recursive: true });
    const zipStat = await stat(safeZip);
    if (zipStat.size > MAX_FILE_SIZE * 4) {
      throw new Error('Zip exceeds size limit');
    }
    const archive = new AdmZip(safeZip);
    archive.getEntries().forEach((entry) => {
      const entryPath = resolve(safeOut, entry.entryName);
      if (!entryPath.startsWith(safeOut)) {
        throw new Error('Zip entry attempted path traversal');
      }
    });
    archive.extractAllTo(safeOut, true);
    return { outDir: safeOut, files: archive.getEntries().map((e) => e.entryName) };
  },
};

