/**
 * X (Twitter) API Service
 * Posts content to X using OAuth 2.0 and v2 API endpoints
 *
 * IMPORTANT: Your OAuth 2.0 authorization must include the `media.write` scope
 * for video/image uploads to work. Re-authorize if you're getting 403 errors.
 */

import { getStoredTokens, saveTokens } from "./token-storage";
import fs from "fs";

const PLATFORM_NAME = "X.com";

// X API v2 endpoints
const X_API_BASE = "https://api.x.com";
// New dedicated chunked upload endpoints (Jan 2025)
const MEDIA_UPLOAD_INIT_ENDPOINT = `${X_API_BASE}/2/media/upload/initialize`;
const MEDIA_UPLOAD_APPEND_ENDPOINT = `${X_API_BASE}/2/media/upload`; // /{id}/append
const MEDIA_UPLOAD_FINALIZE_ENDPOINT = `${X_API_BASE}/2/media/upload`; // /{id}/finalize
const MEDIA_UPLOAD_STATUS_ENDPOINT = `${X_API_BASE}/2/media/upload`; // /{id}
// Simple upload endpoint (images only)
const MEDIA_UPLOAD_SIMPLE_ENDPOINT = `${X_API_BASE}/2/media/upload`;
const TWEETS_ENDPOINT = `${X_API_BASE}/2/tweets`;

// Post configuration
const POST_TAGS = ["AINews", "ArtificialIntelligence"];
const POST_LINKS = [
  {
    title: "AI Drop of the Week",
    url: "https://codeandcontext.substack.com/p/ai-drop-social-compliance-generator",
  },
];

// Chunk size for video uploads (1MB for v2 API compatibility)
const CHUNK_SIZE = 1 * 1024 * 1024;

interface PostLink {
  title: string;
  url: string;
}

interface TokenStore {
  accessToken: string;
  refreshToken: string;
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
}

interface MediaInitResponse {
  media_id_string?: string;
  id?: string;
  // v2 API response format
  data?: {
    id?: string;
    media_key?: string;
  };
}

interface MediaStatusResponse {
  processing_info?: {
    state: string;
    check_after_secs?: number;
    progress_percent?: number;
  };
  // v2 API response format
  data?: {
    id?: string;
    media_key?: string;
    processing_info?: {
      state: string;
      check_after_secs?: number;
      progress_percent?: number;
    };
  };
}

interface TweetResponse {
  data: {
    id: string;
  };
}

interface TweetRequest {
  text: string;
  media?: {
    media_ids: string[];
  };
}

// Maximum time to wait for media processing (10 minutes)
const MAX_PROCESSING_WAIT_MS = 600000;

// Global token store for the session
let tokenStore: TokenStore | null = null;

/**
 * Get the current access token from storage
 */
async function getAccessToken(): Promise<string> {
  if (!tokenStore) {
    tokenStore = await getStoredTokens();
  }
  return tokenStore.accessToken;
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.X_API_CLIENT_ID;
  const clientSecret = process.env.X_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("X_API_CLIENT_ID and X_API_CLIENT_SECRET environment variables are required");
  }

  if (!tokenStore) {
    tokenStore = await getStoredTokens();
  }

  console.info("Refreshing X API access token...");

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenStore.refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token refresh failed:", response.status, errorText);
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  let data: TokenRefreshResponse;
  try {
    data = await response.json() as TokenRefreshResponse;
  } catch (e) {
    console.error("Failed to parse token refresh response:", e);
    throw new Error("Invalid JSON response from token refresh endpoint");
  }

  tokenStore.accessToken = data.access_token;
  if (data.refresh_token) {
    tokenStore.refreshToken = data.refresh_token;
  }

  await saveTokens(tokenStore.accessToken, tokenStore.refreshToken);
  console.info("X API token refreshed successfully");

  return tokenStore.accessToken;
}

/**
 * Make an authenticated request to the X API with automatic token refresh
 */
async function xApiRequest(
  url: string,
  options: RequestInit,
  retry = true
): Promise<Response> {
  const accessToken = await getAccessToken();

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get a 401, try refreshing the token once
  if (response.status === 401 && retry) {
    console.info("Got 401, attempting token refresh...");
    await refreshAccessToken();
    return xApiRequest(url, options, false);
  }

  return response;
}

/**
 * Initialize a chunked media upload (v2 API - new dedicated endpoint)
 */
async function initMediaUpload(
  totalBytes: number,
  mediaType: string,
  mediaCategory: string
): Promise<string> {
  console.info(`Initializing media upload: ${totalBytes} bytes, ${mediaType}, ${mediaCategory}`);

  const response = await xApiRequest(MEDIA_UPLOAD_INIT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      media_type: mediaType,
      total_bytes: totalBytes,
      media_category: mediaCategory,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Media upload INIT failed:", response.status, errorText);
    throw new Error(`Failed to initialize media upload: ${response.status} - ${errorText}`);
  }

  let data: MediaInitResponse;
  try {
    data = await response.json() as MediaInitResponse;
  } catch (e) {
    console.error("Failed to parse media upload INIT response:", e);
    throw new Error("Invalid JSON response from media upload INIT endpoint");
  }

  // Log the full response to debug the structure
  console.info("Media upload INIT response:", JSON.stringify(data, null, 2));

  // Try different response formats (v1.1 vs v2)
  const mediaId = data.media_id_string || data.id || data.data?.id;
  console.info(`Media upload initialized, media_id: ${mediaId}`);

  if (!mediaId) {
    throw new Error(`No media_id returned from INIT. Response: ${JSON.stringify(data)}`);
  }

  return mediaId;
}

/**
 * Append a chunk to the media upload (v2 API - new dedicated endpoint)
 */
async function appendMediaChunk(
  mediaId: string,
  chunk: Buffer,
  segmentIndex: number
): Promise<void> {
  console.info(`Uploading chunk ${segmentIndex} (${chunk.length} bytes)...`);

  const formData = new FormData();
  formData.append("media", new Blob([chunk]));
  formData.append("segment_index", segmentIndex.toString());

  const appendUrl = `${MEDIA_UPLOAD_APPEND_ENDPOINT}/${mediaId}/append`;
  const response = await xApiRequest(appendUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Media upload APPEND failed for segment ${segmentIndex}:`, response.status, errorText);
    throw new Error(`Failed to append media chunk: ${response.status} - ${errorText}`);
  }

  console.info(`Chunk ${segmentIndex} uploaded successfully`);
}

/**
 * Finalize the media upload (v2 API - new dedicated endpoint)
 */
async function finalizeMediaUpload(mediaId: string): Promise<MediaStatusResponse> {
  console.info("Finalizing media upload...");

  const finalizeUrl = `${MEDIA_UPLOAD_FINALIZE_ENDPOINT}/${mediaId}/finalize`;
  const response = await xApiRequest(finalizeUrl, {
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Media upload FINALIZE failed:", response.status, errorText);
    throw new Error(`Failed to finalize media upload: ${response.status} - ${errorText}`);
  }

  let data: MediaStatusResponse;
  try {
    data = await response.json() as MediaStatusResponse;
  } catch (e) {
    console.error("Failed to parse media upload FINALIZE response:", e);
    throw new Error("Invalid JSON response from media upload FINALIZE endpoint");
  }

  console.info("Media upload FINALIZE response:", JSON.stringify(data, null, 2));
  console.info("Media upload finalized");
  return data;
}

/**
 * Check the status of media processing (v2 API - new dedicated endpoint)
 */
async function checkMediaStatus(mediaId: string): Promise<MediaStatusResponse> {
  const statusUrl = `${MEDIA_UPLOAD_STATUS_ENDPOINT}/${mediaId}`;

  const response = await xApiRequest(statusUrl, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Media status check failed:", response.status, errorText);
    throw new Error(`Failed to check media status: ${response.status} - ${errorText}`);
  }

  try {
    const data = await response.json() as MediaStatusResponse;
    console.info("Media status response:", JSON.stringify(data, null, 2));
    return data;
  } catch (e) {
    console.error("Failed to parse media status response:", e);
    throw new Error("Invalid JSON response from media status endpoint");
  }
}

/**
 * Wait for media processing to complete with timeout protection
 */
async function waitForMediaProcessing(
  mediaId: string,
  processingInfo: NonNullable<MediaStatusResponse["processing_info"]>
): Promise<void> {
  const startTime = Date.now();
  let state = processingInfo.state;
  let checkAfterSecs = processingInfo.check_after_secs || 5;

  while (state === "pending" || state === "in_progress") {
    // Check for timeout
    if (Date.now() - startTime > MAX_PROCESSING_WAIT_MS) {
      throw new Error("Media processing timeout exceeded (10 minutes)");
    }

    console.info(`Media processing state: ${state}, waiting ${checkAfterSecs}s...`);
    await new Promise(resolve => setTimeout(resolve, checkAfterSecs * 1000));

    const status = await checkMediaStatus(mediaId);

    // Check both v1.1 and v2 response formats
    const statusProcessingInfo = status.processing_info || status.data?.processing_info;
    if (statusProcessingInfo) {
      state = statusProcessingInfo.state;
      checkAfterSecs = statusProcessingInfo.check_after_secs || 5;

      if (statusProcessingInfo.progress_percent) {
        console.info(`Processing progress: ${statusProcessingInfo.progress_percent}%`);
      }
    } else {
      // No processing_info means processing is complete
      state = "succeeded";
    }
  }

  if (state === "failed") {
    throw new Error("Media processing failed");
  }

  console.info("Media processing completed successfully");
}

/**
 * Upload media using X API v2 chunked upload
 */
async function uploadMediaV2(
  filePath: string,
  mediaType: string,
  mediaCategory: string
): Promise<string> {
  const fileBuffer = await fs.promises.readFile(filePath);
  const totalBytes = fileBuffer.length;

  console.info(`Uploading media: ${filePath} (${totalBytes} bytes)`);

  // Step 1: Initialize the upload
  const mediaId = await initMediaUpload(totalBytes, mediaType, mediaCategory);

  // Step 2: Upload chunks
  const numChunks = Math.ceil(totalBytes / CHUNK_SIZE);
  console.info(`Uploading ${numChunks} chunk(s)...`);

  for (let i = 0; i < numChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalBytes);
    const chunk = fileBuffer.subarray(start, end);
    await appendMediaChunk(mediaId, chunk, i);
  }

  // Step 3: Finalize the upload
  const finalizeResult = await finalizeMediaUpload(mediaId);

  // Step 4: Wait for processing if needed (videos require async processing)
  // Check both v1.1 and v2 response formats
  const processingInfo = finalizeResult.processing_info || finalizeResult.data?.processing_info;
  if (processingInfo) {
    await waitForMediaProcessing(mediaId, processingInfo);
  } else {
    // Even if no processing_info, wait a moment for the media to be ready
    console.info("No processing_info in response, waiting 5s for media to be ready...");
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.info(`Media uploaded successfully, media_id: ${mediaId}`);
  return mediaId;
}

/**
 * Post a tweet using X API v2
 */
async function postTweet(text: string, mediaIds?: string[]): Promise<string> {
  const body: TweetRequest = { text };

  if (mediaIds && mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  const response = await xApiRequest(TWEETS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Tweet post failed:", response.status, errorText);
    throw new Error(`Failed to post tweet: ${response.status} - ${errorText}`);
  }

  let data: TweetResponse;
  try {
    data = await response.json() as TweetResponse;
  } catch (e) {
    console.error("Failed to parse tweet response:", e);
    throw new Error("Invalid JSON response from tweet endpoint");
  }

  return data.data.id;
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
 * Create a video post on X
 */
export async function createVideoPost(
  content: string,
  videoPath: string
): Promise<string> {
  console.info(`Creating video post on ${PLATFORM_NAME}...`);

  try {
    // Upload video using v2 API (amplify_video category for video uploads)
    console.info("Uploading video to X...");
    const mediaId = await uploadMediaV2(videoPath, "video/mp4", "amplify_video");

    // Create post with media
    const formattedText = formatPostContent(content);
    console.info("Posting to X...");

    const tweetId = await postTweet(formattedText, [mediaId]);

    console.info(`Successfully posted to ${PLATFORM_NAME}`);
    console.info(`Post ID: ${tweetId}`);

    return tweetId;
  } catch (error: unknown) {
    console.error(`Error posting to ${PLATFORM_NAME}:`, error);
    const message = error && typeof error === "object" && "message" in error
      ? (error as Error).message
      : String(error);
    throw new Error(`Failed to post to ${PLATFORM_NAME}: ${message}`);
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
    // Determine mime type
    const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

    // Upload image using v2 API
    const mediaId = await uploadMediaV2(imagePath, mimeType, "tweet_image");

    // Create post with media
    const formattedText = formatPostContent(content);
    console.info("Posting to X...");

    const tweetId = await postTweet(formattedText, [mediaId]);

    console.info(`Successfully posted to ${PLATFORM_NAME}`);
    console.info(`Post ID: ${tweetId}`);

    return tweetId;
  } catch (error: unknown) {
    console.error(`Error posting to ${PLATFORM_NAME}:`, error);
    const message = error && typeof error === "object" && "message" in error
      ? (error as Error).message
      : String(error);
    throw new Error(`Failed to post to ${PLATFORM_NAME}: ${message}`);
  }
}
