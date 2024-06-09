import { logger, schedules } from "@trigger.dev/sdk/v3";
import { generatePost } from "../generatePost";

export const generate = schedules.task({
  id: "social-compliance-generator",
  run: async (payload) => {
    const post = await generatePost();
    if (!post) {
      logger.error("Failed to generate post");
      return false;
    }
    logger.info(post.toString());
    return post;
  },
});
