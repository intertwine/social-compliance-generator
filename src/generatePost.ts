// import axios from "axios";
import { generateText } from "./util/claude";
import { generateImage } from "./util/openai";
import dotenv from "dotenv";
dotenv.config();

const getRandomPrompt = (): string => {
  const prompts = [
    "Nepalese Cat Month",
    "World Environment Day",
    "Tech Innovation of the Month",
    "International Coffee Day",
    "Global Recycling Practices",
    "Future of Renewable Energy",
    "Wildlife Conservation Efforts",
    "Advancements in AI Technology",
    "Cultural Festivals Around the World",
    "Deep Sea Exploration Discoveries",
    "Space Travel Milestones",
    "Historical Anniversaries of the Year",
    "Global Health Awareness Initiatives",
    "Artificial Intelligence in Medicine",
    "Sustainable Urban Development",
    "Impact of Globalization on Local Cultures",
    "Preservation of Endangered Languages",
    "Innovations in Sustainable Agriculture",
    "Virtual Reality in Education",
    "Human Rights Achievements",
    "Cybersecurity Trends and Threats"
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
