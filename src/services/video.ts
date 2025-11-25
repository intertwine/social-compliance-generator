/**
 * OpenAI Sora 2 Video Generation Service
 * Generates videos using OpenAI's Sora 2 model (image-to-video)
 *
 * Note: Uses REST API directly as the OpenAI SDK doesn't yet have
 * native support for the Sora video generation endpoints.
 */

import fs from "fs";
import path from "path";

const SORA_MODEL = "sora-2";
const OPENAI_API_BASE = "https://api.openai.com/v1";
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_TIME_MS = 300000; // 5 minutes timeout

interface VideoGenerationJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  error?: string;
}

/**
 * Generate a video using Sora 2 from an image and prompt
 * Returns the path to the downloaded video file
 */
export async function generateVideo(
  imagePath: string,
  prompt: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  console.info(`Generating video with Sora 2: "${prompt.substring(0, 100)}..."`);

  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  // Create video generation job via REST API
  console.info("Creating Sora video generation job...");

  const createResponse = await fetch(`${OPENAI_API_BASE}/videos/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SORA_MODEL,
      input: [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
        {
          type: "text",
          text: prompt,
        },
      ],
      duration: 8,
      resolution: "720p",
      aspect_ratio: "16:9",
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Sora API error: ${createResponse.status} - ${errorText}`);
  }

  const job = await createResponse.json() as VideoGenerationJob;
  console.info(`Video generation job created: ${job.id}`);

  // Poll for completion
  const videoUrl = await pollForCompletion(apiKey, job.id);

  // Download video
  const videoPath = await downloadVideo(videoUrl);

  return videoPath;
}

/**
 * Poll Sora API until video generation is complete
 */
async function pollForCompletion(
  apiKey: string,
  jobId: string
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    console.info(`Polling video job status: ${jobId}`);

    const response = await fetch(`${OPENAI_API_BASE}/videos/generations/${jobId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sora API poll error: ${response.status} - ${errorText}`);
    }

    const status = await response.json() as VideoGenerationJob;

    if (status.status === "completed" && status.video_url) {
      console.info("Video generation completed!");
      return status.video_url;
    }

    if (status.status === "failed") {
      throw new Error(`Video generation failed: ${status.error || "Unknown error"}`);
    }

    console.info(`Status: ${status.status} - waiting ${POLL_INTERVAL_MS / 1000}s...`);
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Video generation timed out after ${MAX_POLL_TIME_MS / 1000}s`);
}

/**
 * Download video from URL to local file
 */
async function downloadVideo(videoUrl: string): Promise<string> {
  console.info("Downloading generated video...");

  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const timestamp = Date.now();
  const videoPath = path.join(process.cwd(), `generated-video-${timestamp}.mp4`);

  fs.writeFileSync(videoPath, buffer);

  console.info(`Video saved to: ${videoPath}`);

  return videoPath;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
