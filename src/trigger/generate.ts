import { logger, schedules } from "@trigger.dev/sdk/v3";
import { generatePost } from "../generatePost";
import { logFSInfo } from "../util/filesystem";

export const generate = schedules.task({
  id: "social-compliance-generator",
  machine: {
    cpu: 4,
    memory: 8,
  },
  run: async (payload) => {
    try {
      logger.debug("FS Info from Task:"),
      logFSInfo();
      logger.info(`Generating post at: ${payload.timestamp}`);
      await generatePost();
      logger.info("Post generated successfully.");
    } catch (error: any) {
      logger.error("Failed to generate post:", error);
    }
  },
});
