/**
 * Google Veo Video Generation Service
 * Generates videos using Google's Veo 3.1 model (image-to-video)
 *
 * Uses the @google/genai SDK which supports both Vertex AI and Gemini Developer API.
 *
 * For Vertex AI (production):
 *   Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION env vars
 *   Authentication via Application Default Credentials (ADC)
 *
 * For Gemini Developer API (development):
 *   Set GOOGLE_API_KEY env var
 */

import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";
import fs from "fs";
import path from "path";

// Veo 3.1 is the latest with improved image-to-video capabilities
const PRIMARY_MODEL = "veo-3.1-generate-preview";
const FALLBACK_MODEL = "veo-3.0-generate-preview";

const POLL_INTERVAL_MS = 10000; // 10 seconds (video generation takes time)
const MAX_POLL_TIME_MS = 600000; // 10 minutes timeout

interface VeoModel {
  id: string;
  name: string;
}

const VEO_MODELS: VeoModel[] = [
  { id: PRIMARY_MODEL, name: "Veo 3.1" },
  { id: FALLBACK_MODEL, name: "Veo 3.0" },
];

/**
 * Create GoogleGenAI client configured for either Vertex AI or Gemini Developer API
 */
function createAIClient(): GoogleGenAI {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  const apiKey = process.env.GOOGLE_API_KEY;

  // Prefer Vertex AI if project is configured
  if (project) {
    console.info(`Using Vertex AI for Veo (project: ${project}, location: ${location})`);
    return new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
  }

  // Fall back to Gemini Developer API
  if (apiKey) {
    console.info("Using Gemini Developer API for Veo");
    return new GoogleGenAI({ apiKey });
  }

  throw new Error(
    "Either GOOGLE_CLOUD_PROJECT (for Vertex AI) or GOOGLE_API_KEY (for Gemini API) is required for Veo video generation"
  );
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
  };
  return mimeTypes[ext] || "image/jpeg";
}

/**
 * Check if an error is recoverable (should try fallback model)
 * - 429: Rate limit exceeded
 * - 404: Model not found (may not be available in region/project)
 * - 503: Service unavailable
 */
function isRecoverableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    return (
      msg.includes("429") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("404") ||
      msg.includes("NOT_FOUND") ||
      msg.includes("503") ||
      msg.includes("UNAVAILABLE")
    );
  }
  return false;
}

/**
 * Generate video using a specific Veo model
 */
async function tryGenerateWithModel(
  ai: GoogleGenAI,
  modelId: string,
  imageBytes: string,
  mimeType: string,
  prompt: string
): Promise<GenerateVideosOperation> {
  const operation = await ai.models.generateVideos({
    model: modelId,
    prompt: prompt,
    image: {
      imageBytes,
      mimeType,
    },
    config: {
      numberOfVideos: 1,
      durationSeconds: 10,
      aspectRatio: "16:9",
      resolution: "720p",
      personGeneration: "allow_adult",
    },
  });
  return operation;
}

/**
 * Poll for video generation completion
 */
async function pollForCompletion(
  ai: GoogleGenAI,
  operation: GenerateVideosOperation
): Promise<GenerateVideosOperation> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    // Check if already done
    if (operation.done) {
      return operation;
    }

    console.info(`Polling video generation status (operation: ${operation.name})...`);

    // Poll for updated status
    const updatedOperation = await ai.operations.getVideosOperation({
      operation,
    });

    if (updatedOperation.done) {
      console.info("Video generation completed!");
      return updatedOperation;
    }

    // Check for errors
    if (updatedOperation.error) {
      throw new Error(`Video generation failed: ${JSON.stringify(updatedOperation.error)}`);
    }

    console.info(`Status: in progress - waiting ${POLL_INTERVAL_MS / 1000}s...`);
    await sleep(POLL_INTERVAL_MS);

    // Update operation reference for next poll
    operation = updatedOperation;
  }

  throw new Error(`Video generation timed out after ${MAX_POLL_TIME_MS / 1000}s`);
}

/**
 * Download video from URI or save from bytes
 */
async function saveVideo(
  videoUri?: string,
  videoBytes?: string,
  mimeType?: string
): Promise<string> {
  const timestamp = Date.now();
  // Veo typically returns mp4 videos
  const videoPath = path.join(process.cwd(), `generated-video-${timestamp}.mp4`);

  if (videoBytes) {
    // Video returned as base64 bytes
    console.info("Saving video from bytes...");
    const buffer = Buffer.from(videoBytes, "base64");
    fs.writeFileSync(videoPath, buffer);
  } else if (videoUri) {
    // Video stored at a URI (GCS or HTTP)
    console.info(`Downloading video from: ${videoUri}`);

    const response = await fetch(videoUri);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(videoPath, buffer);
  } else {
    throw new Error("No video data returned from Veo");
  }

  console.info(`Video saved to: ${videoPath}`);
  return videoPath;
}

/**
 * Generate a video using Google Veo from an image and prompt
 * Returns the path to the downloaded video file
 *
 * Automatically falls back to alternative models on rate limit or availability errors.
 */
export async function generateVideoWithVeo(
  imagePath: string,
  prompt: string
): Promise<string> {
  const ai = createAIClient();
  let lastError: Error | null = null;

  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBytes = imageBuffer.toString("base64");
  const mimeType = getMimeType(imagePath);

  for (const model of VEO_MODELS) {
    console.info(`Generating video with ${model.name}: "${prompt.substring(0, 100)}..."`);

    try {
      // Start video generation
      let operation = await tryGenerateWithModel(ai, model.id, imageBytes, mimeType, prompt);
      console.info(`Video generation started (operation: ${operation.name})`);

      // Poll for completion
      operation = await pollForCompletion(ai, operation);

      // Extract video from response
      const response = operation.response;
      if (!response?.generatedVideos || response.generatedVideos.length === 0) {
        // Check for RAI filtering
        if (response?.raiMediaFilteredCount && response.raiMediaFilteredCount > 0) {
          throw new Error(
            `Video filtered by safety policies: ${response.raiMediaFilteredReasons?.join(", ") || "Unknown reason"}`
          );
        }
        throw new Error(`No video returned from ${model.name}`);
      }

      const generatedVideo = response.generatedVideos[0];
      const video = generatedVideo.video;

      if (!video) {
        throw new Error(`No video data in response from ${model.name}`);
      }

      // Save video to file
      const videoPath = await saveVideo(video.uri, video.videoBytes, video.mimeType);
      return videoPath;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`${model.name} error: ${lastError.message}`);

      if (isRecoverableError(error)) {
        console.warn(`${model.name} unavailable, trying fallback model...`);
        continue;
      }

      // For non-recoverable errors, throw immediately
      throw error;
    }
  }

  // All models failed
  throw new Error(
    `All Veo video generation models failed. Last error: ${lastError?.message}`
  );
}

/**
 * Clean up generated video file
 */
export function cleanupVeoVideo(videoPath: string): void {
  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
    console.info(`Cleaned up video: ${videoPath}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
