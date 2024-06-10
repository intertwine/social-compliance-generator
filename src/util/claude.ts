import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type generateTextResponse = {
  postContent: string;
  imagePrompt: string;
  songPrompt: string;
};

const generateText = async (
  promptText: string
): Promise<generateTextResponse> => {
  const prompt = `You are a helpful assistant that generates json based on a prompt.
  The prompt is: "Generate a short twitter post, a prompt for an AI image generator,
  and a prompt for an AI song generator based on this topic: ${promptText}."
  Do not include any other text, just the json. The json should be in the following format:
  {
    "postContent": "The content of the post, no longer than 200 characters",
    "imagePrompt": "The prompt for the image generator",
    "songPrompt": "The prompt for the song generator"
  }`;
  try {
    const completion = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
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
    const songPrompt = contentJson.songPrompt;

    return { postContent, imagePrompt, songPrompt };
  } catch (error: any) {
    console.error("Error generating text with Anthropic:", error);
    throw new Error("Failed to generate text using Anthropic.");
  }
};

export { generateText };
