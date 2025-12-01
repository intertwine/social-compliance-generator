/**
 * X OAuth 2.0 PKCE Authorization Script
 *
 * Generates tokens with the required scopes for X API v2 media upload.
 *
 * Usage:
 *   npx ts-node scripts/x-oauth.ts
 *
 * For remote environments without browser access:
 *   npx ts-node scripts/x-oauth.ts --manual
 *
 * Required environment variables:
 *   X_API_CLIENT_ID - Your X app's client ID
 *   X_API_CLIENT_SECRET - Your X app's client secret (for confidential clients)
 */

import http from "http";
import crypto from "crypto";
import { URL } from "url";
import readline from "readline";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const CLIENT_ID = process.env.X_API_CLIENT_ID;
const CLIENT_SECRET = process.env.X_API_CLIENT_SECRET;
const REDIRECT_URI = "http://127.0.0.1:3000/callback";
const PORT = 3000;

// Check for manual mode (for remote environments)
const MANUAL_MODE = process.argv.includes("--manual");

// All required scopes including media.write for v2 media upload
const SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
  "media.write"  // Critical for v2 media upload!
].join(" ");

if (!CLIENT_ID) {
  console.error("Error: X_API_CLIENT_ID environment variable is required");
  console.error("Make sure you have a .env file with your X API credentials");
  process.exit(1);
}

// Generate PKCE code verifier and challenge
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Build the authorization URL
function buildAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token: string }> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  // If we have a client secret, use Basic auth (confidential client)
  // Otherwise, include client_id in body (public client)
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (CLIENT_SECRET) {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  } else {
    params.append("client_id", CLIENT_ID!);
  }

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers,
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Prompt for user input
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Output tokens
function outputTokens(tokens: { access_token: string; refresh_token: string }) {
  console.log("");
  console.log("=".repeat(60));
  console.log("SUCCESS! Add these to your .env file or GitHub Secrets:");
  console.log("=".repeat(60));
  console.log("");
  console.log(`X_API_ACCESS_TOKEN=${tokens.access_token}`);
  console.log("");
  console.log(`X_API_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log("");
  console.log("=".repeat(60));
  console.log("");
  console.log("Note: The access token expires in 2 hours.");
  console.log("The refresh token will be used to get new access tokens automatically.");
  console.log("");
}

// Manual mode - for remote environments without browser
async function runManualMode() {
  console.log("=".repeat(60));
  console.log("X OAuth 2.0 PKCE Authorization (Manual Mode)");
  console.log("=".repeat(60));
  console.log("");
  console.log("Scopes requested:", SCOPES);
  console.log("");

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl = buildAuthUrl(state, codeChallenge);

  console.log("Step 1: Open this URL in ANY browser (phone, other computer, etc.):");
  console.log("");
  console.log(authUrl);
  console.log("");
  console.log("Step 2: Log in and authorize the application");
  console.log("");
  console.log("Step 3: After authorizing, you'll be redirected to a URL that won't load.");
  console.log("        That's OK! Copy the ENTIRE URL from your browser's address bar.");
  console.log("");
  console.log("        It will look something like:");
  console.log("        http://127.0.0.1:3000/callback?state=...&code=...");
  console.log("");

  const callbackUrl = await prompt("Paste the callback URL here: ");

  try {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      throw new Error(`Authorization failed: ${error}`);
    }

    if (returnedState !== state) {
      throw new Error("State mismatch - the callback URL doesn't match this session. Try again.");
    }

    if (!code) {
      throw new Error("No authorization code found in the URL");
    }

    console.log("");
    console.log("Exchanging authorization code for tokens...");

    const tokens = await exchangeCodeForTokens(code, codeVerifier);
    outputTokens(tokens);
  } catch (err) {
    console.error("");
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// Server mode - for local environments with browser
async function runServerMode() {
  console.log("=".repeat(60));
  console.log("X OAuth 2.0 PKCE Authorization");
  console.log("=".repeat(60));
  console.log("");
  console.log("Scopes requested:", SCOPES);
  console.log("");

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl = buildAuthUrl(state, codeChallenge);

  console.log("Step 1: Open this URL in your browser to authorize:");
  console.log("");
  console.log(authUrl);
  console.log("");
  console.log("Step 2: Log in and authorize the application");
  console.log("");
  console.log(`Waiting for callback on http://127.0.0.1:${PORT}/callback ...`);
  console.log("");

  // Start local server to receive callback
  return new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1:${PORT}`);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p>`);
          console.error("Authorization failed:", error);
          server.close();
          reject(new Error(error));
          return;
        }

        if (returnedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>State Mismatch</h1><p>Security error: state parameter mismatch</p>");
          console.error("State mismatch - possible CSRF attack");
          server.close();
          reject(new Error("State mismatch"));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>No Code</h1><p>No authorization code received</p>");
          server.close();
          reject(new Error("No authorization code"));
          return;
        }

        try {
          console.log("Received authorization code, exchanging for tokens...");
          const tokens = await exchangeCodeForTokens(code, codeVerifier);

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <head><title>Authorization Successful</title></head>
              <body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h1 style="color: green;">✓ Authorization Successful!</h1>
                <p>You can close this window and check the terminal for your tokens.</p>
              </body>
            </html>
          `);

          outputTokens(tokens);
          server.close();
          resolve();
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(`<h1>Token Exchange Failed</h1><p>${err}</p>`);
          console.error("Token exchange failed:", err);
          server.close();
          reject(err);
        }
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(PORT, "127.0.0.1", () => {
      console.log(`Server listening on http://127.0.0.1:${PORT}`);
    });

    server.on("error", (err) => {
      console.error("Server error:", err);
      reject(err);
    });
  });
}

// Main
async function main() {
  if (MANUAL_MODE) {
    await runManualMode();
  } else {
    await runServerMode();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
