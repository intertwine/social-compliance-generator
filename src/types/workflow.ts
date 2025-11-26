/**
 * Workflow Types
 * Data structures for storing workflow run results
 */

import type { TavilySearchResult } from "../services/search";

/**
 * Generated content from LLM
 */
export interface GeneratedContent {
  postContent: string;
  imagePrompt: string;
  videoPrompt: string;
  selectedTopic: string;
}

/**
 * Workflow step status
 */
export type WorkflowStepStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

/**
 * Workflow run status
 */
export type WorkflowStatus = "running" | "completed" | "failed" | "partial";

/**
 * Individual workflow step result
 */
export interface WorkflowStep<T = unknown> {
  status: WorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  data?: T;
}

/**
 * Complete workflow run data
 */
export interface WorkflowRun {
  /** Unique identifier for this run */
  runId: string;

  /** Overall workflow status */
  status: WorkflowStatus;

  /** When the workflow started */
  startedAt: string;

  /** When the workflow completed (success or failure) */
  completedAt?: string;

  /** Error message if workflow failed */
  error?: string;

  /** Step 1: News search results */
  newsSearch: WorkflowStep<{
    query?: string;
    results: TavilySearchResult[];
  }>;

  /** Step 2: LLM content generation */
  contentGeneration: WorkflowStep<GeneratedContent>;

  /** Step 3: Image generation */
  imageGeneration: WorkflowStep<{
    prompt: string;
    /** R2 key where image is stored */
    imageKey?: string;
  }>;

  /** Step 4: Video generation */
  videoGeneration: WorkflowStep<{
    prompt: string;
    /** R2 key where video is stored */
    videoKey?: string;
  }>;

  /** Step 5: Post to X */
  posting: WorkflowStep<{
    postId?: string;
    mediaType: "video" | "image";
    postContent: string;
  }>;
}

/**
 * Summary of a workflow run (for listing)
 */
export interface WorkflowRunSummary {
  runId: string;
  status: WorkflowStatus;
  startedAt: string;
  completedAt?: string;
  selectedTopic?: string;
  postId?: string;
  mediaType?: "video" | "image";
}

/**
 * Create a new workflow run with initial state
 */
export function createWorkflowRun(runId: string): WorkflowRun {
  return {
    runId,
    status: "running",
    startedAt: new Date().toISOString(),
    newsSearch: { status: "pending" },
    contentGeneration: { status: "pending" },
    imageGeneration: { status: "pending" },
    videoGeneration: { status: "pending" },
    posting: { status: "pending" },
  };
}

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const random = Math.random().toString(36).substring(2, 8);
  return `run-${timestamp}-${random}`;
}
