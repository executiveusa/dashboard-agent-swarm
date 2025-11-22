import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { AgentResult } from '@ai-agent-platform/shared';
import { getSupabaseClient } from './db.js';
import { getEnv } from './env.js';

export interface ArtifactUploadOptions {
  sessionId?: string;
  filename?: string;
  contentType?: string;
}

export interface UploadedArtifact {
  name: string;
  url?: string;
  contentType?: string;
}

const inferContentType = (filename: string | undefined, fallback: string = 'application/octet-stream'): string => {
  if (!filename) {
    return fallback;
  }
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return fallback;
};

const buildObjectPath = (filename: string, sessionId?: string): string => {
  const prefix = sessionId ? `sessions/${sessionId}` : 'global';
  return `${prefix}/${Date.now()}-${randomUUID()}-${filename}`;
};

export const uploadBufferToSupabase = async (
  buffer: Uint8Array,
  options: ArtifactUploadOptions = {}
): Promise<UploadedArtifact> => {
  const env = getEnv();
  const client = getSupabaseClient();
  const filename = options.filename ?? `${randomUUID()}`;
  const contentType = options.contentType ?? inferContentType(filename);
  const objectPath = buildObjectPath(filename, options.sessionId);

  const { error } = await client.storage
    .from(env.SUPABASE_ARTIFACTS_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: true });
  if (error) {
    throw new Error(`Failed to upload artifact: ${error.message}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await client.storage
    .from(env.SUPABASE_ARTIFACTS_BUCKET)
    .createSignedUrl(objectPath, env.SUPABASE_SIGNED_URL_TTL);

  if (signedUrlError) {
    throw new Error(`Failed to sign artifact URL: ${signedUrlError.message}`);
  }

  return { name: filename, url: signedUrlData?.signedUrl, contentType };
};

export const uploadLocalFileToSupabase = async (
  path: string,
  options: ArtifactUploadOptions = {}
): Promise<UploadedArtifact> => {
  const filename = options.filename ?? basename(path);
  const buffer = await readFile(path);
  return uploadBufferToSupabase(buffer, { ...options, filename });
};

export const normalizeArtifacts = (
  artifacts: UploadedArtifact[] | undefined
): AgentResult['artifacts'] => {
  if (!artifacts?.length) {
    return undefined;
  }
  return artifacts.map((artifact) => ({
    name: artifact.name,
    url: artifact.url,
    contentType: artifact.contentType,
  }));
};

