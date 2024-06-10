import fs from "fs";
import { WaveFile } from "wavefile";
import { uploadStreamToS3 } from "./upload";

const generateSongFileName = (prompt: string) => {
  const now = Math.floor(new Date().getTime() / 1000);
  const baseName = `song-${now}-${prompt.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return `${baseName.toLowerCase().substring(0, 64)}.wav`;
};

const generateSong = async (prompt: string): Promise<Uint8Array> => {
  // @See https://huggingface.co/Xenova/musicgen-small
  try {
    const { AutoTokenizer, MusicgenForConditionalGeneration } = await import(
      "transformers.js" // "@xenova/transformers.js#v3" forked here for stable v3 access
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

    return wav.toBuffer();
  } catch (error: any) {
    console.error("Error generating song:", error);
    throw new Error("Failed to generate song.");
  }
};

const generateSongUrl = async (prompt: string): Promise<string> => {
  const audioBuffer = await generateSong(prompt);
  const songUrl = await uploadStreamToS3(
    audioBuffer,
    "social-compliance-generator",
    generateSongFileName(prompt)
  );
  console.info("Uploaded song to S3:", songUrl);
  return songUrl;
};

const generateSongFile = async (prompt: string): Promise<string> => {
  const now = Math.floor(new Date().getTime() / 1000);
  const audioBuffer = await generateSong(prompt);
  const songPath = `./song-${now}.wav`;
  fs.writeFileSync(songPath, audioBuffer);
  return songPath;
};

export { generateSong, generateSongFile, generateSongUrl };
