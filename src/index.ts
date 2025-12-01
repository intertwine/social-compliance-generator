/**
 * Social Compliance Generator v2.0
 *
 * Generates AI news content and posts to X with video:
 * 1. Search for latest AI news (Tavily)
 * 2. Select topic and generate content (OpenRouter LLM)
 * 3. Generate image (Google Gemini)
 * 4. Generate video from image (Google Veo 3.1 or OpenAI Sora 2)
 * 5. Post to X with video
 *
 * Video API selection:
 * - Set PREFERRED_VIDEO_API to "veo" (default) or "sora"
 * - Veo uses same Google credentials as image generation
 * - Sora requires OPENAI_API_KEY
 *
 * All intermediate results are stored in Cloudflare R2 for replay/manual posting.
 */

import dotenv from "dotenv";
dotenv.config();

import { searchAINews } from "./services/search";
import { generateContent } from "./services/llm";
import { generateImage, cleanupImage } from "./services/image";
import { generateVideo, cleanupVideo, getVideoApiProvider, getProviderDisplayName } from "./services/video-api";
import { createVideoPost, createImagePost } from "./services/x";
import {
  isR2Configured,
  saveWorkflowMetadata,
  saveWorkflowImage,
  saveWorkflowVideo,
} from "./services/workflow-storage";
import {
  createWorkflowRun,
  generateRunId,
  type WorkflowRun,
} from "./types/workflow";

/**
 * Main orchestration function
 */
async function generatePost(): Promise<void> {
  // Initialize workflow tracking
  const runId = generateRunId();
  const workflow: WorkflowRun = createWorkflowRun(runId);

  console.info("=".repeat(60));
  console.info("Social Compliance Generator v2.0");
  console.info(`Started at: ${new Date().toISOString()}`);
  console.info(`Run ID: ${runId}`);
  console.info(`Video API: ${getProviderDisplayName(getVideoApiProvider())}`);
  if (isR2Configured()) {
    console.info("Workflow storage: Cloudflare R2 (enabled)");
  } else {
    console.info("Workflow storage: Not configured (results will not be persisted)");
  }
  console.info("=".repeat(60));

  let imagePath: string | null = null;
  let videoPath: string | null = null;

  try {
    // Step 1: Search for AI news
    console.info("\n[Step 1/5] Searching for AI news...");
    workflow.newsSearch.status = "in_progress";
    workflow.newsSearch.startedAt = new Date().toISOString();
    await saveWorkflowMetadata(workflow);

    const newsResults = await searchAINews();

    if (newsResults.length === 0) {
      workflow.newsSearch.status = "failed";
      workflow.newsSearch.error = "No AI news found";
      workflow.newsSearch.completedAt = new Date().toISOString();
      await saveWorkflowMetadata(workflow);
      throw new Error("No AI news found");
    }

    workflow.newsSearch.status = "completed";
    workflow.newsSearch.completedAt = new Date().toISOString();
    workflow.newsSearch.data = { results: newsResults };
    await saveWorkflowMetadata(workflow);

    // Step 2: Generate content using LLM
    console.info("\n[Step 2/5] Generating content with LLM...");
    workflow.contentGeneration.status = "in_progress";
    workflow.contentGeneration.startedAt = new Date().toISOString();
    await saveWorkflowMetadata(workflow);

    const content = await generateContent(newsResults);

    workflow.contentGeneration.status = "completed";
    workflow.contentGeneration.completedAt = new Date().toISOString();
    workflow.contentGeneration.data = content;
    await saveWorkflowMetadata(workflow);

    // Step 3: Generate image
    console.info("\n[Step 3/5] Generating image with Nano Banana Pro...");
    workflow.imageGeneration.status = "in_progress";
    workflow.imageGeneration.startedAt = new Date().toISOString();
    workflow.imageGeneration.data = { prompt: content.imagePrompt };
    await saveWorkflowMetadata(workflow);

    imagePath = await generateImage(content.imagePrompt);

    // Save image to R2
    const imageKey = await saveWorkflowImage(runId, imagePath);

    workflow.imageGeneration.status = "completed";
    workflow.imageGeneration.completedAt = new Date().toISOString();
    workflow.imageGeneration.data = {
      prompt: content.imagePrompt,
      imageKey,
    };
    await saveWorkflowMetadata(workflow);

    // Step 4: Generate video from image
    const preferredProvider = getVideoApiProvider();
    const preferredProviderName = getProviderDisplayName(preferredProvider);
    console.info(`\n[Step 4/5] Generating video with ${preferredProviderName}...`);
    workflow.videoGeneration.status = "in_progress";
    workflow.videoGeneration.startedAt = new Date().toISOString();
    workflow.videoGeneration.data = { prompt: content.videoPrompt, provider: preferredProvider };
    await saveWorkflowMetadata(workflow);

    try {
      const videoResult = await generateVideo(imagePath, content.videoPrompt);
      videoPath = videoResult.videoPath;
      const actualProvider = videoResult.provider;

      // Save video to R2
      const videoKey = await saveWorkflowVideo(runId, videoPath);

      workflow.videoGeneration.status = "completed";
      workflow.videoGeneration.completedAt = new Date().toISOString();
      workflow.videoGeneration.data = {
        prompt: content.videoPrompt,
        provider: actualProvider,
        videoKey,
      };
      await saveWorkflowMetadata(workflow);
    } catch (videoError: any) {
      console.warn(`Video generation failed: ${videoError.message}`);
      console.info("Falling back to image-only post...");

      workflow.videoGeneration.status = "failed";
      workflow.videoGeneration.completedAt = new Date().toISOString();
      workflow.videoGeneration.error = videoError.message;
      await saveWorkflowMetadata(workflow);
    }

    // Step 5: Post to X
    console.info("\n[Step 5/5] Posting to X...");
    const mediaType = videoPath ? "video" : "image";
    workflow.posting.status = "in_progress";
    workflow.posting.startedAt = new Date().toISOString();
    workflow.posting.data = {
      mediaType,
      postContent: content.postContent,
    };
    await saveWorkflowMetadata(workflow);

    let postId: string;

    if (videoPath) {
      postId = await createVideoPost(content.postContent, videoPath);
    } else {
      // Fallback to image-only post
      postId = await createImagePost(content.postContent, imagePath);
    }

    workflow.posting.status = "completed";
    workflow.posting.completedAt = new Date().toISOString();
    workflow.posting.data = {
      postId,
      mediaType,
      postContent: content.postContent,
    };

    // Mark workflow as completed
    workflow.status = "completed";
    workflow.completedAt = new Date().toISOString();
    await saveWorkflowMetadata(workflow);

    // Success summary
    console.info("\n" + "=".repeat(60));
    console.info("POST GENERATED SUCCESSFULLY");
    console.info("=".repeat(60));
    console.info(`Run ID: ${runId}`);
    console.info(`Topic: ${content.selectedTopic}`);
    console.info(`Post Content: ${content.postContent}`);
    console.info(`Post ID: ${postId}`);
    console.info(`Media Type: ${mediaType}`);
    console.info(`Completed at: ${new Date().toISOString()}`);
    console.info("=".repeat(60));

  } catch (error: any) {
    // Mark workflow as failed
    workflow.status = "failed";
    workflow.completedAt = new Date().toISOString();
    workflow.error = error.message;
    await saveWorkflowMetadata(workflow);

    console.error("\n" + "=".repeat(60));
    console.error("POST GENERATION FAILED");
    console.error("=".repeat(60));
    console.error(`Run ID: ${runId}`);
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
