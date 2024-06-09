// import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// NOTE: This is a nonfunctional placeholder for the Instagram platform
// TODO: Implement Instagram platform

const PLATFORM_NAME = "Instagram";
const PLATFORM_ENDPOINT = "https://api.instagram.com/v1/media/upload";

const FALLBACK_POST_URL = "https://www.instagram.com/";

const postTemplate = (
  textContent: string,
  imageUrl: string,
  songUrl: string
) => {
  return "IMPLEMENT ME";
};

const createPost = async (
  content: string,
  songUrl: string,
  imageUrl: string
): Promise<string> => {
  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const url = PLATFORM_ENDPOINT;
    const payload = {
      message: postTemplate(content, imageUrl, songUrl),
      access_token: accessToken,
    };

    // await axios.post(url, payload);
    return FALLBACK_POST_URL;
  } catch (error: any) {
    console.error(`Error posting to ${PLATFORM_NAME}:`, error);
    throw new Error(`Failed to post to ${PLATFORM_NAME}.`);
  }
};

export { createPost };
