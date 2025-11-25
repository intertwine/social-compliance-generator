/**
 * Tavily Web Search Service
 * Searches for latest AI news to generate content about
 */

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  query: string;
}

const TAVILY_API_URL = "https://api.tavily.com/search";

/**
 * Search for latest AI news using Tavily API
 */
export async function searchAINews(): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY environment variable is required");
  }

  const searchQueries = [
    "latest AI artificial intelligence news today",
    "breaking AI technology announcements this week",
    "new AI model releases machine learning news",
  ];

  // Pick a random search query for variety
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  console.info(`Searching for AI news with query: "${query}"`);

  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_answer: false,
      include_raw_content: false,
      max_results: 10,
      topic: "news",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as TavilyResponse;

  console.info(`Found ${data.results.length} AI news articles`);

  return data.results;
}

export type { TavilySearchResult };
