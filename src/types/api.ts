// Core DARYA API Types
// These match the OpenAPI spec from the master plan

export interface Blueprint {
  id: string;
  orgId: string;
  projectName: string;
  niche: string;
  audience: string;
  goals: string[];
  pages: PageSpec[];
  designSystem: DesignSystemTokens;
  contentStrategy: ContentStrategy;
  conversionOptimizations: ConversionElement[];
  createdAt: string;
}

export interface PageSpec {
  slug: string;
  title: string;
  purpose: string;
  sections: SectionSpec[];
  seo: SEOMetadata;
}

export interface SectionSpec {
  type: "hero" | "features" | "testimonials" | "cta" | "faq" | "form";
  heading?: string;
  subheading?: string;
  content?: string;
  layout?: string;
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface DesignSystemTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  spacing: string;
  borderRadius: string;
}

export interface ContentStrategy {
  tone: string;
  voiceGuidelines: string[];
  keyMessages: string[];
  callsToAction: string[];
}

export interface ConversionElement {
  type: string;
  placement: string;
  copy: string;
  variant?: string;
}

export interface UGCPack {
  id: string;
  orgId: string;
  campaignName: string;
  niche: string;
  platform: "tiktok" | "instagram" | "youtube_shorts" | "all";
  contentPillars: ContentPillar[];
  assetList: UGCAsset[];
  postingSchedule: PostingSchedule;
  createdAt: string;
}

export interface ContentPillar {
  name: string;
  description: string;
  exampleTopics: string[];
  targetAudience: string;
}

export interface UGCAsset {
  id: string;
  type: "video" | "image" | "carousel" | "story";
  hook: string;
  script?: string;
  visualConcept: string;
  cta: string;
  hashtags: string[];
}

export interface PostingSchedule {
  frequency: string;
  bestTimes: string[];
  contentMix: Record<string, number>;
}

export interface DonorThankYouPack {
  id: string;
  orgId: string;
  donorName: string;
  donationAmount: number;
  campaignName: string;
  emailScript: string;
  smsScript: string;
  voiceScript: string;
  personalizedElements: string[];
  followUpSequence: FollowUpStep[];
  createdAt: string;
}

export interface FollowUpStep {
  day: number;
  channel: "email" | "sms" | "voice" | "whatsapp";
  message: string;
  goal: string;
}

export interface DesignSystem {
  id: string;
  orgId: string;
  brandName: string;
  tokens: DesignSystemTokens;
  components: ComponentSpec[];
  guidelines: string[];
  createdAt: string;
}

export interface ComponentSpec {
  name: string;
  variants: string[];
  usage: string;
  code?: string;
}

export interface ExperimentPlan {
  id: string;
  orgId: string;
  projectId: string;
  hypothesis: string;
  experiments: Experiment[];
  successMetrics: string[];
  duration: string;
  createdAt: string;
}

export interface Experiment {
  id: string;
  name: string;
  variant: string;
  description: string;
  implementation: string;
  expectedImpact: string;
}

export interface ContentPack {
  id: string;
  orgId: string;
  niche: string;
  targetUrls: string[];
  goal: string;
  blogPosts: BlogOutline[];
  tutorials: TutorialOutline[];
  socialSnippets: SocialSnippet[];
  createdAt: string;
}

export interface BlogOutline {
  title: string;
  slug: string;
  outline: string[];
  keywords: string[];
  estimatedWordCount: number;
}

export interface TutorialOutline {
  title: string;
  steps: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDuration: string;
}

export interface SocialSnippet {
  platform: string;
  copy: string;
  hashtags: string[];
  imagePrompt?: string;
}

export interface ProductFactory {
  id: string;
  orgId: string;
  niche: string;
  audience: string;
  productType: "ebook" | "course" | "template" | "tool" | "membership";
  concept: ProductConcept;
  funnel: FunnelOutline;
  landingPage: PageSpec;
  emailSequence: EmailSequence;
  createdAt: string;
}

export interface ProductConcept {
  name: string;
  description: string;
  uniqueValue: string;
  pricing: PricingStrategy;
  deliverables: string[];
}

export interface PricingStrategy {
  model: "one-time" | "subscription" | "tiered";
  price: number;
  currency: string;
  tiers?: PricingTier[];
}

export interface PricingTier {
  name: string;
  price: number;
  features: string[];
}

export interface FunnelOutline {
  stages: FunnelStage[];
  conversionGoals: Record<string, number>;
}

export interface FunnelStage {
  name: string;
  purpose: string;
  actions: string[];
}

export interface EmailSequence {
  emails: EmailTemplate[];
  triggers: string[];
}

export interface EmailTemplate {
  subject: string;
  preview: string;
  body: string;
  cta: string;
}

// Agent Types

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  model?: string;
  tools?: string[];
  flywheelTools?: string[];
  prompt?: string;
  systemPrompt?: string;
  parents?: string[];
  children?: string[];
  status: "core" | "concept" | "future_rl_trained";
  capabilities?: string[];
}

export interface AgentRunRequest {
  agentId: string;
  input: any;
  orgId?: string;
  projectId?: string;
  taskKind?: TaskKind;
}

export interface AgentRunResponse {
  id: string;
  agentId: string;
  output: any;
  tokensUsed?: number;
  model?: string;
  duration?: number;
  createdAt: string;
}

// Model Router Types

export type TaskKind =
  | "reasoning"
  | "code"
  | "design_layout"
  | "vision_image"
  | "cheap_bulk"
  | "safety_check"
  | "whatsapp_conversation"
  | "content_generation";

export interface ModelChoice {
  provider: "openai" | "anthropic" | "google" | "local";
  model: string;
}

export interface LLMRequest {
  taskKind: TaskKind;
  messages: LLMMessage[];
  orgId?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed: number;
  finishReason: string;
}

// Multi-Tenant Types

export interface OrgSettings {
  id: string;
  orgId: string;
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  domain?: string;
  llmProfile?: LLMProfile;
  createdAt: string;
}

export interface LLMProfile {
  preferredProvider?: string;
  costTier?: "free" | "standard" | "premium";
  modelOverrides?: Record<TaskKind, ModelChoice>;
  maxTokensPerDay?: number;
}

// Affiliate & Digital Products

export interface AffiliateProgram {
  id: string;
  orgId: string;
  name: string;
  description: string;
  baseUrl: string;
  termsUrl?: string;
  createdAt: string;
}

export interface AffiliatePartner {
  id: string;
  programId: string;
  name: string;
  email: string;
  payoutModel: "cpa" | "revenue_share" | "hybrid";
  createdAt: string;
}

export interface AffiliateLink {
  id: string;
  programId: string;
  partnerId: string;
  slug: string;
  targetUrl: string;
  createdAt: string;
}

export interface AffiliateEvent {
  id: string;
  linkId: string;
  eventType: "click" | "signup" | "purchase";
  value?: number;
  currency?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Firecrawl Types

export interface FirecrawlRequest {
  url: string;
  orgId: string;
  options?: {
    includePdf?: boolean;
    onlyMainContent?: boolean;
    includeHtml?: boolean;
  };
}

export interface FirecrawlResponse {
  url: string;
  title: string;
  headings: string[];
  bodyText: string;
  metadata: Record<string, any>;
  links?: string[];
}

// WhatsApp Types

export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  timestamp: string;
  messageId: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: Record<string, any>;
    messages?: WhatsAppMessage[];
  };
}
