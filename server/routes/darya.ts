import { Hono } from 'hono';
import { sql } from '../db';
import * as daryaLogic from '../services/daryaLogic';
import type { OrgSettings } from '../types/api';

const app = new Hono();

// Helper to get org settings and map to API type
async function getOrgSettings(orgId: string): Promise<OrgSettings | undefined> {
  try {
    const [row] = await sql`
      SELECT * FROM org_settings WHERE org_id = ${orgId}
    `;

    if (!row) return undefined;

    return {
      id: row.id,
      orgId: row.org_id,
      brandName: row.brand_name,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      domain: row.domain,
      llmProfile: row.llm_profile,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error fetching org settings:', error);
    return undefined;
  }
}

// POST /darya/blueprint
app.post('/blueprint', async (c) => {
  const body = await c.req.json();
  const { orgId, projectName, niche, audience, goals } = body;

  if (!orgId || !projectName || !niche || !audience) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const orgSettings = await getOrgSettings(orgId);

  try {
    const blueprint = await daryaLogic.generateBlueprint({
      orgId,
      projectName,
      niche,
      audience,
      goals: goals || [],
      orgSettings,
    });
    return c.json(blueprint);
  } catch (error: any) {
    console.error('Error generating blueprint:', error);
    return c.json({ error: error.message || 'Failed to generate blueprint' }, 500);
  }
});

// POST /darya/ugc-pack
app.post('/ugc-pack', async (c) => {
  const body = await c.req.json();
  const { orgId, campaignName, niche, platform } = body;

  if (!orgId || !campaignName || !niche || !platform) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const orgSettings = await getOrgSettings(orgId);

  try {
    const ugcPack = await daryaLogic.generateUGCPack({
      orgId,
      campaignName,
      niche,
      platform,
      orgSettings,
    });
    return c.json(ugcPack);
  } catch (error: any) {
    console.error('Error generating UGC pack:', error);
    return c.json({ error: error.message || 'Failed to generate UGC pack' }, 500);
  }
});

// POST /darya/donor-thankyou
app.post('/donor-thankyou', async (c) => {
  const body = await c.req.json();
  const { orgId, donorName, donationAmount, campaignName } = body;

  if (!orgId || !donorName || !donationAmount || !campaignName) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const orgSettings = await getOrgSettings(orgId);

  try {
    const thankYou = await daryaLogic.generateDonorThankYou({
      orgId,
      donorName,
      donationAmount,
      campaignName,
      orgSettings,
    });
    return c.json(thankYou);
  } catch (error: any) {
    console.error('Error generating donor thank you:', error);
    return c.json({ error: error.message || 'Failed to generate donor thank you' }, 500);
  }
});

// POST /darya/content-pack
app.post('/content-pack', async (c) => {
  const body = await c.req.json();
  const { orgId, niche, targetUrls, goal } = body;

  if (!orgId || !niche || !goal) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const orgSettings = await getOrgSettings(orgId);

  try {
    const contentPack = await daryaLogic.generateContentPack({
      orgId,
      niche,
      targetUrls: targetUrls || [],
      goal,
      orgSettings,
    });
    return c.json(contentPack);
  } catch (error: any) {
    console.error('Error generating content pack:', error);
    return c.json({ error: error.message || 'Failed to generate content pack' }, 500);
  }
});

// POST /darya/product-factory
app.post('/product-factory', async (c) => {
  const body = await c.req.json();
  const { orgId, niche, audience, productType } = body;

  if (!orgId || !niche || !audience || !productType) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const orgSettings = await getOrgSettings(orgId);

  try {
    const productFactory = await daryaLogic.generateProductFactory({
      orgId,
      niche,
      audience,
      productType,
      orgSettings,
    });
    return c.json(productFactory);
  } catch (error: any) {
    console.error('Error generating product factory:', error);
    return c.json({ error: error.message || 'Failed to generate product factory' }, 500);
  }
});

// POST /darya/experiment-plan
app.post('/experiment-plan', async (c) => {
  const body = await c.req.json();
  const { orgId, projectId, hypothesis } = body;

  if (!orgId || !projectId || !hypothesis) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const orgSettings = await getOrgSettings(orgId);

  try {
    const experimentPlan = await daryaLogic.generateExperimentPlan({
      orgId,
      projectId,
      hypothesis,
      orgSettings,
    });
    return c.json(experimentPlan);
  } catch (error: any) {
    console.error('Error generating experiment plan:', error);
    return c.json({ error: error.message || 'Failed to generate experiment plan' }, 500);
  }
});

// POST /darya/feedback
app.post('/feedback', async (c) => {
  const body = await c.req.json();
  const { orgId, agentId, runId, rating, comment } = body;

  if (!orgId || !agentId || !runId) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  // TODO: Store in agent_feedback table
  console.log('Feedback received:', { orgId, agentId, runId, rating, comment });

  return c.json({ success: true, message: 'Feedback recorded' });
});

export { app as daryaRoutes };
