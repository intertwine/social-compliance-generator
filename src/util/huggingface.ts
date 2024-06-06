const generateSong = async (prompt: string): Promise<string> => {
  // @See https://huggingface.co/Xenova/musicgen-small
  try {
    const { AutoTokenizer, MusicgenForConditionalGeneration } = await import(
      "@xenova/transformers"
    );

    const tokenizer = await AutoTokenizer.from_pretrained(
      "Xenova/musicgen-small"
    );
    const model = await MusicgenForConditionalGeneration.from_pretrained(
      "Xenova/musicgen-small",
      {
        dtype: {
          text_encoder: "q8",
          decoder_model_merged: "q8",
          encodec_decode: "fp32",
        },
      }
    );
    const inputs = tokenizer(prompt);
    const audio_values = await model.generate({
      ...inputs,
      max_new_tokens: 500,
      do_sample: true,
      guidance_scale: 3,
    });
    console.log(audio_values.data.length);

    // TODO: Upload the audio to a cloud storage service and return the URL
    // Initial Approach: use the wavefile library to convert to wav and stream to supabase
    return "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  } catch (error: any) {
    console.error("Error generating song:", error);
    throw new Error("Failed to generate song.");
  }
};

export { generateSong };
