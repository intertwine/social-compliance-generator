/**
 * Cloudflare KV Token Storage Service
 * Handles OAuth token storage for X API refresh tokens
 */

const KV_KEY = "x_refresh_token";

interface TokenResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Get the Cloudflare KV REST API base URL
 */
function getKVBaseUrl(): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;

  if (!accountId || !namespaceId) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_KV_NAMESPACE_ID environment variables are required"
    );
  }

  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
}

/**
 * Get the API token for Cloudflare KV
 */
function getApiToken(): string {
  const token = process.env.CLOUDFLARE_KV_API_TOKEN;
  if (!token) {
    throw new Error("CLOUDFLARE_KV_API_TOKEN environment variable is required");
  }
  return token;
}

/**
 * Get stored OAuth tokens from Cloudflare KV
 */
export async function getStoredTokens(): Promise<TokenResult> {
  const accessToken = process.env.X_API_ACCESS_TOKEN;
  const initialRefreshToken = process.env.X_API_REFRESH_TOKEN;

  if (!accessToken || !initialRefreshToken) {
    throw new Error(
      "X_API_ACCESS_TOKEN and X_API_REFRESH_TOKEN environment variables are required"
    );
  }

  try {
    const baseUrl = getKVBaseUrl();
    const response = await fetch(`${baseUrl}/values/${KV_KEY}`, {
      headers: {
        Authorization: `Bearer ${getApiToken()}`,
      },
    });

    if (response.ok) {
      const storedToken = await response.text();
      if (storedToken && storedToken.length > 0) {
        console.info("Using stored refresh token from Cloudflare KV");
        return { accessToken, refreshToken: storedToken };
      }
    } else if (response.status !== 404) {
      console.warn(
        "Could not fetch stored token from Cloudflare KV:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    console.warn(
      "Could not fetch stored token, using initial token:",
      error instanceof Error ? error.message : error
    );
  }

  // Use initial token and save it
  console.info("No stored token found, using initial refresh token");
  await saveTokens(accessToken, initialRefreshToken);
  return { accessToken, refreshToken: initialRefreshToken };
}

/**
 * Save OAuth tokens to Cloudflare KV
 */
export async function saveTokens(
  accessToken: string,
  refreshToken: string
): Promise<TokenResult> {
  console.info("Saving refresh token to Cloudflare KV...");

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
  const apiToken = getApiToken();

  // Use the exact endpoint format from Cloudflare docs
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${KV_KEY}`;

  console.info(`KV write URL: ${url.replace(accountId!, "[ACCOUNT_ID]").replace(namespaceId!, "[NAMESPACE_ID]")}`);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
    body: refreshToken,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error saving token to Cloudflare KV:", response.status, errorText);
    console.error("Check that your API token has 'Account > Workers KV Storage > Edit' permission");
    throw new Error(`Failed to save token to Cloudflare KV: ${response.status}`);
  }

  console.info("Token saved successfully to Cloudflare KV");
  return { accessToken, refreshToken };
}
