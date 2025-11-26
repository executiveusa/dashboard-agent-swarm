/**
 * Firecrawl Integration Service
 * Crawls competitor sites and extracts content for analysis
 */

import type { FirecrawlRequest, FirecrawlResponse } from "@/types/api";

const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v0";

export async function crawlUrl(request: FirecrawlRequest): Promise<FirecrawlResponse> {
  if (!FIRECRAWL_API_KEY) {
    // Return mock data if no API key configured
    return {
      url: request.url,
      title: "Mock Crawl Result",
      headings: ["Heading 1", "Heading 2", "Heading 3"],
      bodyText: "This is mock content from the crawled page. In production, this would contain the actual extracted content from the target URL.",
      metadata: {
        description: "Mock page description",
        keywords: ["mock", "crawl", "test"],
      },
      links: ["https://example.com/page1", "https://example.com/page2"],
    };
  }

  try {
    const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: request.url,
        formats: ["markdown", "html"],
        onlyMainContent: request.options?.onlyMainContent ?? true,
        includeTags: ["h1", "h2", "h3", "p", "a"],
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Firecrawl response to our format
    return {
      url: request.url,
      title: data.metadata?.title || "Untitled",
      headings: extractHeadings(data.markdown || ""),
      bodyText: data.markdown || data.text || "",
      metadata: data.metadata || {},
      links: data.links || [],
    };
  } catch (error) {
    console.error("Firecrawl error:", error);
    throw error;
  }
}

function extractHeadings(markdown: string): string[] {
  const headingRegex = /^#{1,3}\s+(.+)$/gm;
  const headings: string[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push(match[1]);
  }

  return headings;
}

/**
 * Crawl multiple URLs in parallel
 */
export async function crawlMultiple(urls: string[], orgId: string): Promise<FirecrawlResponse[]> {
  const requests = urls.map(url => crawlUrl({ url, orgId }));
  return Promise.all(requests);
}
