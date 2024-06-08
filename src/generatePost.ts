import fs from "fs";
import path from "path";
import { createPost as createPostForFacebook } from "./platforms/facebook";
import { createPost as createPostForInstagram } from "./platforms/instagram";
import { createPost as createPostForX } from "./platforms/x";
import { generateText } from "./util/claude";
import { generateSong } from "./util/musicgen";
import { generateImage } from "./util/openai";

const getRandomPrompt = (): string => {
  const prompts = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/topics.json"), "utf8")).topics;
  return prompts[Math.floor(Math.random() * prompts.length)];
};

const generatePost = async (): Promise<boolean> => {
  try {
    const prompt = getRandomPrompt();
    const { postContent, imagePrompt, songPrompt } = await generateText(prompt);
    const imageUrl = await generateImage(imagePrompt);
    const songUrl = await generateSong(songPrompt);

    const facebookPostUrl = await createPostForFacebook(
      postContent,
      songUrl,
      imageUrl
    );
    const instagramPostUrl = await createPostForInstagram(
      postContent,
      songUrl,
      imageUrl
    );
    const xPostUrl = await createPostForX(postContent, songUrl, imageUrl);

    console.info(
      `Post generated and published successfully.\n
        Original Prompt: ${prompt}\n
        Image Prompt: ${imagePrompt}\n
        Song Prompt: ${songPrompt}\n
        Post Content: ${postContent}\n
        Image URL: ${imageUrl}\n
        Song URL: ${songUrl}\n
        Post URL: ${facebookPostUrl}\n
        Post URL: ${instagramPostUrl}\n
        Post URL: ${xPostUrl}`
    );
    return true;
  } catch (error: any) {
    console.error("Error generating post:", error);
    return false;
  }
};

export { generatePost };

if (require.main === module) {
  generatePost();
}
