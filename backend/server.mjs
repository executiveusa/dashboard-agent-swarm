import http from 'node:http';

const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

const requiredEnv = [
  'DATABASE_URL',
  'MESSAGE_BUS_URL',
  'EDGE_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
];

const optionalEnv = [
  'OLLAMA_BASE_URL',
  'LM_STUDIO_BASE_URL',
  'FIRECRAWL_BASE_URL',
];

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    writeJson(res, 400, { error: 'invalid_request' });
    return;
  }

  if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/readyz')) {
    const missing = requiredEnv.filter((key) => !process.env[key] || process.env[key]?.length === 0);
    const payload = {
      status: missing.length ? 'degraded' : 'ok',
      missing,
    };
    writeJson(res, missing.length ? 503 : 200, payload);
    return;
  }

  if (req.method === 'GET' && req.url === '/env-status') {
    const payload = {
      required: requiredEnv.map((key) => ({ key, configured: Boolean(process.env[key]) })),
      optional: optionalEnv.map((key) => ({ key, configured: Boolean(process.env[key]) })),
    };
    writeJson(res, 200, payload);
    return;
  }

  writeJson(res, 404, { error: 'not_found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Lovable backend listening on http://${HOST}:${PORT}`);
});

function writeJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
