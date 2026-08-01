import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

// Shared DB client lives in ./db so route handlers don't have to import this
// entrypoint (avoids index.ts <-> routes/*.ts circular imports).
import { sql } from './db';
export { sql };

// Import route handlers
import { daryaRoutes } from './routes/darya';
import { agentRoutes } from './routes/agents';
import { whatsappRoutes } from './routes/whatsapp';
import { lemonStubRoutes } from './routes/lemonStub';
import { devikaRoutes } from './routes/devika';
import { repoRoutes } from './routes/repos';
import { meetingRoutes } from './routes/meeting';
import { fileRoutes } from './routes/files';

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8082', 'http://localhost:5174'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.route('/darya', daryaRoutes);
app.route('/api/agents', agentRoutes);
app.route('/api/whatsapp', whatsappRoutes);
app.route('/lemonai', lemonStubRoutes);
app.route('/api/devika', devikaRoutes);
app.route('/api/repos', repoRoutes);
app.route('/api/meeting', meetingRoutes);
app.route('/api/files', fileRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '8787');
console.log(`🚀 DAR Studio Backend starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server running at http://localhost:${port}`);
