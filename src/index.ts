/**
 * Social Compliance Generator v2.0
 *
 * Generates AI news content and posts to X with video:
 * 1. Search for latest AI news (Tavily)
 * 2. Select topic and generate content (OpenRouter LLM)
 * 3. Generate image (Google Nano Banana Pro)
 * 4. Generate video from image (OpenAI Sora 2)
 * 5. Post to X with video
 */

import dotenv from "dotenv";
dotenv.config();

import { searchAINews } from "./services/search";
import { generateContent } from "./services/llm";
import { generateImage, cleanupImage } from "./services/image";
import { generateVideo, cleanupVideo } from "./services/video";
import { createVideoPost, createImagePost } from "./services/x";

/**
 * Main orchestration function
 */
async function generatePost(): Promise<void> {
  console.info("=".repeat(60));
  console.info("Social Compliance Generator v2.0");
  console.info(`Started at: ${new Date().toISOString()}`);
  console.info("=".repeat(60));

  let imagePath: string | null = null;
  let videoPath: string | null = null;

  try {
    // Step 1: Search for AI news
    console.info("\n[Step 1/5] Searching for AI news...");
    const newsResults = await searchAINews();

    if (newsResults.length === 0) {
      throw new Error("No AI news found");
    }

    // Step 2: Generate content using LLM
    console.info("\n[Step 2/5] Generating content with LLM...");
    const content = await generateContent(newsResults);

    // Step 3: Generate image
    console.info("\n[Step 3/5] Generating image with Nano Banana Pro...");
    imagePath = await generateImage(content.imagePrompt);

    // Step 4: Generate video from image
    console.info("\n[Step 4/5] Generating video with Sora 2...");
    try {
      videoPath = await generateVideo(imagePath, content.videoPrompt);
    } catch (videoError: any) {
      console.warn(`Video generation failed: ${videoError.message}`);
      console.info("Falling back to image-only post...");
    }

    // Step 5: Post to X
    console.info("\n[Step 5/5] Posting to X...");
    let postId: string;

    if (videoPath) {
      postId = await createVideoPost(content.postContent, videoPath);
    } else {
      // Fallback to image-only post
      postId = await createImagePost(content.postContent, imagePath);
    }

    // Success summary
    console.info("\n" + "=".repeat(60));
    console.info("POST GENERATED SUCCESSFULLY");
    console.info("=".repeat(60));
    console.info(`Topic: ${content.selectedTopic}`);
    console.info(`Post Content: ${content.postContent}`);
    console.info(`Post ID: ${postId}`);
    console.info(`Media Type: ${videoPath ? "Video" : "Image"}`);
    console.info(`Completed at: ${new Date().toISOString()}`);
    console.info("=".repeat(60));

  } catch (error: any) {
    console.error("\n" + "=".repeat(60));
    console.error("POST GENERATION FAILED");
    console.error("=".repeat(60));
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error("=".repeat(60));
    throw error;

  } finally {
    // Cleanup temporary files
    console.info("\nCleaning up temporary files...");
    if (imagePath) cleanupImage(imagePath);
    if (videoPath) cleanupVideo(videoPath);
  }
}

// Run if executed directly
generatePost()
  .then(() => {
    console.info("\nProcess completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nProcess failed:", error.message);
    process.exit(1);
  });
