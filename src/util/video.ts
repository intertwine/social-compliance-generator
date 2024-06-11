import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getCWD } from "./filesystem";
import { uploadStreamToS3 } from "./upload";

const generateVideoFileName = (prompt: string) => {
  const now = Math.floor(new Date().getTime() / 1000);
  const baseName = `video-${now}-${prompt.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return `${baseName.toLowerCase().substring(0, 64)}.mp4`;
};

const generateVideo = async (
  imageFilePath: string,
  songFilePath: string
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    console.info("Generating video...");
    console.info("Image file:", imageFilePath);
    console.info("Song file:", songFilePath);

    const tempOutputPath = path.join(__dirname, "temp_video.mp4");
    const fontPath =
      getCWD() === "/app" // Running on trigger.dev
        ? path.join(__dirname, "src/fonts/Roboto/Roboto-Regular.ttf")
        : path.join(__dirname, "../src/fonts/Roboto/Roboto-Regular.ttf");

    const overlayText = `@intertwineai - Social Compliance Generator`;

    const ffmpegProcess = spawn(ffmpegPath, [
      "-y", // Overwrite output files without asking
      "-stream_loop",
      "1", // Loop the input audio file once (total of 2 plays)
      "-i",
      songFilePath, // Input from local file (audio)
      "-loop",
      "1", // Loop the input image
      "-i",
      imageFilePath, // Input from local file (image)
      "-c:v",
      "libx264", // Video codec
      "-c:a",
      "aac", // Audio codec
      "-shortest", // Finish encoding when the shortest input stream ends
      "-tune",
      "stillimage", // Optimize for still image input
      "-vf",
      `format=yuv420p,drawtext=fontfile=${fontPath}:text=${overlayText}:x=10:y=10+10*sin(n/30):fontcolor=white:fontsize=24:box=1:boxcolor=black@0.8:boxborderw=5`, // Text overlay with animation
      "-f",
      "mp4", // Output format
      tempOutputPath, // Write output to temporary file
    ]);

    ffmpegProcess.stderr.on("data", (data) => {
      console.log("ffmpeg stderr:", data.toString());
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg process exited with code ${code}`));
      } else {
        fs.readFile(tempOutputPath, (err, buffer) => {
          if (err) {
            reject(err);
          } else {
            fs.unlink(tempOutputPath, (err) => {
              if (err) console.error("Error deleting temp file:", err);
            });
            resolve(buffer);
          }
        });
      }
    });

    ffmpegProcess.on("error", (err) => {
      reject(err);
    });
  });
};

const generateVideoBuffer = async (
  imageFilePath: string,
  songFilePath: string
): Promise<Buffer> => {
  return await generateVideo(imageFilePath, songFilePath);
};

const generateVideoUrl = async (
  prompt: string,
  imageFilePath: string,
  songFilePath: string
): Promise<string> => {
  console.info("Generating video URL...");
  const videoBuffer = await generateVideoBuffer(imageFilePath, songFilePath);
  console.info("Video buffer generated.");
  console.info("Video buffer length:", videoBuffer.length);
  const videoUrl = await uploadStreamToS3(
    videoBuffer,
    "social-compliance-generator",
    generateVideoFileName(prompt)
  );
  console.info("Uploaded video to S3:", videoUrl);
  return videoUrl;
};

export { generateVideo, generateVideoBuffer, generateVideoUrl };
