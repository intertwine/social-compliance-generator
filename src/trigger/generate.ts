import { logger, schedules } from "@trigger.dev/sdk/v3";
import { generatePost } from "../generatePost";

export const generate = schedules.task({
  id: "social-compliance-generator",
  run: async (payload) => {
    try {
      logger.info(`Generating post at: ${payload.timestamp}`);
      await generatePost();
      logger.info("Post generated successfully.");
    } catch (error: any) {
      logger.error("Failed to generate post:", error);
    }
  },
});
