import { z } from 'zod';
import { getEnv } from '../env.js';

const execSchema = z.object({
  service: z.enum([
    'gmail.sendEmail',
    'notion.createPage',
    'slack.postMessage',
    'drive.listFiles',
  ]),
  params: z.record(z.any()).default({}),
  userToken: z.string().optional(),
});

export type RubeExecInput = z.infer<typeof execSchema>;

const SERVICE_ENDPOINTS: Record<RubeExecInput['service'], string> = {
  'gmail.sendEmail': '/gmail/send',
  'notion.createPage': '/notion/page',
  'slack.postMessage': '/slack/postMessage',
  'drive.listFiles': '/drive/list',
};

export const rubeTool = {
  name: 'RubeTool',
  async exec(input: RubeExecInput) {
    const env = getEnv();
    if (!env.RUBE_BASE_URL || !env.RUBE_API_KEY) {
      throw new Error('Rube MCP credentials missing');
    }

    const payload = execSchema.parse(input);
    const url = new URL(SERVICE_ENDPOINTS[payload.service], env.RUBE_BASE_URL);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${payload.userToken ?? env.RUBE_API_KEY}`,
        },
        body: JSON.stringify(payload.params),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Rube MCP request failed: ${response.status}`);
      }

      return response.json() as Promise<Record<string, unknown>>;
    } finally {
      clearTimeout(timer);
    }
  },
  // TODO: Per-user OAuth token exchange and storage in Supabase for delegated access.
};

