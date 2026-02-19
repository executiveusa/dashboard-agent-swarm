/**
 * DARYA Logic Service
 * Implements all /darya/* business logic using safeLlmCall
 * Moved from frontend to backend for security
 */

import { z } from "zod";
import { safeLlmCall } from "./safeLlmCall.js";
import { scrapeUrl } from "./firecrawl.js";
import type {
  Blueprint,
  UGCPack,
  DonorThankYouPack,
  ContentPack,
  ProductFactory,
  ExperimentPlan,
  DesignSystem,
  OrgSettings,
} from "../types/api.js";

// Zod schemas for validation
const BlueprintSchema = z.object({
  id: z.string().optional(), // AI might not generate ID
  orgId: z.string().optional(),
  projectName: z.string(),
  niche: z.string(),
  audience: z.string(),
  goals: z.array(z.string()),
  pages: z.array(z.any()),
  designSystem: z.any(),
  contentStrategy: z.any(),
  conversionOptimizations: z.array(z.any()),
  createdAt: z.string().optional(),
});

/**
 * Generate Smart Site Blueprint
 */
export async function generateBlueprint(params: {
  orgId: string;
  projectName: string;
  niche: string;
  audience: string;
  goals: string[];
  orgSettings?: OrgSettings;
}): Promise<Blueprint> {
  const { orgId, projectName, niche, audience, goals, orgSettings } = params;

  const systemPrompt = `You are DARYA vΩ, the lead architect for DAR Studio.
Generate a comprehensive smart site blueprint for a ${niche} project targeting ${audience}.

Brand context: ${orgSettings?.brandName || "Client"}
Goals: ${goals.join(", ")}

Return a detailed JSON blueprint including:
- Page structure (homepage, about, services, contact, etc.)
- Design system tokens (colors, fonts, spacing)
- Content strategy (tone, voice, key messages)
- Conversion optimizations (CTAs, forms, social proof)
- SEO metadata for each page

Be specific, actionable, and tailored to the niche and audience.`;

  const userPrompt = `Project: ${projectName}
Niche: ${niche}
Target Audience: ${audience}
Goals: ${goals.join(", ")}

Generate the complete blueprint now.`;

  const result = await safeLlmCall<Blueprint>({
    taskKind: "reasoning",
    systemPrompt,
    userPrompt,
    orgId,
    orgLlmProfile: orgSettings?.llmProfile,
    responseFormat: "json",
    schema: BlueprintSchema,
    temperature: 0.7,
    maxTokens: 4000,
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to generate blueprint");
  }

  return {
    ...result.data,
    id: crypto.randomUUID(),
    orgId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate UGC Content Pack
 */
export async function generateUGCPack(params: {
  orgId: string;
  campaignName: string;
  niche: string;
  platform: "tiktok" | "instagram" | "youtube_shorts" | "all";
  orgSettings?: OrgSettings;
}): Promise<UGCPack> {
  const { orgId, campaignName, niche, platform, orgSettings } = params;

  const systemPrompt = `You are Luna, the UGC & Virality Strategist from DARYA's Crypto Cuties team.
Create a viral content pack for ${platform} focused on ${niche}.

Brand: ${orgSettings?.brandName || "Client"}

Generate:
- 3-5 content pillars with example topics
- 10-15 specific UGC assets (hooks, scripts, visual concepts)
- Posting schedule and best times
- Platform-specific optimization tips

Make it actionable and ready to execute.`;

  const userPrompt = `Campaign: ${campaignName}
Niche: ${niche}
Platform: ${platform}

Create the UGC pack now.`;

  const result = await safeLlmCall({
    taskKind: "content_generation",
    systemPrompt,
    userPrompt,
    orgId,
    orgLlmProfile: orgSettings?.llmProfile,
    responseFormat: "json",
    temperature: 0.8,
    maxTokens: 3000,
  });

  if (!result.success || !result.rawResponse) {
    throw new Error(result.error || "Failed to generate UGC pack");
  }

  // Parse and structure the response
  const parsed = JSON.parse(result.rawResponse);
  return {
    id: crypto.randomUUID(),
    orgId,
    campaignName,
    niche,
    platform,
    ...parsed,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate Donor Thank You Pack
 */
export async function generateDonorThankYou(params: {
  orgId: string;
  donorName: string;
  donationAmount: number;
  campaignName: string;
  orgSettings?: OrgSettings;
}): Promise<DonorThankYouPack> {
  const { orgId, donorName, donationAmount, campaignName, orgSettings } = params;

  const systemPrompt = `You are Maya, the Fundraising & Donor Relations Specialist from DARYA's Crypto Cuties team.
Create a personalized thank-you pack for a donor.

Organization: ${orgSettings?.brandName || "Nonprofit"}
Donor: ${donorName}
Amount: $${donationAmount}
Campaign: ${campaignName}

Generate:
- Personalized email script (warm, grateful, impact-focused)
- SMS script (brief, heartfelt)
- Voice script (for automated call or voicemail)
- 3-5 follow-up messages over 30 days
- Personalization elements to include

Tone: Genuine gratitude, not transactional. Show impact.`;

  const userPrompt = `Create thank-you pack for ${donorName} who donated $${donationAmount} to ${campaignName}.`;

  const result = await safeLlmCall({
    taskKind: "content_generation",
    systemPrompt,
    userPrompt,
    orgId,
    orgLlmProfile: orgSettings?.llmProfile,
    responseFormat: "json",
    temperature: 0.7,
    maxTokens: 2000,
  });

  if (!result.success || !result.rawResponse) {
    throw new Error(result.error || "Failed to generate donor thank-you");
  }

  const parsed = JSON.parse(result.rawResponse);
  return {
    id: crypto.randomUUID(),
    orgId,
    donorName,
    donationAmount,
    campaignName,
    ...parsed,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate Content Pack (Firecrawl + AI)
 */
export async function generateContentPack(params: {
  orgId: string;
  niche: string;
  targetUrls: string[];
  goal: string;
  orgSettings?: OrgSettings;
}): Promise<ContentPack> {
  const { orgId, niche, targetUrls, goal, orgSettings } = params;

  // Scrape URLs if provided
  let scrapedContent = "";
  if (targetUrls && targetUrls.length > 0) {
    const urlsToScrape = targetUrls.slice(0, 3);
    try {
      console.log(`Scraping ${urlsToScrape.length} URLs for context...`);
      const results = await Promise.all(
        urlsToScrape.map(url => scrapeUrl(url).catch((e: any) => ({ url, error: e.message || String(e) })))
      );
      
      scrapedContent = results.map((r: any) => {
        if (r.error) return `[Source: ${r.url} - Failed: ${r.error}]`;
        // Truncate body text to ~1500 chars to fit in context
        return `[Source: ${r.url}]\nTitle: ${r.title}\nContent: ${r.bodyText?.substring(0, 1500)}...`;
      }).join("\n\n---\n\n");
    } catch (e) {
      console.error("Scraping failed", e);
    }
  }

  const systemPrompt = `You are Luna, working with DARYA to create a content engine.
Analyze the ${niche} niche and generate a comprehensive content pack.

Target URLs provided: ${targetUrls.join(", ")}
Goal: ${goal}
Brand: ${orgSettings?.brandName || "Client"}

Context from Target URLs:
${scrapedContent}

Generate:
- 5-10 blog post outlines (title, outline, keywords, word count)
- 3-5 tutorial outlines (title, steps, difficulty, duration)
- 10-15 social media snippets (platform, copy, hashtags, image prompts)

Make content SEO-optimized and conversion-focused.`;

  const userPrompt = `Niche: ${niche}
Goal: ${goal}
Competitor URLs: ${targetUrls.join(", ")}

Create the content pack now.`;

  const result = await safeLlmCall({
    taskKind: "content_generation",
    systemPrompt,
    userPrompt,
    orgId,
    orgLlmProfile: orgSettings?.llmProfile,
    responseFormat: "json",
    temperature: 0.7,
    maxTokens: 4000,
  });

  if (!result.success || !result.rawResponse) {
    throw new Error(result.error || "Failed to generate content pack");
  }

  const parsed = JSON.parse(result.rawResponse);
  return {
    id: crypto.randomUUID(),
    orgId,
    niche,
    targetUrls,
    goal,
    ...parsed,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate Digital Product Factory Blueprint
 */
export async function generateProductFactory(params: {
  orgId: string;
  niche: string;
  audience: string;
  productType: "ebook" | "course" | "template" | "tool" | "membership";
  orgSettings?: OrgSettings;
}): Promise<ProductFactory> {
  const { orgId, niche, audience, productType, orgSettings } = params;

  const systemPrompt = `You are Vega, the IP & Product Universe Builder, working with DARYA.
Design a complete digital product blueprint for ${audience} in the ${niche} niche.

Product type: ${productType}
Brand: ${orgSettings?.brandName || "Creator"}

Generate:
- Product concept (name, description, unique value, pricing)
- Funnel outline (stages, conversion goals)
- Landing page structure
- Email sequence (5-7 emails with subjects, previews, CTAs)
- Deliverables list

Make it profitable and scalable.`;

  const userPrompt = `Niche: ${niche}
Audience: ${audience}
Product Type: ${productType}

Create the product factory blueprint now.`;

  const result = await safeLlmCall({
    taskKind: "reasoning",
    systemPrompt,
    userPrompt,
    orgId,
    orgLlmProfile: orgSettings?.llmProfile,
    responseFormat: "json",
    temperature: 0.7,
    maxTokens: 3500,
  });

  if (!result.success || !result.rawResponse) {
    throw new Error(result.error || "Failed to generate product factory");
  }

  const parsed = JSON.parse(result.rawResponse);
  return {
    id: crypto.randomUUID(),
    orgId,
    niche,
    audience,
    productType,
    ...parsed,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate Experiment Plan
 */
export async function generateExperimentPlan(params: {
  orgId: string;
  projectId: string;
  hypothesis: string;
  orgSettings?: OrgSettings;
}): Promise<ExperimentPlan> {
  const { orgId, projectId, hypothesis, orgSettings } = params;

  const systemPrompt = `You are Aurora, the Ops & KPI Dashboard Manager from DARYA's team.
Design an A/B testing experiment plan based on the hypothesis.

Organization: ${orgSettings?.brandName || "Client"}
Hypothesis: ${hypothesis}

Generate:
- 3-5 experiment variants
- Success metrics and KPIs
- Implementation steps
- Expected impact
- Duration and sample size recommendations

Be data-driven and rigorous.`;

  const userPrompt = `Project ID: ${projectId}
Hypothesis: ${hypothesis}

Create the experiment plan now.`;

  const result = await safeLlmCall({
    taskKind: "reasoning",
    systemPrompt,
    userPrompt,
    orgId,
    orgLlmProfile: orgSettings?.llmProfile,
    responseFormat: "json",
    temperature: 0.6,
    maxTokens: 2500,
  });

  if (!result.success || !result.rawResponse) {
    throw new Error(result.error || "Failed to generate experiment plan");
  }

  const parsed = JSON.parse(result.rawResponse);
  return {
    id: crypto.randomUUID(),
    orgId,
    projectId,
    hypothesis,
    ...parsed,
    createdAt: new Date().toISOString(),
  };
}
