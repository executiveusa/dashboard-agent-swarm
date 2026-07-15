/**
 * WhatsApp Business API Integration
 * Handles inbound/outbound WhatsApp messages for LATAM (Mexico focus)
 */

import type { WhatsAppMessage, WhatsAppWebhookPayload } from "@/types/api";
import { safeLlmCall } from "./safeLlmCall";

const WHATSAPP_API_BASE_URL = import.meta.env.VITE_WHATSAPP_API_BASE_URL;
const WHATSAPP_API_TOKEN = import.meta.env.VITE_WHATSAPP_API_TOKEN;
const WHATSAPP_BUSINESS_NUMBER = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER;

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_API_BASE_URL || !WHATSAPP_API_TOKEN) {
    console.log("[WhatsApp Mock] Would send:", { to, message });
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Process incoming WhatsApp webhook
 * This would be called by your backend webhook endpoint
 */
export async function processWhatsAppWebhook(
  payload: WhatsAppWebhookPayload,
  orgId: string
): Promise<void> {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages || [];
      
      for (const message of messages) {
        await handleIncomingMessage(message, orgId);
      }
    }
  }
}

/**
 * Handle incoming WhatsApp message with DARYA AI
 */
async function handleIncomingMessage(
  message: WhatsAppMessage,
  orgId: string
): Promise<void> {
  console.log("[WhatsApp] Incoming message:", message);

  // Use DARYA to generate response
  const result = await safeLlmCall({
    taskKind: "whatsapp_conversation",
    systemPrompt: `You are a helpful WhatsApp assistant for a business in Mexico. 
Respond in Spanish (es-MX) in a friendly, conversational tone.
Keep responses concise (1-2 sentences max).
You can help with:
- Answering questions about services
- Booking appointments
- Providing business hours
- Directing to donation pages
- General customer service

Be warm, professional, and helpful.`,
    userPrompt: message.body,
    orgId,
    temperature: 0.8,
    maxTokens: 150,
  });

  if (result.success && result.data) {
    // Send AI-generated response back to user
    await sendWhatsAppMessage(message.from, result.data as string);
  } else {
    // Fallback response
    await sendWhatsAppMessage(
      message.from,
      "Disculpa, estoy teniendo problemas técnicos. ¿Puedes intentar de nuevo en un momento?"
    );
  }
}

/**
 * Send WhatsApp template message (for campaigns)
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  parameters: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_API_BASE_URL || !WHATSAPP_API_TOKEN) {
    console.log("[WhatsApp Mock] Would send template:", { to, templateName, parameters });
    return { success: true, messageId: `mock_template_${Date.now()}` };
  }

  try {
    const response = await fetch(`${WHATSAPP_API_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "es_MX" },
          components: [
            {
              type: "body",
              parameters: Object.entries(parameters).map(([key, value]) => ({
                type: "text",
                text: value,
              })),
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp template send error:", error);
    return { success: false, error: (error as Error).message };
  }
}
