import fs from "fs";
import path from "path";
import { createVideoPost } from "./platforms/x";
import { generateText } from "./util/claude";
import { generateSongFile } from "./util/musicgen";
import { generateImageFile } from "./util/openai";
import { generateVideoBuffer } from "./util/video";

const getRandomPrompt = (): string => {
  const prompts = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../src/topics.json"), "utf8")
  ).topics;
  return prompts[Math.floor(Math.random() * prompts.length)];
};

const generatePost = async (): Promise<boolean> => {
  try {
    const prompt = getRandomPrompt();
    const { postContent, imagePrompt, songPrompt } = await generateText(prompt);
    const imageFilePath = await generateImageFile(imagePrompt);
    const songFilePath = await generateSongFile(songPrompt);
    const videoBuffer = await generateVideoBuffer(imageFilePath, songFilePath);
    const xPostUrl = await createVideoPost(postContent, videoBuffer);

    console.info(
      `Post generated and published successfully.\n
        Original Prompt: ${prompt}\n
        Image Prompt: ${imagePrompt}\n
        Song Prompt: ${songPrompt}\n
        Post Content: ${postContent}\n
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
