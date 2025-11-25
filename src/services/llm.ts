/**
 * OpenRouter LLM Service
 * Uses configurable LLM model via OpenRouter to generate content
 */

import type { TavilySearchResult } from "./search";

interface GeneratedContent {
  postContent: string;
  imagePrompt: string;
  videoPrompt: string;
  selectedTopic: string;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5-20250929";

/**
 * Generate social media post content from AI news search results
 */
export async function generateContent(
  newsResults: TavilySearchResult[]
): Promise<GeneratedContent> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  console.info(`Generating content using model: ${model}`);

  const newsContext = newsResults
    .map(
      (result, i) =>
        `${i + 1}. "${result.title}"\n   URL: ${result.url}\n   Summary: ${result.content}`
    )
    .join("\n\n");

  const systemPrompt = `You are a social media content creator specializing in AI and technology news. Your task is to:
1. Review the provided AI news articles
2. Select the MOST interesting and engaging topic
3. Write a concise, engaging social media post about it
4. Generate prompts for visual content creation

Be informative yet accessible. Avoid hype and clickbait. Focus on what makes this news genuinely interesting or impactful.`;

  const userPrompt = `Here are today's top AI news articles:

${newsContext}

Based on these articles, please:
1. Select the most interesting topic to post about
2. Write an engaging social media post (max 200 characters, no hashtags - those will be added separately)
3. Create an image generation prompt that would create a visually striking image representing this topic
4. Create a video prompt that describes a short (5-10 second) dynamic video scene related to this topic

Respond ONLY with valid JSON in this exact format:
{
  "selectedTopic": "Brief description of the topic you selected",
  "postContent": "Your social media post text here",
  "imagePrompt": "Detailed prompt for image generation - describe style, composition, colors, mood",
  "videoPrompt": "Detailed prompt for video generation - describe motion, scene, camera movement, atmosphere"
}`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/social-compliance-generator",
      "X-Title": "Social Compliance Generator",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content returned from LLM");
  }

  // Parse JSON response - handle potential markdown code blocks
  let jsonContent = content.trim();
  if (jsonContent.startsWith("```json")) {
    jsonContent = jsonContent.slice(7);
  }
  if (jsonContent.startsWith("```")) {
    jsonContent = jsonContent.slice(3);
  }
  if (jsonContent.endsWith("```")) {
    jsonContent = jsonContent.slice(0, -3);
  }

  const parsed: GeneratedContent = JSON.parse(jsonContent.trim());

  console.info(`Selected topic: ${parsed.selectedTopic}`);
  console.info(`Post content: ${parsed.postContent}`);

  return parsed;
}
