import { Hono } from 'hono';
import { sql } from '../index';

const app = new Hono();

// POST /api/whatsapp/webhook - Handle incoming WhatsApp messages
app.post('/webhook', async (c) => {
  const body = await c.req.json();
  
  console.log('[WhatsApp Webhook] Received:', JSON.stringify(body, null, 2));

  // Extract message from WhatsApp webhook payload
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message) {
    return c.json({ status: 'no_message' });
  }

  const from = message.from;
  const text = message.text?.body || '';
  const messageId = message.id;

  // TODO: Determine orgId from phone number or metadata
  const orgId = 'org-nonprofit-mx'; // Mock for now

  console.log(`[WhatsApp] Message from ${from}: "${text}"`);

  // TODO: Call safeLlmCall with es-MX persona
  // For now, return mock response
  const aiResponse = `Hola! Gracias por tu mensaje. Soy un asistente virtual. ¿En qué puedo ayudarte hoy?`;

  // TODO: Send response via WhatsApp API
  console.log(`[WhatsApp] Would send to ${from}: "${aiResponse}"`);

  return c.json({
    status: 'processed',
    messageId,
    from,
    response: aiResponse,
  });
});

// GET /api/whatsapp/webhook - Verification endpoint for WhatsApp
app.get('/webhook', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'dar_studio_verify';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    return c.text(challenge || '');
  }

  return c.json({ error: 'Verification failed' }, 403);
});

export { app as whatsappRoutes };
