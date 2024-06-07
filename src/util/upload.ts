import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const S3_ACCESS_KEY = process.env.SUPABASE_AWS_S3_ACCESS_KEY_ID || "";
const S3_SECRET_KEY = process.env.SUPABASE_AWS_S3_SECRET || "";
const S3_REGION = process.env.SUPABASE_AWS_S3_REGION || "";
const S3_ENDPOINT = process.env.SUPABASE_AWS_S3_ENDPOINT || "";

const getClient = () => {
  try {
    if (!S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_REGION || !S3_ENDPOINT) {
      throw new Error("Missing required environment variables");
    }

    return new S3Client({
      forcePathStyle: true,
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
    });
  } catch (error: any) {
    console.error("Error getting S3 client:", error);
    throw new Error("Failed to get S3 client.");
  }
};

const getSupabasePublicStorageUrl = (bucket: string, key: string) => {
  const baseUrl = S3_ENDPOINT.replace("/s3", "/object/public");
  return `${baseUrl}/${bucket}/${key}`;
};

const uploadFileToS3 = async (
  file: string,
  bucket: string,
  key: string
): Promise<string> => {
  try {
    const client = getClient();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
    });
    await client.send(command);
    return getSupabasePublicStorageUrl(bucket, key);
  } catch (error: any) {
    console.error("Error uploading file to S3:", error);
    throw new Error("Failed to upload fileto S3.");
  }
};

const uploadStreamToS3 = async (
  stream: any,
  bucket: string,
  key: string
): Promise<string> => {
  try {
    const client = getClient();
    const encodedKey = encodeURIComponent(key);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: encodedKey,
      Body: stream,
    });
    await client.send(command);

    return getSupabasePublicStorageUrl(bucket, encodedKey);
  } catch (error: any) {
    console.error("Error uploading streamto S3:", error);
    throw new Error("Failed to upload stream to S3.");
  }
};

export { uploadFileToS3, uploadStreamToS3 };
