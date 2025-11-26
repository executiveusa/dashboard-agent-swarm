import type { TaskKind, ModelChoice, LLMProfile } from "@/types/api";

/**
 * Model Router for DARYA Studio
 * Chooses the optimal LLM provider and model based on task type and org preferences
 * Integrates with LiteLLM for unified API access
 */

export function chooseModel(
  taskKind: TaskKind,
  orgLlmProfile?: LLMProfile
): ModelChoice {
  // Check for org-specific overrides first
  if (orgLlmProfile?.modelOverrides?.[taskKind]) {
    return orgLlmProfile.modelOverrides[taskKind];
  }

  // Default model selection based on task kind
  switch (taskKind) {
    case "vision_image":
    case "design_layout":
      // Use Gemini for visual/design tasks (cost-effective + good quality)
      return { provider: "google", model: "gemini-2.0-flash-exp" };

    case "reasoning":
      // Use best reasoning model based on cost tier
      if (orgLlmProfile?.costTier === "premium") {
        return { provider: "openai", model: "o1" };
      }
      return { provider: "openai", model: "gpt-4o" };

    case "code":
      // Anthropic Claude for code generation
      return { provider: "anthropic", model: "claude-3-5-sonnet-20241022" };

    case "whatsapp_conversation":
      // Fast, conversational model for WhatsApp (Spanish optimized)
      return { provider: "google", model: "gemini-2.0-flash-exp" };

    case "content_generation":
      // Balance of quality and cost for content
      return { provider: "openai", model: "gpt-4o-mini" };

    case "cheap_bulk":
      // Use local or cheapest option for bulk operations
      if (orgLlmProfile?.preferredProvider === "local") {
        return { provider: "local", model: "llama-3.1-8b" };
      }
      return { provider: "google", model: "gemini-1.5-flash" };

    case "safety_check":
      // Fast safety/moderation check
      return { provider: "openai", model: "gpt-4o-mini" };

    default:
      // Default fallback
      return { provider: "openai", model: "gpt-4o" };
  }
}

export function getProviderBaseUrl(provider: ModelChoice["provider"]): string {
  const liteLLMBase = import.meta.env.VITE_LITELLM_BASE_URL;

  if (liteLLMBase) {
    // If LiteLLM is configured, route all requests through it
    return liteLLMBase;
  }

  // Fallback to direct provider URLs
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1";
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta";
    case "local":
      return import.meta.env.VITE_LOCAL_LLM_URL || "http://localhost:8000";
    default:
      return "https://api.openai.com/v1";
  }
}

export function getProviderApiKey(
  provider: ModelChoice["provider"]
): string | undefined {
  switch (provider) {
    case "openai":
      return import.meta.env.VITE_OPENAI_API_KEY;
    case "anthropic":
      return import.meta.env.VITE_ANTHROPIC_API_KEY;
    case "google":
      return import.meta.env.VITE_GEMINI_API_KEY;
    case "local":
      return undefined; // Local models typically don't need API keys
    default:
      return undefined;
  }
}

/**
 * Estimate cost per 1K tokens for budgeting
 * Returns cost in USD
 */
export function estimateCost(
  model: ModelChoice,
  inputTokens: number,
  outputTokens: number
): number {
  // Simplified cost estimation (real costs vary)
  const costs: Record<string, { input: number; output: number }> = {
    o1: { input: 0.015, output: 0.06 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
    "gemini-2.0-flash-exp": { input: 0, output: 0 }, // Free tier
    "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
    "llama-3.1-8b": { input: 0, output: 0 }, // Local/free
  };

  const modelCosts = costs[model.model] || { input: 0.001, output: 0.002 };

  return (
    (inputTokens / 1000) * modelCosts.input +
    (outputTokens / 1000) * modelCosts.output
  );
}
