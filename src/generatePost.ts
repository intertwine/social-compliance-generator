import fs from "fs";
import path from "path";
import { createPost as createPostForFacebook } from "./platforms/facebook";
import { createPost as createPostForInstagram } from "./platforms/instagram";
import { createPost as createPostForX } from "./platforms/x";
import { generateText } from "./util/claude";
import { generateSong } from "./util/musicgen";
import { generateImage } from "./util/openai";

const SKIP_MEDIA_GENERATION = true;

const IMG_TEMP =
  "https://oaidalleapiprodscus.blob.core.windows.net/private/org-zC91t5DUUfbQ6VkWizREEONK/user-NH0RwmB2KGnY3wFVplJwCFCp/img-WLigwg8UwsRTuSzpNKbZkIzV.png?st=2024-06-08T22%3A10%3A25Z&se=2024-06-09T00%3A10%3A25Z&sp=r&sv=2023-11-03&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2024-06-08T08%3A52%3A40Z&ske=2024-06-09T08%3A52%3A40Z&sks=b&skv=2023-11-03&sig=BlRqx9reOZ48fTq0a9eU0WUf9kXO2RWDSZnCSaeRZbg%3D";
const SONG_TEMP =
  "https://towpjxzsmxllfuzimzaa.supabase.co/storage/v1/object/public/social-compliance-generator/song-1717888258-a-melancholic-piano-melody-that-captures-the-urg.wav​";

const getRandomPrompt = (): string => {
  const prompts = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../src/topics.json"), "utf8")
  ).topics;
  return prompts[Math.floor(Math.random() * prompts.length)];
};

const generatePost = async (): Promise<boolean> => {
  try {
    let imageUrl = IMG_TEMP;
    let songUrl = SONG_TEMP;
    const prompt = getRandomPrompt();
    const { postContent, imagePrompt, songPrompt } = await generateText(prompt);
    if (!SKIP_MEDIA_GENERATION) {
      imageUrl = await generateImage(imagePrompt);
      songUrl = await generateSong(songPrompt);
    }

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
