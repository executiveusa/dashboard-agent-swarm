import { z } from "zod";
import type { TaskKind, LLMRequest, LLMResponse, LLMProfile } from "@/types/api";
import { chooseModel, getProviderBaseUrl, getProviderApiKey } from "./modelRouter";

/**
 * Safe LLM Call Wrapper
 * Handles provider routing, retries, timeouts, JSON parsing, and Zod validation
 */

interface SafeLlmCallOptions<T> {
  taskKind: TaskKind;
  systemPrompt: string;
  userPrompt: string;
  orgId?: string;
  orgLlmProfile?: LLMProfile;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  schema?: z.ZodSchema<T>;
  retries?: number;
  timeoutMs?: number;
}

interface SafeLlmCallResult<T> {
  success: boolean;
  data?: T;
  rawResponse?: string;
  error?: string;
  metadata?: {
    model: string;
    provider: string;
    tokensUsed: number;
    duration: number;
    cost: number;
  };
}

export async function safeLlmCall<T = string>(
  options: SafeLlmCallOptions<T>
): Promise<SafeLlmCallResult<T>> {
  const {
    taskKind,
    systemPrompt,
    userPrompt,
    orgLlmProfile,
    temperature = 0.7,
    maxTokens = 2000,
    responseFormat = "text",
    schema,
    retries = 3,
    timeoutMs = 30000,
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  // Choose model based on task kind and org preferences
  const modelChoice = chooseModel(taskKind, orgLlmProfile);
  const baseUrl = getProviderBaseUrl(modelChoice.provider);
  const apiKey = getProviderApiKey(modelChoice.provider);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Build request payload
      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userPrompt },
      ];

      // Call LLM with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      
      if (modelChoice.provider === "google") {
        // Gemini API has different format
        response = await fetch(`${baseUrl}/models/${modelChoice.model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
          signal: controller.signal,
        });
      } else {
        // OpenAI/Anthropic/LiteLLM compatible format
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: modelChoice.model,
            messages,
            temperature,
            max_tokens: maxTokens,
            ...(responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      
      // Extract content based on provider
      let content: string;
      let tokensUsed = 0;

      if (modelChoice.provider === "google") {
        content = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        tokensUsed = responseData.usageMetadata?.totalTokenCount || 0;
      } else {
        content = responseData.choices?.[0]?.message?.content || "";
        tokensUsed = responseData.usage?.total_tokens || 0;
      }

      // Parse and validate if JSON schema provided
      if (responseFormat === "json" && schema) {
        try {
          const parsed = JSON.parse(content);
          const validated = schema.parse(parsed);
          
          return {
            success: true,
            data: validated,
            rawResponse: content,
            metadata: {
              model: modelChoice.model,
              provider: modelChoice.provider,
              tokensUsed,
              duration: Date.now() - startTime,
              cost: estimateCostFromTokens(modelChoice, tokensUsed),
            },
          };
        } catch (parseError) {
          if (attempt < retries - 1) {
            lastError = parseError as Error;
            continue; // Retry on parse/validation error
          }
          throw parseError;
        }
      }

      // Return text response
      return {
        success: true,
        data: content as T,
        rawResponse: content,
        metadata: {
          model: modelChoice.model,
          provider: modelChoice.provider,
          tokensUsed,
          duration: Date.now() - startTime,
          cost: estimateCostFromTokens(modelChoice, tokensUsed),
        },
      };

    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on timeout or abort
      if (error instanceof Error && error.name === "AbortError") {
        break;
      }

      // Wait before retry with exponential backoff
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError?.message || "Unknown error",
  };
}

function estimateCostFromTokens(modelChoice: { provider: string; model: string }, totalTokens: number): number {
  // Simplified: assume 75% input, 25% output
  const inputTokens = Math.floor(totalTokens * 0.75);
  const outputTokens = Math.floor(totalTokens * 0.25);
  
  const costs: Record<string, { input: number; output: number }> = {
    "o1": { input: 0.015, output: 0.060 },
    "gpt-4o": { input: 0.0025, output: 0.010 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
    "gemini-2.0-flash-exp": { input: 0, output: 0 },
    "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  };

  const modelCosts = costs[modelChoice.model] || { input: 0.001, output: 0.002 };
  
  return (
    (inputTokens / 1000) * modelCosts.input +
    (outputTokens / 1000) * modelCosts.output
  );
}
