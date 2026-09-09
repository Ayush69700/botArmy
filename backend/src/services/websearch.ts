export interface SearchResult {
  title: string;
  snippet: string;
  url?: string;
}

/**
 * Searches the web for information using public knowledge APIs (DuckDuckGo & Wikipedia)
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const cleanQuery = query.trim();

  // 1. Try DuckDuckGo Instant Answer API (fast, reliable, free, no API key required)
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'CompanionAI/1.0 (WebKnowledgeBot)' },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = (await res.json()) as any;

      if (data.AbstractText) {
        results.push({
          title: data.Heading || cleanQuery,
          snippet: data.AbstractText,
          url: data.AbstractURL,
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text) {
            results.push({
              title: topic.FirstURL?.split('/').pop() || cleanQuery,
              snippet: topic.Text,
              url: topic.FirstURL,
            });
          }
        }
      }
    }
  } catch (err: any) {
    // Continue to Wikipedia search
  }

  // 2. Try Wikipedia Summary Search for factual, scientific, historical, biographical, or geographical queries
  if (results.length < 2) {
    try {
      const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&utf8=1&srlimit=2`;
      const searchRes = await fetch(wikiSearchUrl, {
        headers: { 'User-Agent': 'CompanionAI/1.0 (WebKnowledgeBot)' },
        signal: AbortSignal.timeout(3000),
      });

      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as any;
        const searchHits = searchData?.query?.search || [];

        for (const hit of searchHits) {
          const title = hit.title;
          const snippet = (hit.snippet || '')
            .replace(/<[^>]+>/g, '') // strip HTML tags
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");

          if (snippet) {
            results.push({
              title,
              snippet: `${snippet}...`,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`,
            });
          }
        }
      }
    } catch {
      // Ignore Wikipedia failure
    }
  }

  return results.slice(0, 4);
}

/**
 * Determines if a query should trigger web search (general knowledge, facts, "what is", "who is", "latest", "how to", etc.)
 */
export function isGeneralKnowledgeQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Question words and informational triggers
  const patterns = [
    /^(what|who|when|where|why|how|which|can you explain|tell me about|define|explain)\b/i,
    /\b(weather|news|today|latest|score|capital of|president of|ceo of|history of|meaning of)\b/i,
    /\b(how do i|how to|tutorial|recipe|code for|react|python|javascript|typescript|function|api)\b/i,
    /\b(population of|distance to|height of|release date|movie|actor|song|author|book)\b/i,
    /\b(symptoms of|treatment for|cure for|causes of|effects of)\b/i,
  ];

  return patterns.some((p) => p.test(lower)) || text.endsWith('?');
}
