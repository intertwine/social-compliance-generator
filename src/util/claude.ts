import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type generateTextResponse = {
  postContent: string;
  imagePrompt: string;
};

const generateText = async (
  promptText: string
): Promise<generateTextResponse> => {
  const prompt = `You are a helpful assistant that generates json based on a prompt.
  The prompt is: "Generate a short facebook post and a prompt for an AI image generator
  based on this topic: ${promptText}." Do not include any other text, just the json.
  The json should be in the following format:
  {
    "postContent": "The content of the post",
    "imagePrompt": "The prompt for the image generator"
  }`;
  try {
    const completion = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    const contentBlock = completion.content[0];
    if (contentBlock.type !== "text") {
      throw new Error("Unexpected content block type");
    }

    const contentJson = JSON.parse(contentBlock.text);
    const postContent = contentJson.postContent;
    const imagePrompt = contentJson.imagePrompt;

    return { postContent, imagePrompt };
  } catch (error: any) {
    console.error("Error generating text with Anthropic:", error);
    throw new Error("Failed to generate text using Anthropic.");
  }
};

export { generateText };
