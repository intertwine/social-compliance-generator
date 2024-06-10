import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI();

type IGenerateTextResponse = {
  postContent: string;
  imagePrompt: string;
  songPrompt: string;
};

const generateText = async (
  promptText: string
): Promise<IGenerateTextResponse> => {
  const prompt = `The prompt is: "Generate a short twitter post, a prompt for an AI image generator
  and a prompt for an AI song generator based on this topic: ${promptText}."
  Do not include any other text, just the json. The json should be in the following format:
  {
    "postContent": "The content of the post, no longer than 200 characters",
    "imagePrompt": "The prompt for the image generator",
    "songPrompt": "The prompt for the song generator"
  }`;
  try {
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates json based on a prompt.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-3.5-turbo",
      max_tokens: 150,
      response_format: { type: "json_object" },
    });
    const messageContent = response.choices[0].message.content ?? "";
    const postContent = JSON.parse(messageContent).postContent;
    const imagePrompt = JSON.parse(messageContent).imagePrompt;
    const songPrompt = JSON.parse(messageContent).songPrompt;
    return { postContent, imagePrompt, songPrompt };
  } catch (error: any) {
    console.error("Error generating text with OpenAI:", error);
    throw new Error("Failed to generate text using OpenAI.");
  }
};

type IGenerateImageFormat = "url" | "b64_json";
type IGenerateImage = (
  prompt: string,
  format: IGenerateImageFormat
) => Promise<string>;

const generateImage: IGenerateImage = async (prompt, format = "url") => {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: format,
    });
    if (!response.data || !response.data[0] || !response.data[0][format]) {
      throw new Error("Failed to generate image");
    }
    return response.data[0][format]!;
  } catch (error: any) {
    console.error("Error generating image with OpenAI:", error);
    throw new Error("Failed to generate image using OpenAI.");
  }
};

const generateImageFile = async (prompt: string): Promise<string> => {
  const now = Math.floor(new Date().getTime() / 1000);
  const imagePath = `./image-${now}.jpg`;
  const image_b64 = await generateImage(prompt, "b64_json");
  fs.writeFileSync(imagePath, Buffer.from(image_b64, "base64"));
  return imagePath;
};

export { generateImage, generateImageFile, generateText };
