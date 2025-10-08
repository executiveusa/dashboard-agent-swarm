import { z } from 'zod';
import type { AgentContext } from '@ai-agent-platform/shared';
import { getEnv } from '../env.js';
import { getSupabaseClient } from '../db.js';

const execSchema = z.object({
  service: z.enum([
    'gmail.sendEmail',
    'notion.createPage',
    'slack.postMessage',
    'drive.listFiles',
  ]),
  params: z.record(z.any()).default({}),
  userToken: z
    .union([
      z.string().min(1),
      z.object({
        accessToken: z.string().min(1),
        refreshToken: z.string().optional(),
        expiresAt: z.coerce.date().optional(),
      }),
    ])
    .optional(),
});

export type RubeExecInput = z.infer<typeof execSchema>;

type ProvidedToken = NonNullable<RubeExecInput['userToken']>;

interface NormalizedToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

const SERVICE_ENDPOINTS: Record<RubeExecInput['service'], string> = {
  'gmail.sendEmail': '/gmail/send',
  'notion.createPage': '/notion/page',
  'slack.postMessage': '/slack/postMessage',
  'drive.listFiles': '/drive/list',
};

const normalizeToken = (token: ProvidedToken): NormalizedToken => {
  if (typeof token === 'string') {
    return { accessToken: token };
  }
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
  };
};

const persistOAuthToken = async (sessionId: string, token: NormalizedToken): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client.from('rube_tokens').upsert(
    {
      session_id: sessionId,
      access_token: token.accessToken,
      refresh_token: token.refreshToken ?? null,
      expires_at: token.expiresAt ? token.expiresAt.toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'session_id' }
  );
  if (error) {
    throw new Error(`Failed to persist Rube OAuth token: ${error.message}`);
  }
};

const loadOAuthToken = async (sessionId: string): Promise<NormalizedToken | undefined> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('rube_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load Rube OAuth token: ${error.message}`);
  }
  if (!data) {
    return undefined;
  }
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token ?? undefined) as string | undefined,
    expiresAt: data.expires_at ? new Date(data.expires_at as string) : undefined,
  };
};

const resolveToken = async (
  env: ReturnType<typeof getEnv>,
  token: ProvidedToken | undefined,
  options: { sessionId?: string; audit?: AgentContext['audit'] }
): Promise<NormalizedToken> => {
  if (token) {
    const normalized = normalizeToken(token);
    if (options.sessionId) {
      await persistOAuthToken(options.sessionId, normalized);
      const event = options.audit?.newEvent?.('rube_oauth_token_stored', 'Stored Rube OAuth token', {
        sessionId: options.sessionId,
        expiresAt: normalized.expiresAt?.toISOString(),
      });
      if (event && options.audit) {
        await options.audit.record(event);
      }
    }
    return normalized;
  }

  if (options.sessionId) {
    const stored = await loadOAuthToken(options.sessionId);
    if (stored) {
      if (!stored.expiresAt || stored.expiresAt.getTime() > Date.now()) {
        const event = options.audit?.newEvent?.('rube_oauth_token_resolved', 'Loaded stored Rube OAuth token', {
          sessionId: options.sessionId,
          expiresAt: stored.expiresAt?.toISOString(),
        });
        if (event && options.audit) {
          await options.audit.record(event);
        }
        return stored;
      }
      throw new Error('Stored Rube OAuth token has expired. Request a new authorization.');
    }
  }

  if (env.RUBE_API_KEY) {
    return { accessToken: env.RUBE_API_KEY };
  }

  throw new Error('No Rube OAuth token available for this session');
};

export const rubeTool = {
  name: 'RubeTool',
  async exec(input: RubeExecInput, options: { sessionId?: string; audit?: AgentContext['audit'] } = {}) {
    const env = getEnv();
    if (!env.RUBE_BASE_URL) {
      throw new Error('Rube MCP base URL missing');
    }

    const payload = execSchema.parse(input);
    const url = new URL(SERVICE_ENDPOINTS[payload.service], env.RUBE_BASE_URL);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const authToken = await resolveToken(env, payload.userToken, options);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken.accessToken}`,
        },
        body: JSON.stringify(payload.params),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Rube MCP request failed: ${response.status}`);
      }

      const result = (await response.json()) as Record<string, unknown>;
      const event = options.audit?.newEvent?.('rube_exec', `Rube ${payload.service} executed`, {
        sessionId: options.sessionId,
        service: payload.service,
      });
      if (event && options.audit) {
        await options.audit.record(event);
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  },
};

