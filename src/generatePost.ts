// import axios from "axios";
import { generateText } from "./util/claude";
import dotenv from "dotenv";
dotenv.config();

const getRandomPrompt = (): string => {
  const prompts = [
    "Nepalese Cat Month",
    "World Environment Day",
    "Tech Innovation of the Month",
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
};

const generateSong = async (prompt: string): Promise<string> => {
  try {
    // const response = await axios.post<{ song_url: string }>('https://api.sono.com/generate', { prompt }, {
    //   headers: { 'Authorization': `Bearer ${process.env.SONO_API_KEY}` }
    // });
    // return response.data.song_url;
    return "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  } catch (error: any) {
    console.error("Error generating song:", error);
    throw new Error("Failed to generate song.");
  }
};

const generateImage = async (prompt: string): Promise<string> => {
  try {
    // const response = await axios.post<{ image_url: string }>('https://api.dalle.com/generate', { prompt }, {
    //   headers: { 'Authorization': `Bearer ${process.env.DALL_E_API_KEY}` }
    // });
    // return response.data.image_url;
    return "https://images.unsplash.com/photo-1716847214582-d5979adbf300?q=80&w=640&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  } catch (error: any) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image.");
  }
};

const postToFacebook = async (
  content: string,
  songUrl: string,
  imageUrl: string
): Promise<string> => {
  try {
    // const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    // const url = 'https://graph.facebook.com/v12.0/me/feed';
    // const payload = {
    //   message: content,
    //   access_token: accessToken,
    // };

    // await axios.post(url, payload);
    return "https://www.facebook.com/bryanyoung/posts/10159801202064103";
  } catch (error: any) {
    console.error("Error posting to Facebook:", error);
    throw new Error("Failed to post to Facebook.");
  }
};

const generatePost = async (): Promise<string | boolean> => {
  try {
    const prompt = getRandomPrompt();
    const { postContent, imagePrompt } = await generateText(prompt);
    const imageUrl = await generateImage(imagePrompt);
    const songUrl = await generateSong(prompt);

    const postUrl = await postToFacebook(postContent, songUrl, imageUrl);

    console.info(
      `Post generated and published successfully.\n
        Prompt: ${prompt}\n
        Text: ${postContent}\n
        Image Prompt: ${imagePrompt}\n
        Image URL: ${imageUrl}\n
        Song URL: ${songUrl}\n
        Post URL: ${postUrl}`
    );
    return postUrl;
  } catch (error: any) {
    console.error("Error generating post:", error);
    return false;
  }
};

// Export the function for Trigger.dev
export { generatePost };

// If the script is run directly, call the function
if (require.main === module) {
  generatePost();
}
