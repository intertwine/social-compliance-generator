import { TwitterApi } from "twitter-api-v2";
import { TwitterApiAutoTokenRefresher } from "@twitter-api-v2/plugin-token-refresher";
import { getSupabaseClient } from "../util/supabase";
import dotenv from "dotenv";
dotenv.config();

const PLATFORM_NAME = "X.com"; // Or call it Twitter if you like

const CLIENT_ID = process.env.X_API_CLIENT_ID;
const CLIENT_SECRET = process.env.X_API_CLIENT_SECRET;
const ACCESS_TOKEN = process.env.X_API_ACCESS_TOKEN;
const INITAL_REFRESH_TOKEN = process.env.X_API_REFRESH_TOKEN;

type ILoginTokenResult = {
  accessToken: string;
  refreshToken: string;
};

const getLoginTokens = async (): Promise<ILoginTokenResult|Error> => {
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

const getUserClient = async () => {
  // TwitterAPI V2 Docs here: <https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/v2.md>
  // Twitter Plugin Token Refresher Docs here: <https://github.com/alkihis/twitter-api-v2-plugin-token-refresher>
  if (!ACCESS_TOKEN || !INITAL_REFRESH_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(`Missing required environment variables ${PLATFORM_NAME}`);
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

const postTemplate = (
  textContent: string,
  imageUrl: string,
  songUrl: string
) => {
  return textContent;
};

const createPost = async (
  content: string,
  songUrl: string,
  imageUrl: string
): Promise<string> => {
  try {
    const userClient = await getUserClient();
    const createdTweet = await userClient.v2.tweet(
      postTemplate(content, imageUrl, songUrl)
    );
    console.info(`Successfully posted to ${PLATFORM_NAME}`);
    console.info("Tweet:", createdTweet);
    return createdTweet.data.id;
  } catch (error: any) {
    console.error(`Error posting to ${PLATFORM_NAME}:`, error);
    throw new Error(`Failed to post to ${PLATFORM_NAME}.`);
  }
};

export { createPost };
