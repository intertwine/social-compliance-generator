import { task, logger } from '@trigger.dev/sdk/v3';
import { generatePost } from '../generatePost';

export const generate = task({
  id: 'social-compliance-generator',
  run: async (payload: { message: string }) => {
    //4. You can write code that runs for a long time here, there are no timeouts
    logger.info(payload.message);
    const post = await generatePost();
    if (!post) {
      logger.error('Failed to generate post');
      return false;
    }
    logger.info(post.toString());
    return post;
  },
});
