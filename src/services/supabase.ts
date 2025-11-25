/**
 * Supabase Service
 * Handles OAuth token storage for X API refresh tokens
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client instance (singleton)
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables are required");
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Get stored OAuth tokens from Supabase
 */
export async function getStoredTokens(): Promise<TokenResult> {
  const accessToken = process.env.X_API_ACCESS_TOKEN;
  const initialRefreshToken = process.env.X_API_REFRESH_TOKEN;

  if (!accessToken || !initialRefreshToken) {
    throw new Error("X_API_ACCESS_TOKEN and X_API_REFRESH_TOKEN environment variables are required");
  }

  const client = getSupabaseClient();

  // Try to get stored refresh token
  const { data, error } = await client
    .from("xrefresh")
    .select("token")
    .eq("id", 1)
    .single();

  if (error) {
    console.warn("Could not fetch stored token, using initial token:", error.message);
  }

  // Use stored token if available, otherwise use initial token
  const refreshToken = data?.token || initialRefreshToken;

  // If no stored token, save the initial one
  if (!data?.token) {
    await saveTokens(accessToken, initialRefreshToken);
  }

  return { accessToken, refreshToken };
}

/**
 * Save OAuth tokens to Supabase
 */
export async function saveTokens(
  accessToken: string,
  refreshToken: string
): Promise<TokenResult> {
  console.info("Saving refresh token to Supabase...");

  const client = getSupabaseClient();

  const { error } = await client
    .from("xrefresh")
    .upsert([{ id: 1, token: refreshToken }]);

  if (error) {
    console.error("Error saving token to Supabase:", error);
    throw new Error("Failed to save token to Supabase");
  }

  console.info("Token saved successfully");
  return { accessToken, refreshToken };
}
