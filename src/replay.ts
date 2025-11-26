/**
 * Workflow Replay Utility
 *
 * Lists workflow runs and allows replaying failed posts manually.
 *
 * Usage:
 *   npm run replay list              - List recent workflow runs
 *   npm run replay show <runId>      - Show details of a specific run
 *   npm run replay post <runId>      - Repost a failed workflow to X
 *   npm run replay delete <runId>    - Delete a workflow run from storage
 */

import dotenv from "dotenv";
dotenv.config();

import * as path from "path";
import * as os from "os";
import {
  isR2Configured,
  listWorkflowRuns,
  getWorkflowMetadata,
  downloadWorkflowImage,
  downloadWorkflowVideo,
  deleteWorkflowRun,
  saveWorkflowMetadata,
} from "./services/workflow-storage";
import { createVideoPost, createImagePost } from "./services/x";
import { cleanupImage } from "./services/image";
import { cleanupVideo } from "./services/video";
import type { WorkflowRun } from "./types/workflow";

const COMMANDS = ["list", "show", "post", "delete"] as const;
type Command = (typeof COMMANDS)[number];

function printUsage(): void {
  console.info(`
Workflow Replay Utility

Usage:
  npm run replay list              - List recent workflow runs
  npm run replay show <runId>      - Show details of a specific run
  npm run replay post <runId>      - Repost a failed workflow to X
  npm run replay delete <runId>    - Delete a workflow run from storage

Examples:
  npm run replay list
  npm run replay show run-2024-01-15T10-30-00-abc123
  npm run replay post run-2024-01-15T10-30-00-abc123
`);
}

async function listRuns(): Promise<void> {
  console.info("Fetching recent workflow runs...\n");

  const runs = await listWorkflowRuns(20);

  if (runs.length === 0) {
    console.info("No workflow runs found.");
    return;
  }

  console.info("Recent Workflow Runs:");
  console.info("=".repeat(80));

  for (const run of runs) {
    const statusIcon =
      run.status === "completed"
        ? "[OK]"
        : run.status === "failed"
          ? "[FAIL]"
          : run.status === "partial"
            ? "[PARTIAL]"
            : "[RUNNING]";

    console.info(`\n${statusIcon} ${run.runId}`);
    console.info(`    Started: ${run.startedAt}`);
    if (run.completedAt) {
      console.info(`    Completed: ${run.completedAt}`);
    }
    if (run.selectedTopic) {
      console.info(`    Topic: ${run.selectedTopic}`);
    }
    if (run.postId) {
      console.info(`    Post ID: ${run.postId} (${run.mediaType})`);
    }
  }

  console.info("\n" + "=".repeat(80));
  console.info(`Total: ${runs.length} runs`);
}

async function showRun(runId: string): Promise<void> {
  console.info(`Fetching workflow run: ${runId}\n`);

  const workflow = await getWorkflowMetadata(runId);

  if (!workflow) {
    console.error(`Workflow run not found: ${runId}`);
    process.exit(1);
  }

  console.info("Workflow Run Details:");
  console.info("=".repeat(80));
  console.info(JSON.stringify(workflow, null, 2));
}

async function repostRun(runId: string): Promise<void> {
  console.info(`Preparing to repost workflow: ${runId}\n`);

  const workflow = await getWorkflowMetadata(runId);

  if (!workflow) {
    console.error(`Workflow run not found: ${runId}`);
    process.exit(1);
  }

  // Check if posting already succeeded
  if (workflow.posting.status === "completed" && workflow.posting.data?.postId) {
    console.warn("This workflow was already posted successfully.");
    console.warn(`Post ID: ${workflow.posting.data.postId}`);
    console.warn("Use 'npm run replay delete <runId>' to remove this run if needed.");
    process.exit(1);
  }

  // Check if we have content to post
  if (!workflow.contentGeneration.data?.postContent) {
    console.error("No generated content found in this workflow.");
    console.error("Cannot repost a workflow without generated content.");
    process.exit(1);
  }

  // Check if we have media
  const hasImage = workflow.imageGeneration.data?.imageKey;
  const hasVideo = workflow.videoGeneration.data?.videoKey;

  if (!hasImage && !hasVideo) {
    console.error("No media (image or video) found in this workflow.");
    console.error("Cannot repost a workflow without media.");
    process.exit(1);
  }

  const postContent = workflow.contentGeneration.data.postContent;
  let imagePath: string | null = null;
  let videoPath: string | null = null;

  try {
    // Download media files
    const tmpDir = os.tmpdir();

    if (hasVideo) {
      console.info("Downloading video from R2...");
      videoPath = await downloadWorkflowVideo(
        runId,
        path.join(tmpDir, `replay-${runId}-video.mp4`)
      );
    }

    if (hasImage) {
      console.info("Downloading image from R2...");
      imagePath = await downloadWorkflowImage(
        runId,
        path.join(tmpDir, `replay-${runId}-image.png`)
      );
    }

    // Post to X
    console.info("\nPosting to X...");

    let postId: string;
    let mediaType: "video" | "image";

    if (videoPath) {
      postId = await createVideoPost(postContent, videoPath);
      mediaType = "video";
    } else if (imagePath) {
      postId = await createImagePost(postContent, imagePath);
      mediaType = "image";
    } else {
      throw new Error("No media available for posting");
    }

    // Update workflow status
    workflow.posting.status = "completed";
    workflow.posting.completedAt = new Date().toISOString();
    workflow.posting.data = {
      postId,
      mediaType,
      postContent,
    };
    workflow.status = "completed";
    workflow.completedAt = new Date().toISOString();
    await saveWorkflowMetadata(workflow);

    console.info("\n" + "=".repeat(60));
    console.info("REPOST SUCCESSFUL");
    console.info("=".repeat(60));
    console.info(`Run ID: ${runId}`);
    console.info(`Post ID: ${postId}`);
    console.info(`Media Type: ${mediaType}`);
    console.info("=".repeat(60));

  } finally {
    // Cleanup temporary files
    if (imagePath) cleanupImage(imagePath);
    if (videoPath) cleanupVideo(videoPath);
  }
}

async function deleteRun(runId: string): Promise<void> {
  console.info(`Deleting workflow run: ${runId}\n`);

  await deleteWorkflowRun(runId);

  console.info(`Workflow run deleted: ${runId}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || !COMMANDS.includes(args[0] as Command)) {
    printUsage();
    process.exit(1);
  }

  if (!isR2Configured()) {
    console.error("Error: Cloudflare R2 is not configured.");
    console.error("Please set the following environment variables:");
    console.error("  - CLOUDFLARE_ACCOUNT_ID");
    console.error("  - CLOUDFLARE_R2_BUCKET");
    console.error("  - CLOUDFLARE_R2_ACCESS_KEY_ID");
    console.error("  - CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    process.exit(1);
  }

  const command = args[0] as Command;
  const runId = args[1];

  switch (command) {
    case "list":
      await listRuns();
      break;

    case "show":
      if (!runId) {
        console.error("Error: run ID is required for 'show' command");
        printUsage();
        process.exit(1);
      }
      await showRun(runId);
      break;

    case "post":
      if (!runId) {
        console.error("Error: run ID is required for 'post' command");
        printUsage();
        process.exit(1);
      }
      await repostRun(runId);
      break;

    case "delete":
      if (!runId) {
        console.error("Error: run ID is required for 'delete' command");
        printUsage();
        process.exit(1);
      }
      await deleteRun(runId);
      break;
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
