import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET() {
  const base = join(process.cwd(), '../../packages/shared/workflows');
  const files = ['sample-cleanup.yaml', 'sample-firecrawl.yaml'];
  const entries = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(base, file), 'utf8');
      const firstLine = content.split('\n')[0];
      return {
        name: firstLine.replace('name: ', ''),
        description: content.split('\n')[1]?.replace('description: ', ''),
      };
    })
  );
  return NextResponse.json(entries);
}

