/**
 * X (Twitter) API Service
 * Posts content to X using OAuth 2.0 and v2 API endpoints
 */

import { TwitterApi } from "twitter-api-v2";
import { TwitterApiAutoTokenRefresher } from "@twitter-api-v2/plugin-token-refresher";
import { getStoredTokens, saveTokens } from "./supabase";
import fs from "fs";

const PLATFORM_NAME = "X.com";

// Post configuration
const POST_TAGS = ["AINews", "ArtificialIntelligence"];
const POST_LINKS = [
  {
    title: "AI Drop of the Week",
    url: "https://codeandcontext.substack.com/p/ai-drop-social-compliance-generator",
  },
];

interface PostLink {
  title: string;
  url: string;
}

/**
 * Get authenticated X API v2 client with auto token refresh
 */
async function getClient(): Promise<TwitterApi> {
  const clientId = process.env.X_API_CLIENT_ID;
  const clientSecret = process.env.X_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("X_API_CLIENT_ID and X_API_CLIENT_SECRET environment variables are required");
  }

  const tokens = await getStoredTokens();

  const credentials = {
    clientId,
    clientSecret,
  };

  const tokenStore = { ...tokens };

  const autoRefresherPlugin = new TwitterApiAutoTokenRefresher({
    refreshToken: tokenStore.refreshToken,
    refreshCredentials: credentials,
    async onTokenUpdate(newToken) {
      console.info("X API token refreshed");
      tokenStore.accessToken = newToken.accessToken;
      tokenStore.refreshToken = newToken.refreshToken!;
      await saveTokens(newToken.accessToken, newToken.refreshToken!);
    },
    onTokenRefreshError(error) {
      console.error("Error refreshing X API token:", error);
      throw new Error("Failed to refresh X API token");
    },
  });

  return new TwitterApi(tokenStore.accessToken, {
    plugins: [autoRefresherPlugin],
  });
}

/**
 * Format post content with tags and links
 */
function formatPostContent(
  content: string,
  tags: string[] = POST_TAGS,
  links: PostLink[] = POST_LINKS
): string {
  const formattedContent = content.replace(/\n/g, " ").trim();
  const formattedTags = tags.map((tag) => `#${tag}`).join(" ");
  const formattedLinks = links
    .map((link) => `${link.title}: ${link.url}`)
    .join("\n");

  return `${formattedContent} ${formattedTags}\n\n${formattedLinks}`;
}

/**
 * Upload media (video) using X API v2 chunked upload
 */
async function uploadMedia(
  client: TwitterApi,
  videoPath: string
): Promise<string> {
  console.info("Uploading video to X...");

  const videoBuffer = fs.readFileSync(videoPath);

  // Get current user ID for media ownership
  const currentUser = await client.v2.me();
  const userId = currentUser.data.id;

  // Use v1 uploadMedia which handles chunked upload automatically
  // Note: As of late 2025, the twitter-api-v2 library still uses v1.1 for media upload
  // but this works with v2 posts. The library handles the complexity.
  const mediaId = await client.v1.uploadMedia(videoBuffer, {
    mimeType: "video/mp4",
    additionalOwners: [userId],
  });

  console.info(`Video uploaded, media ID: ${mediaId}`);

  return mediaId;
}

/**
 * Create a video post on X
 */
export async function createVideoPost(
  content: string,
  videoPath: string
): Promise<string> {
  console.info(`Creating video post on ${PLATFORM_NAME}...`);

  try {
    const client = await getClient();

    // Upload video
    const mediaId = await uploadMedia(client, videoPath);

    // Create post with media
    const formattedText = formatPostContent(content);
    console.info("Posting to X...");

    const tweet = await client.v2.tweet({
      text: formattedText,
      media: { media_ids: [mediaId] },
    });

    console.info(`Successfully posted to ${PLATFORM_NAME}`);
    console.info(`Post ID: ${tweet.data.id}`);

    return tweet.data.id;
  } catch (error: any) {
    console.error(`Error posting to ${PLATFORM_NAME}:`, error);
    throw new Error(`Failed to post to ${PLATFORM_NAME}: ${error.message}`);
  }
}

/**
 * Create an image-only post on X (fallback if video fails)
 */
export async function createImagePost(
  content: string,
  imagePath: string
): Promise<string> {
  console.info(`Creating image post on ${PLATFORM_NAME} (fallback)...`);

  try {
    const client = await getClient();

    // Upload image
    const imageBuffer = fs.readFileSync(imagePath);
    const mediaId = await client.v1.uploadMedia(imageBuffer, {
      mimeType: imagePath.endsWith(".png") ? "image/png" : "image/jpeg",
    });

    // Create post with media
    const formattedText = formatPostContent(content);
    console.info("Posting to X...");

    const tweet = await client.v2.tweet({
      text: formattedText,
      media: { media_ids: [mediaId] },
    });

    console.info(`Successfully posted to ${PLATFORM_NAME}`);
    console.info(`Post ID: ${tweet.data.id}`);

    return tweet.data.id;
  } catch (error: any) {
    console.error(`Error posting to ${PLATFORM_NAME}:`, error);
    throw new Error(`Failed to post to ${PLATFORM_NAME}: ${error.message}`);
  }
}
