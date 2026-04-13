import { Hono } from 'hono';

const app = new Hono();

// Map known WhatsApp numbers to orgIds — add entries as clients are onboarded
const PHONE_ORG_MAP: Record<string, string> = {
  // e.g. '+15551234567': 'org-kupuri-media',
};

function resolveOrgId(from: string): string {
  return PHONE_ORG_MAP[from] ?? 'org-kupuri-media';
}

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER ?? process.env.TWILIO_MX_NUMBER ?? '';

async function getAIResponse(userMessage: string, orgId: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "Hola! Gracias por tu mensaje. Un momento, por favor.";
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        system: "Eres SYNTHIA, asistente de Kupuri Media en Ciudad de México. Responde en español mexicano, profesional y cálido. Máximo 2 oraciones.",
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json() as { content: [{ text: string }] };
    return data.content[0].text;
  } catch (err) {
    console.error("[WhatsApp] AI response error:", err);
    return "Gracias por contactar a Kupuri Media. Le responderemos a la brevedad.";
  }
}

async function sendWhatsAppReply(to: string, from: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_SECRET;
  if (!accountSid || !authToken) {
    console.log(`[WhatsApp] MOCK send to ${to}: "${body}"`);
    return;
  }
  const params = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    Body: body,
  });
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[WhatsApp] Send failed: ${res.status} ${errText}`);
  } else {
    const result = await res.json() as { sid: string };
    console.log(`[WhatsApp] Sent message SID: ${result.sid}`);
  }
}

// POST /api/whatsapp/webhook - Handle incoming Twilio WhatsApp messages
app.post('/webhook', async (c) => {
  // Twilio sends form-encoded data
  const formData = await c.req.formData();
  const from = formData.get('From') as string | null;
  const body = formData.get('Body') as string | null;

  if (!from || !body) {
    return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {
      'Content-Type': 'text/xml',
    });
  }

  console.log(`[WhatsApp] Message from ${from}: "${body}"`);

  const orgId = resolveOrgId(from);
  const aiResponse = await getAIResponse(body, orgId);
  await sendWhatsAppReply(from, WHATSAPP_FROM, aiResponse);

  // Return empty TwiML — Twilio requires a valid XML response
  return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {
    'Content-Type': 'text/xml',
  });
});

// GET /api/whatsapp/webhook - Verification endpoint for WhatsApp / Twilio
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
