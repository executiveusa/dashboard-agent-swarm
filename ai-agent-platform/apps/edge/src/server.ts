import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { handler as agentHandler } from './functions/agent.js';
import { handler as workflowTriggerHandler } from './functions/workflows/trigger.js';
import { handler as vapiHandler } from './functions/webhook/vapi.js';
import { handler as voiceflowHandler } from './functions/webhook/voiceflow.js';
import { handler as oiEventsHandler } from './functions/webhook/oievents.js';

interface Route {
  method: string;
  match: (pathname: string) => boolean;
  handler: (request: Request) => Promise<Response>;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

const routes: Route[] = [
  {
    method: 'POST',
    match: (pathname) => pathname === '/agent',
    handler: agentHandler,
  },
  {
    method: 'POST',
    match: (pathname) => pathname === '/workflows/trigger',
    handler: workflowTriggerHandler,
  },
  {
    method: 'POST',
    match: (pathname) => pathname === '/webhooks/vapi',
    handler: vapiHandler,
  },
  {
    method: 'POST',
    match: (pathname) => pathname === '/webhooks/voiceflow',
    handler: voiceflowHandler,
  },
  {
    method: 'POST',
    match: (pathname) => pathname === '/webhooks/oievents',
    handler: oiEventsHandler,
  },
  {
    method: 'GET',
    match: (pathname) => pathname === '/healthz',
    handler: async () =>
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
];

const port = Number.parseInt(process.env.PORT ?? '8787', 10);

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    if (!req.url || !req.method) {
      respondWithJson(res, 400, { error: 'Invalid request' });
      return;
    }

    if (req.method === 'OPTIONS') {
      respondWithCors(res, 204);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const route = routes.find((candidate) => candidate.method === req.method && candidate.match(url.pathname));

    if (!route) {
      respondWithJson(res, 404, { error: 'Not found' });
      return;
    }

    const request = await toRequest(req, url, req.method);
    const response = await route.handler(request);
    await sendResponse(res, response);
  } catch (error) {
    console.error('Edge server error', error);
    respondWithJson(res, 500, { error: (error as Error).message });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Edge runtime listening on http://0.0.0.0:${port}`);
});

const toRequest = async (req: IncomingMessage, url: URL, method: string): Promise<Request> => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else {
      headers.set(key, value);
    }
  }

  const body = await readBody(req);
  const init: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = body;
  }

  return new Request(url, init);
};

const readBody = async (req: IncomingMessage): Promise<Buffer | undefined> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk as Buffer);
    }
  }

  if (!chunks.length) {
    return undefined;
  }

  return Buffer.concat(chunks);
};

const sendResponse = async (res: ServerResponse, response: Response): Promise<void> => {
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  for (const [key, value] of Object.entries(corsHeaders)) {
    if (!res.hasHeader(key)) {
      res.setHeader(key, value);
    }
  }

  if (!response.body) {
    const text = await response.text();
    res.end(text);
    return;
  }

  const stream = Readable.fromWeb(response.body);
  stream.on('error', (error) => {
    console.error('Stream error', error);
    res.destroy(error);
  });
  stream.pipe(res);
};

const respondWithJson = (res: ServerResponse, status: number, payload: Record<string, unknown>): void => {
  res.statusCode = status;
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const respondWithCors = (res: ServerResponse, status: number): void => {
  res.statusCode = status;
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }
  res.end();
};

