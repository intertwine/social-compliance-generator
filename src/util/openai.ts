import OpenAI from "openai";

const openai = new OpenAI();

type generateTextResponse = {
  postContent: string;
  imagePrompt: string;
};

const generateText = async (
  promptText: string
): Promise<generateTextResponse> => {
  const prompt = `The prompt is: "Generate a short facebook post and a prompt for an AI image generator
  based on this topic: ${promptText}." Do not include any other text, just the json.
  The json should be in the following format:
  {
    "postContent": "The content of the post",
    "imagePrompt": "The prompt for the image generator"
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
    return { postContent, imagePrompt };
  } catch (error: any) {
    console.error("Error generating text with OpenAI:", error);
    throw new Error("Failed to generate text using OpenAI.");
  }
};

const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "url",
    });
    if (!response.data || !response.data[0] || !response.data[0].url) {
      throw new Error("Failed to generate image");
    }
    return response.data[0].url;
  } catch (error: any) {
    console.error("Error generating image with OpenAI:", error);
    throw new Error("Failed to generate image using OpenAI.");
  }
};

export { generateText, generateImage };
