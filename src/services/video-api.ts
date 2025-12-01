/**
 * Video API Selection Service
 *
 * Provides a unified interface for video generation that can switch between:
 * - Google Veo (default) - Uses Vertex AI or Gemini Developer API
 * - OpenAI Sora - Uses OpenAI API (requires invitation)
 *
 * Configuration:
 * - Set PREFERRED_VIDEO_API to "veo" (default) or "sora"
 * - Veo requires: GOOGLE_CLOUD_PROJECT or GOOGLE_API_KEY
 * - Sora requires: OPENAI_API_KEY
 */

import { generateVideoWithVeo } from "./veo";
import { generateVideo as generateVideoWithSora } from "./video";
import fs from "fs";

export type VideoApiProvider = "veo" | "sora";

/**
 * Result from video generation including which provider was used
 */
export interface VideoGenerationResult {
  videoPath: string;
  provider: VideoApiProvider;
}

/**
 * Get the configured video API provider
 * Defaults to "veo" if not specified
 * Throws an error for invalid values
 */
export function getVideoApiProvider(): VideoApiProvider {
  const configured = process.env.PREFERRED_VIDEO_API?.toLowerCase();

  if (!configured || configured === "veo") {
    return "veo";
  }

  if (configured === "sora") {
    return "sora";
  }

  throw new Error(
    `Invalid PREFERRED_VIDEO_API value: "${process.env.PREFERRED_VIDEO_API}". Valid options are "veo" or "sora".`
  );
}

/**
 * Check if the required credentials are available for the specified provider
 */
export function isProviderConfigured(provider: VideoApiProvider): boolean {
  switch (provider) {
    case "veo":
      return !!(process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_API_KEY);
    case "sora":
      return !!process.env.OPENAI_API_KEY;
    default:
      return false;
  }
}

/**
 * Get the display name for a video API provider
 */
export function getProviderDisplayName(provider: VideoApiProvider): string {
  switch (provider) {
    case "veo":
      return "Google Veo 3.1";
    case "sora":
      return "OpenAI Sora 2";
    default:
      return "Unknown";
  }
}

/**
 * Generate a video using the configured video API provider
 *
 * @param imagePath - Path to the input image
 * @param prompt - Text prompt describing the desired video motion/action
 * @returns Result with video path and the actual provider used (may differ from preferred if fallback occurred)
 */
export async function generateVideo(
  imagePath: string,
  prompt: string
): Promise<VideoGenerationResult> {
  const preferredProvider = getVideoApiProvider();
  const displayName = getProviderDisplayName(preferredProvider);

  // Validate provider is configured
  if (!isProviderConfigured(preferredProvider)) {
    const alternateProvider: VideoApiProvider = preferredProvider === "veo" ? "sora" : "veo";

    if (isProviderConfigured(alternateProvider)) {
      console.warn(
        `${displayName} is not configured. Falling back to ${getProviderDisplayName(alternateProvider)}...`
      );
      const videoPath = await generateVideoWithProvider(alternateProvider, imagePath, prompt);
      return { videoPath, provider: alternateProvider };
    }

    throw new Error(
      `No video API configured. Set either GOOGLE_CLOUD_PROJECT/GOOGLE_API_KEY for Veo ` +
      `or OPENAI_API_KEY for Sora.`
    );
  }

  console.info(`Using ${displayName} for video generation`);
  const videoPath = await generateVideoWithProvider(preferredProvider, imagePath, prompt);
  return { videoPath, provider: preferredProvider };
}

/**
 * Generate video using a specific provider
 */
async function generateVideoWithProvider(
  provider: VideoApiProvider,
  imagePath: string,
  prompt: string
): Promise<string> {
  switch (provider) {
    case "veo":
      return generateVideoWithVeo(imagePath, prompt);
    case "sora":
      return generateVideoWithSora(imagePath, prompt);
    default:
      throw new Error(`Unknown video API provider: ${provider}`);
  }
}

/**
 * Clean up generated video file
 */
export function cleanupVideo(videoPath: string): void {
  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
    console.info(`Cleaned up video: ${videoPath}`);
  }
}
