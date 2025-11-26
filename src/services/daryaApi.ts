/**
 * DARYA API Client
 * Calls the backend endpoints for all /darya/* operations
 */

import type {
  Blueprint,
  UGCPack,
  DonorThankYouPack,
  ContentPack,
  ProductFactory,
  ExperimentPlan,
  DesignSystem,
  OrgSettings,
} from "@/types/api";

// Helper for API calls
async function callApi<T>(endpoint: string, body: any): Promise<T> {
  // Use relative path which will be proxied by Vite or Nginx
  const response = await fetch(`/darya${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  return response.json();
}

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
  return callApi<Blueprint>("/blueprint", params);
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
  return callApi<UGCPack>("/ugc-pack", params);
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
  return callApi<DonorThankYouPack>("/donor-thankyou", params);
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
  return callApi<ContentPack>("/content-pack", params);
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
  return callApi<ProductFactory>("/product-factory", params);
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
  return callApi<ExperimentPlan>("/experiment-plan", params);
}
