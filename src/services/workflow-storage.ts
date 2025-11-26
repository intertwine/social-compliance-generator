/**
 * Cloudflare R2 Workflow Storage Service
 * Stores intermediate workflow results for replay and manual posting
 *
 * Uses S3-compatible API via @aws-sdk/client-s3
 * Storage structure:
 *   workflows/{runId}/metadata.json  - Workflow run metadata and step results
 *   workflows/{runId}/image.png      - Generated image
 *   workflows/{runId}/video.mp4      - Generated video
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import type { WorkflowRun, WorkflowRunSummary } from "../types/workflow";

const WORKFLOWS_PREFIX = "workflows/";

/**
 * Get configured S3 client for Cloudflare R2
 */
function getR2Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID environment variable is required");
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY environment variables are required"
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Get the R2 bucket name
 */
function getBucketName(): string {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  if (!bucket) {
    throw new Error("CLOUDFLARE_R2_BUCKET environment variable is required");
  }
  return bucket;
}

/**
 * Check if R2 storage is configured
 */
export function isR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET
  );
}

/**
 * Save workflow metadata to R2
 */
export async function saveWorkflowMetadata(workflow: WorkflowRun): Promise<void> {
  if (!isR2Configured()) {
    console.warn("R2 storage not configured, skipping workflow metadata save");
    return;
  }

  const client = getR2Client();
  const bucket = getBucketName();
  const key = `${WORKFLOWS_PREFIX}${workflow.runId}/metadata.json`;

  console.info(`Saving workflow metadata to R2: ${key}`);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(workflow, null, 2),
      ContentType: "application/json",
    })
  );

  console.info("Workflow metadata saved successfully");
}

/**
 * Save generated image to R2
 * @returns The R2 key where the image is stored
 */
export async function saveWorkflowImage(
  runId: string,
  imagePath: string
): Promise<string> {
  if (!isR2Configured()) {
    console.warn("R2 storage not configured, skipping image save");
    return "";
  }

  const client = getR2Client();
  const bucket = getBucketName();

  // Determine content type and extension from file
  const ext = imagePath.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const key = `${WORKFLOWS_PREFIX}${runId}/image.${ext}`;

  console.info(`Saving workflow image to R2: ${key}`);

  const imageData = fs.readFileSync(imagePath);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: imageData,
      ContentType: contentType,
    })
  );

  console.info("Workflow image saved successfully");
  return key;
}

/**
 * Save generated video to R2
 * @returns The R2 key where the video is stored
 */
export async function saveWorkflowVideo(
  runId: string,
  videoPath: string
): Promise<string> {
  if (!isR2Configured()) {
    console.warn("R2 storage not configured, skipping video save");
    return "";
  }

  const client = getR2Client();
  const bucket = getBucketName();
  const key = `${WORKFLOWS_PREFIX}${runId}/video.mp4`;

  console.info(`Saving workflow video to R2: ${key}`);

  const videoData = fs.readFileSync(videoPath);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: videoData,
      ContentType: "video/mp4",
    })
  );

  console.info("Workflow video saved successfully");
  return key;
}

/**
 * Get workflow metadata from R2
 */
export async function getWorkflowMetadata(runId: string): Promise<WorkflowRun | null> {
  if (!isR2Configured()) {
    console.warn("R2 storage not configured");
    return null;
  }

  const client = getR2Client();
  const bucket = getBucketName();
  const key = `${WORKFLOWS_PREFIX}${runId}/metadata.json`;

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      return null;
    }

    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString) as WorkflowRun;
  } catch (error: any) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Download workflow image from R2 to a local file
 * @returns The local file path where the image was saved
 */
export async function downloadWorkflowImage(
  runId: string,
  destPath: string
): Promise<string | null> {
  if (!isR2Configured()) {
    console.warn("R2 storage not configured");
    return null;
  }

  const client = getR2Client();
  const bucket = getBucketName();

  // Try both png and jpg extensions
  for (const ext of ["png", "jpg"]) {
    const key = `${WORKFLOWS_PREFIX}${runId}/image.${ext}`;

    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      if (response.Body) {
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const finalPath = destPath.replace(/\.(png|jpg)$/, `.${ext}`);
        fs.writeFileSync(finalPath, buffer);
        console.info(`Downloaded workflow image to: ${finalPath}`);
        return finalPath;
      }
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        continue;
      }
      throw error;
    }
  }

  return null;
}

/**
 * Download workflow video from R2 to a local file
 * @returns The local file path where the video was saved
 */
export async function downloadWorkflowVideo(
  runId: string,
  destPath: string
): Promise<string | null> {
  if (!isR2Configured()) {
    console.warn("R2 storage not configured");
    return null;
  }

  const client = getR2Client();
  const bucket = getBucketName();
  const key = `${WORKFLOWS_PREFIX}${runId}/video.mp4`;

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (response.Body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      fs.writeFileSync(destPath, buffer);
      console.info(`Downloaded workflow video to: ${destPath}`);
      return destPath;
    }
  } catch (error: any) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }

  return null;
}

/**
 * List recent workflow runs
 * @param limit Maximum number of runs to return (default 20)
 */
export async function listWorkflowRuns(limit: number = 20): Promise<WorkflowRunSummary[]> {
  if (!isR2Configured()) {
    console.warn("R2 storage not configured");
    return [];
  }

  const client = getR2Client();
  const bucket = getBucketName();

  // List all metadata.json files in the workflows prefix
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: WORKFLOWS_PREFIX,
      MaxKeys: 1000,
    })
  );

  if (!response.Contents) {
    return [];
  }

  // Filter to only metadata files and extract run IDs
  const metadataKeys = response.Contents.filter((obj) =>
    obj.Key?.endsWith("/metadata.json")
  ).sort((a, b) => {
    // Sort by LastModified descending (most recent first)
    const aTime = a.LastModified?.getTime() || 0;
    const bTime = b.LastModified?.getTime() || 0;
    return bTime - aTime;
  });

  // Fetch metadata for each run (limited)
  const summaries: WorkflowRunSummary[] = [];

  for (const obj of metadataKeys.slice(0, limit)) {
    const runId = obj.Key?.replace(WORKFLOWS_PREFIX, "").replace("/metadata.json", "");
    if (!runId) continue;

    try {
      const workflow = await getWorkflowMetadata(runId);
      if (workflow) {
        summaries.push({
          runId: workflow.runId,
          status: workflow.status,
          startedAt: workflow.startedAt,
          completedAt: workflow.completedAt,
          selectedTopic: workflow.contentGeneration.data?.selectedTopic,
          postId: workflow.posting.data?.postId,
          mediaType: workflow.posting.data?.mediaType,
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch metadata for run ${runId}:`, error);
    }
  }

  return summaries;
}

/**
 * Delete a workflow run and all its files from R2
 */
export async function deleteWorkflowRun(runId: string): Promise<void> {
  if (!isR2Configured()) {
    console.warn("R2 storage not configured");
    return;
  }

  const client = getR2Client();
  const bucket = getBucketName();
  const prefix = `${WORKFLOWS_PREFIX}${runId}/`;

  // List all objects with this prefix
  const listResponse = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    })
  );

  if (!listResponse.Contents || listResponse.Contents.length === 0) {
    console.info(`No files found for workflow run: ${runId}`);
    return;
  }

  // Delete each object
  for (const obj of listResponse.Contents) {
    if (obj.Key) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: obj.Key,
        })
      );
      console.info(`Deleted: ${obj.Key}`);
    }
  }

  console.info(`Deleted workflow run: ${runId}`);
}
