import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ConsoleClient } from '../../../components/ConsoleClient';

async function loadWorkflows() {
  const base = join(process.cwd(), '../../packages/shared/workflows');
  const files = ['sample-cleanup.yaml', 'sample-firecrawl.yaml'];
  const entries = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(base, file), 'utf8');
      const [nameLine, descriptionLine] = content.split('\n');
      return {
        name: nameLine.replace('name: ', ''),
        description: descriptionLine?.replace('description: ', '') ?? '---',
      };
    })
  );
  return entries;
}

export default async function ConsolePage() {
  const workflows = await loadWorkflows();
  return <ConsoleClient workflows={workflows} />;
}
