import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const PLATFORM_NAME = "X (Twitter)";
const PLATFORM_ENDPOINT = "https://api.x.com/v1/timeline/statuses/create";

const FALLBACK_POST_URL = "https://www.x.com/";

const postTemplate = (
  textContent: string,
  imageUrl: string,
  songUrl: string
) => {
  return `
  {
    "message": "${textContent}",
    "attachment": {
      "type": "image",
      "payload": {
        "url": "${imageUrl}"
      }
    },
    "actions": [
      {
        "name": "song",
        "link": "${songUrl}"
      }
    ]
  }
  `;
};

const createPost = async (
  content: string,
  songUrl: string,
  imageUrl: string
): Promise<string> => {
  try {
    const accessToken = process.env.X_API_KEY;
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
