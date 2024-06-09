import { TwitterApi } from "twitter-api-v2";
import { TwitterApiAutoTokenRefresher } from "@twitter-api-v2/plugin-token-refresher";
import { getSupabaseClient } from "../util/supabase";
import dotenv from "dotenv";
dotenv.config();

const PLATFORM_NAME = "X.com"; // Or call it Twitter if you like

// X OAuth 1.1a Credentials (For Twitter API V1)
const APP_TOKEN = process.env.X_API_CONSUMER_TOKEN;
const APP_SECRET = process.env.X_API_CONSUMER_SECRET;
const X_V1_ACCESS_TOKEN = process.env.X_API_V1_ACCESS_TOKEN;
const X_V1_ACCESS_SECRET = process.env.X_API_V1_ACCESS_SECRET;

// X Oauth 2.0 Credentials (For Twitter API V2)
const CLIENT_ID = process.env.X_API_CLIENT_ID;
const CLIENT_SECRET = process.env.X_API_CLIENT_SECRET;
const ACCESS_TOKEN = process.env.X_API_ACCESS_TOKEN;
const INITAL_REFRESH_TOKEN = process.env.X_API_REFRESH_TOKEN;

type ILoginTokenResult = {
  accessToken: string;
  refreshToken: string;
};

const getLoginTokens = async (): Promise<ILoginTokenResult | Error> => {
  if (!ACCESS_TOKEN || !INITAL_REFRESH_TOKEN) {
    throw new Error("Missing required token environment variables");
  }
  const supabaseClient = getSupabaseClient();
  let { data, error } = await supabaseClient
    .from("xrefresh")
    .select("token")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("Error getting token from Supabase:", error);
  }

  if (!data?.token) {
    return await saveLoginTokens(ACCESS_TOKEN!, INITAL_REFRESH_TOKEN!);
  }

  return { accessToken: ACCESS_TOKEN!, refreshToken: data.token };
};

const saveLoginTokens = async (
  accessToken: string,
  refreshToken: string
): Promise<ILoginTokenResult> => {
  console.info("Saving login tokens to Supabase");
  const supabaseClient = getSupabaseClient();
  const { data, error } = await supabaseClient
    .from("xrefresh")
    .upsert([{ id: 1, token: refreshToken }])
    .select("token")
    .single();

  if (error) {
    console.error("Error saving token to Supabase:", error);
    throw new Error("Failed to save token to Supabase.");
  }

  if (!data?.token) {
    throw new Error("Failed to save token to Supabase.");
  }

  return { accessToken, refreshToken: data.token };
};

const getV1UserClient = async () => {
  // TwitterAPI V1 Docs here: <https://github.com/twitter/twitter-api-v1/blob/master/doc/v1.md>
  if (!APP_TOKEN || !APP_SECRET || !X_V1_ACCESS_TOKEN || !X_V1_ACCESS_SECRET) {
    throw new Error(
      `Missing required environment variables ${PLATFORM_NAME} V1`
    );
  }

  const v1Client = new TwitterApi({
    appKey: APP_TOKEN,
    appSecret: APP_SECRET,
    accessToken: X_V1_ACCESS_TOKEN,
    accessSecret: X_V1_ACCESS_SECRET,
  });

  return v1Client;
};

const getUserClient = async () => {
  // TwitterAPI V2 Docs here: <https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/v2.md>
  // Twitter Plugin Token Refresher Docs here: <https://github.com/alkihis/twitter-api-v2-plugin-token-refresher>
  if (!ACCESS_TOKEN || !INITAL_REFRESH_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      `Missing required environment variables ${PLATFORM_NAME} V2`
    );
  }
  const credentials = { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET };
  const tokenStore = await getLoginTokens();

  if (tokenStore instanceof Error) {
    throw new Error("Failed to get login tokens");
  }

  const autoRefresherPlugin = new TwitterApiAutoTokenRefresher({
    refreshToken: tokenStore.refreshToken,
    refreshCredentials: credentials,
    async onTokenUpdate(newToken) {
      tokenStore.accessToken = newToken.accessToken;
      tokenStore.refreshToken = newToken.refreshToken!;
      await saveLoginTokens(newToken.accessToken, newToken.refreshToken!);
    },
    onTokenRefreshError(error) {
      console.error("Error refreshing token:", error);
      throw new Error("Failed to refresh token.");
    },
  });
  const userClient = new TwitterApi(tokenStore.accessToken, {
    plugins: [autoRefresherPlugin],
  });
  return userClient;
};

const createVideoPost = async (content: string, videoBuffer: Buffer) => {
  // @See: <https://github.com/PLhery/node-twitter-api-v2/issues/451#issuecomment-1900704325>
  try {
    const v1Client = await getV1UserClient();
    const v2Client = await getUserClient();

    const additionalOwners = (await v2Client.currentUserV2()).data.id;

    const mediaId = await v1Client.v1.uploadMedia(videoBuffer, {
      mimeType: "video/mp4",
      additionalOwners,
    });

    const createdTweet = await v2Client.v2.tweet({
      text: content,
      media: { media_ids: [mediaId] },
    });

    console.info(`Successfully posted to ${PLATFORM_NAME}`);
    console.info("Tweet:", createdTweet);
    return createdTweet.data.id;
  } catch (error: any) {
    console.error(`Error posting to ${PLATFORM_NAME}:`, error);
    throw new Error(`Failed to post to ${PLATFORM_NAME}.`);
  }
};

export { createVideoPost };
