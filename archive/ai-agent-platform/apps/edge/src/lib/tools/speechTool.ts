import { z } from 'zod';
import { getEnv } from '../env.js';

const speechSchema = z.object({
  text: z.string().min(1),
  voice: z.string().default('alloy'),
  provider: z.enum(['vapi', 'voiceflow']).optional(),
});

export type SpeechInput = z.infer<typeof speechSchema>;

export const speechTool = {
  name: 'SpeechTool',
  async synthesize(input: SpeechInput) {
    const env = getEnv();
    const payload = speechSchema.parse(input);
    const provider = payload.provider ?? (env.VAPI_API_KEY ? 'vapi' : 'voiceflow');
    if (provider === 'vapi') {
      if (!env.VAPI_API_KEY) throw new Error('VAPI_API_KEY missing');
      const response = await fetch('https://api.vapi.ai/v1/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.VAPI_API_KEY}`,
        },
        body: JSON.stringify({ text: payload.text, voice: payload.voice }),
      });
      if (!response.ok) throw new Error(`Vapi TTS failed: ${response.status}`);
      const data = await response.json();
      return data;
    }
    if (!env.VOICEFLOW_API_KEY) throw new Error('VOICEFLOW_API_KEY missing');
    const response = await fetch('https://general-runtime.voiceflow.com/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: env.VOICEFLOW_API_KEY,
      },
      body: JSON.stringify({ text: payload.text, voice: payload.voice }),
    });
    if (!response.ok) throw new Error(`Voiceflow TTS failed: ${response.status}`);
    return response.json();
  },
};

