import type { FirecrawlResponse } from '../types/api.js';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0/scrape';

export async function scrapeUrl(url: string): Promise<FirecrawlResponse> {
  const apiKey = process.env.VITE_FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error('Firecrawl API key not configured');
  }

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        pageOptions: {
          onlyMainContent: true,
          includeHtml: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data) {
       throw new Error('Invalid response from Firecrawl');
    }

    // Map Firecrawl response to our internal type
    // Firecrawl returns { success: true, data: { content, metadata, ... } }
    // We want to return a FirecrawlResponse
    
    const result = data.data;

    return {
      url,
      title: result.metadata?.title || 'No Title',
      headings: [], // Firecrawl might not return structured headings directly in v0
      bodyText: result.markdown || result.content || '',
      metadata: result.metadata || {},
      links: result.links || [],
    };

  } catch (error) {
    console.error('Firecrawl scrape failed:', error);
    throw error;
  }
}
