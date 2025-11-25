/**
 * Google Nano Banana Pro (Gemini 3 Pro Image) Service
 * Generates images using Google's latest image generation model
 */

import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";
import path from "path";

const MODEL_ID = "gemini-3-pro-image-preview";

/**
 * Generate an image using Google's Nano Banana Pro model
 * Returns the path to the generated image file
 */
export async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is required");
  }

  console.info(`Generating image with Nano Banana Pro: "${prompt.substring(0, 100)}..."`);

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: prompt,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    throw new Error("No content returned from Nano Banana Pro");
  }

  // Find the image part
  const imagePart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith("image/"));

  if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
    throw new Error("No image data returned from Nano Banana Pro");
  }

  // Save image to temporary file
  const timestamp = Date.now();
  const extension = imagePart.inlineData.mimeType === "image/png" ? "png" : "jpg";
  const imagePath = path.join(process.cwd(), `generated-image-${timestamp}.${extension}`);

  const imageBuffer = Buffer.from(imagePart.inlineData.data as string, "base64");
  fs.writeFileSync(imagePath, imageBuffer);

  console.info(`Image saved to: ${imagePath}`);

  return imagePath;
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
