/**
 * Google Gemini Image Generation Service
 * Supports both Gemini Developer API and Vertex AI
 *
 * For Vertex AI (production):
 *   Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION env vars
 *   Authentication via Application Default Credentials (ADC)
 *
 * For Gemini Developer API (development):
 *   Set GOOGLE_API_KEY env var
 */

import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";
import path from "path";

// Gemini 2.5 Flash Image is the stable GA model available on Vertex AI
// Gemini 3 Pro Image Preview may require allowlist access
const PRIMARY_MODEL = "gemini-2.5-flash-image";
const FALLBACK_MODEL = "gemini-3-pro-image-preview";

interface ImageModel {
  id: string;
  name: string;
}

const IMAGE_MODELS: ImageModel[] = [
  { id: PRIMARY_MODEL, name: "Gemini 2.5 Flash Image" },
  { id: FALLBACK_MODEL, name: "Gemini 3 Pro Image" },
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
    console.info(`Using Vertex AI (project: ${project}, location: ${location})`);
    return new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
  }

  // Fall back to Gemini Developer API
  if (apiKey) {
    console.info("Using Gemini Developer API");
    return new GoogleGenAI({ apiKey });
  }

  throw new Error(
    "Either GOOGLE_CLOUD_PROJECT (for Vertex AI) or GOOGLE_API_KEY (for Gemini API) is required"
  );
}

/**
 * Try to generate an image with a specific model
 * Returns the response or throws an error
 */
async function tryGenerateWithModel(
  ai: GoogleGenAI,
  modelId: string,
  prompt: string
): Promise<any> {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  return response;
}

/**
 * Check if an error is recoverable (should try fallback model)
 * - 429: Rate limit exceeded
 * - 404: Model not found (may not be available in region/project)
 */
function isRecoverableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    return (
      msg.includes("429") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("404") ||
      msg.includes("NOT_FOUND")
    );
  }
  return false;
}

/**
 * Generate an image using Google's image generation models
 * Automatically falls back to alternative models on rate limit errors
 * Returns the path to the generated image file
 */
export async function generateImage(prompt: string): Promise<string> {
  const ai = createAIClient();
  let lastError: Error | null = null;

  for (const model of IMAGE_MODELS) {
    console.info(`Generating image with ${model.name}: "${prompt.substring(0, 100)}..."`);

    try {
      const response = await tryGenerateWithModel(ai, model.id, prompt);

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts;

      if (!parts || parts.length === 0) {
        throw new Error(`No content returned from ${model.name}`);
      }

      // Find the image part
      const imagePart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith("image/"));

      if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
        throw new Error(`No image data returned from ${model.name}`);
      }

      // Save image to temporary file
      const timestamp = Date.now();
      const extension = imagePart.inlineData.mimeType === "image/png" ? "png" : "jpg";
      const imagePath = path.join(process.cwd(), `generated-image-${timestamp}.${extension}`);

      const imageBuffer = Uint8Array.from(Buffer.from(imagePart.inlineData.data as string, "base64"));
      fs.writeFileSync(imagePath, imageBuffer);

      console.info(`Image saved to: ${imagePath}`);

      return imagePath;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isRecoverableError(error)) {
        console.warn(`${model.name} unavailable, trying fallback model...`);
        continue;
      }

      // For non-rate-limit errors, throw immediately
      throw error;
    }
  }

  // All models failed with rate limits
  throw new Error(
    `All image generation models are rate limited. Last error: ${lastError?.message}`
  );
}

/**
 * Clean up generated image file
 */
export function cleanupImage(imagePath: string): void {
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
    console.info(`Cleaned up image: ${imagePath}`);
  }
}
