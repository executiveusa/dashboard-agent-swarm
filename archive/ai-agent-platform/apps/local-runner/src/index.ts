import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadConfig } from './runtime/config.js';
import { BrowserAutomation, type BrowserAction } from './runtime/browserAutomation.js';
import { CodeExecutor, type CodeExecutionRequest } from './runtime/codeExecutor.js';
import { ResourceExceededError, SessionManager } from './runtime/sessions.js';

interface ToolRequestBody<T> {
  id?: string;
  sessionId?: string;
  payload: T;
}

const config = loadConfig();
const sessions = new SessionManager(config);
const codeExecutor = new CodeExecutor(config.code);
const browserAutomation = new BrowserAutomation(config.browser);

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      return send(res, 400, { error: 'Missing request URL' });
    }

    if (req.method === 'POST' && req.url.startsWith('/tools/code')) {
      const body = await readJson<ToolRequestBody<CodeExecutionRequest>>(req);
      const payload = body?.payload;
      if (!payload?.source || (payload.runtime !== 'python' && payload.runtime !== 'node')) {
        return send(res, 400, { error: 'Invalid code payload' });
      }

      const session = sessions.ensureSession(body.sessionId ?? body.id, 'code');
      sessions.registerExecution(session);
      try {
        const result = await codeExecutor.execute(session, payload);
        sessions.complete(session);
        return send(res, 200, result);
      } catch (error) {
        sessions.complete(session);
        return handleError(res, error);
      }
    }

    if (req.method === 'POST' && req.url.startsWith('/tools/browser')) {
      const body = await readJson<ToolRequestBody<{ plan: BrowserAction[] }>>(req);
      const plan = body?.payload?.plan;
      if (!Array.isArray(plan)) {
        return send(res, 400, { error: 'Browser payload missing plan array' });
      }

      const session = sessions.ensureSession(body.sessionId ?? body.id, 'browser');
      sessions.registerExecution(session);
      try {
        const result = await browserAutomation.execute(session, plan);
        sessions.complete(session);
        return send(res, 200, result);
      } catch (error) {
        sessions.complete(session);
        return handleError(res, error);
      }
    }

    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    return handleError(res, error);
  }
});

server.listen(config.port, () => {
  console.log(`Local OI proxy listening on http://localhost:${config.port}`);
});

const send = (res: ServerResponse, status: number, payload: unknown): void => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
};

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const buffers: Buffer[] = [];
  for await (const chunk of req) {
    buffers.push(Buffer.from(chunk));
  }

  if (!buffers.length) {
    return {} as T;
  }

  try {
    return JSON.parse(Buffer.concat(buffers).toString('utf8')) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
  }
}

const handleError = (res: ServerResponse, error: unknown): void => {
  if (error instanceof ResourceExceededError) {
    return send(res, 429, { error: error.message });
  }
  console.error('Local runner error', error);
  return send(res, 500, { error: (error as Error).message });
};
