import { uploadStreamToS3 } from "./upload";
import { WaveFile } from "wavefile";

const generateSongFileName = (prompt: string) => {
  const now = Math.floor(new Date().getTime() / 1000);
  const baseName = `song-${now}-${prompt.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return `${baseName.toLowerCase().substring(0, 64)}.wav`;
};

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
    console.info(
      "Generated audio bytes with length:",
      audio_values.data.length
    );

    const wav = new WaveFile();
    wav.fromScratch(
      1,
      model.config.audio_encoder.sampling_rate,
      "32f",
      audio_values.data
    );
    const songUrl = await uploadStreamToS3(
      wav.toBuffer(),
      "social-compliance-generator",
      generateSongFileName(prompt)
    );
    console.info("Uploaded song to S3:", songUrl);

    return songUrl;
  } catch (error: any) {
    console.error("Error generating song:", error);
    throw new Error("Failed to generate song.");
  }
};

export { generateSong };
