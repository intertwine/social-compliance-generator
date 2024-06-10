import fs from "fs";
import { createVideoPost } from "./platforms/x";
import { generateText } from "./util/claude";
import { generateSongFile } from "./util/musicgen";
import { generateImageFile } from "./util/openai";
import { getRandomPrompt } from "./util/topics";
import { generateVideoBuffer } from "./util/video";

const POST_TAGS = ["AIDropOfTheWeek", "SocialComplianceGenerator"];
const POST_LINKS = [
  {
    title: "Intertwine AI Drop of the Week",
    url: "https://aidrops.intertwinesys.com/drop/1",
  },
];

const cleanupFiles = (files: string[]) => {
  files.forEach((file) => {
    fs.unlinkSync(file);
  });
};

const generatePost = async (): Promise<void> => {
  try {
    const prompt = getRandomPrompt();
    const { postContent, imagePrompt, songPrompt } = await generateText(prompt);
    const imageFilePath = await generateImageFile(imagePrompt);
    const songFilePath = await generateSongFile(songPrompt);
    const videoBuffer = await generateVideoBuffer(imageFilePath, songFilePath);
    const xPostId = await createVideoPost(
      postContent,
      videoBuffer,
      POST_TAGS,
      POST_LINKS
    );

    console.info(
      `Post generated and published successfully.\n
        Original Prompt: ${prompt}\n
        Image Prompt: ${imagePrompt}\n
        Song Prompt: ${songPrompt}\n
        Post Content: ${postContent}\n
        Post ID: ${xPostId}`
    );

    cleanupFiles([imageFilePath, songFilePath]);
  } catch (error: any) {
    console.error("Error generating post:", error);
  }
};

export { generatePost };

if (require.main === module) {
  generatePost();
}
