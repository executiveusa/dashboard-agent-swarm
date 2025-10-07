import { createServer } from 'node:http';

const PORT = Number(process.env.LOCAL_OI_PROXY_PORT ?? 3333);

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end('Bad request');
    return;
  }

  const buffers: Uint8Array[] = [];
  for await (const chunk of req) {
    buffers.push(chunk as Uint8Array);
  }
  const body = buffers.length ? JSON.parse(Buffer.concat(buffers).toString('utf8')) : {};

  if (req.method === 'POST' && req.url.startsWith('/tools/code')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stdout: 'local execution not implemented', stderr: '', artifacts: [] }));
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/tools/browser')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ logs: ['local browser proxy stub'], plan: body }));
    return;
  }

  res.writeHead(404).end('Not found');
});

server.listen(PORT, () => {
  console.log(`Local OI proxy listening on http://localhost:${PORT}`);
});

