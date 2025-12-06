# Generating API and Social Media Auth Tokens for Social Compliance Generator

To set up and run the project, you will need to generate authentication tokens for the following APIs and social media platforms and add them to your local `.env` file:

## Social Media Platforms

### X.com

Follow the steps below to set up an automated bot account on X.com and obtain authentication tokens for posting to the platform.

**Required OAuth Scopes:** `tweet.read`, `tweet.write`, `users.read`, `offline.access`, `media.write`

The `media.write` scope is required for video uploads. If you're getting 403 errors on media upload, re-authorize with all scopes.

1. (Highly recommended) Create an automated bot account on X.com to comply with X's [Terms of Service](https://developer.x.com/en/more/developer-terms).

   - Link your main X account to the bot account using Step 1 of the [X developer tutorial](https://developer.x.com/en/docs/tutorials/creating-a-twitter-bot-with-python--oauth-2-0--and-v2-of-the-twi).

1. In your main X.com account, create a developer account, configure an X App and obtain consumer keys by [following this tutorial](https://developer.x.com/en/docs/tutorials/step-by-step-guide-to-making-your-first-request-to-the-twitter-api-v2)

1. Generate authentication tokens using one of the methods below:

#### Option A: xurl CLI (Recommended)

Use the official [xurl CLI](https://github.com/xdevplatform/xurl) from the X Developer Platform - the simplest method.

##### Prerequisites

Configure your X App's redirect URI in the X Developer Portal to: `http://localhost:8080/callback`

##### Step 1: Install xurl

```shell
curl -fsSL https://raw.githubusercontent.com/xdevplatform/xurl/main/install.sh | sudo bash
```

##### Step 2: Run OAuth 2.0 Flow

```shell
export CLIENT_ID=your_client_id
export CLIENT_SECRET=your_client_secret
xurl auth oauth2
```

This opens a browser for authorization and automatically handles the token exchange.

##### Step 3: Retrieve Tokens

Tokens are stored in `~/.xurl`. You can verify authentication worked:

```shell
xurl /2/users/me
```

Extract the tokens from `~/.xurl` and add them to your `.env` file and GitHub secrets.

##### Bonus: Test API Calls

xurl can also be used to test X API endpoints directly:

```shell
# Get your user info
xurl /2/users/me

# Post a tweet
xurl -X POST /2/tweets -d '{"text":"Hello from xurl!"}'
```

#### Option B: GitHub Actions Workflow

Use the built-in GitHub Actions workflow to generate tokens without running a local server.

##### GitHub Secrets Setup

Configure these GitHub secrets in your repository (Settings → Secrets and variables → Actions):

- `X_API_CLIENT_ID` - Your X API app's client ID
- `X_API_CLIENT_SECRET` - Your X API app's client secret

##### Step 1: Generate Authorization URL

1. Go to **Actions** → **X OAuth Token Generator**
2. Click **Run workflow** and leave the `callback_url` input empty
3. Run the workflow and view the output

The output will display:

- An authorization URL to open in your browser
- A `CODE_VERIFIER` value - **copy and save this!**

##### Step 2: Authorize and Get Callback URL

1. Open the authorization URL in your browser
2. Log in and authorize the app with your X account
3. You'll be redirected to `http://127.0.0.1:3000/callback?state=...&code=...`
4. The page won't load - that's expected! Copy the **entire URL** from your address bar

##### Step 3: Exchange for Tokens

1. Take the callback URL you copied and append the code verifier:

   ```text
   http://127.0.0.1:3000/callback?state=...&code=...&code_verifier=YOUR_CODE_VERIFIER_HERE
   ```

2. Run the **X OAuth Token Generator** workflow again
3. Paste the full URL (with `&code_verifier=...` appended) into the `callback_url` input
4. The workflow will output your `X_API_ACCESS_TOKEN` and `X_API_REFRESH_TOKEN`

##### Step 4: Save the Tokens

Add/update these GitHub secrets:

- `X_API_ACCESS_TOKEN`
- `X_API_REFRESH_TOKEN`

For local development, also add them to your `.env` file.

#### Option C: Local xauth Server

Use the xauth submodule to generate tokens via a local OAuth server.

```shell
# In the root directory of this repository:
> git submodule update --init --recursive
> cd xauth
> npm i
> npm update
> cp .example.env .env
# ...configure .env with client keys from your X.com developer account...
# note, change the PORT in .env to 5001 so as not to conflict with the port used by the trigger.dev server
# then start the server:
> npm run start
```

Open your browser to <http://localhost:5001/oauth2>

- Click on the "Authorize" button to authorize the app
- Log in to the X.com account you want to use for posting
- Accept the permissions requested
- Copy the "Access Token" and "Refresh Token" from the response
  - Paste them into the .env file in the root directory of the project (X_API_ACCESS_TOKEN and X_API_REFRESH_TOKEN)
  - The "Refresh Token" is used to obtain a new "Access Token" when it expires.

Once you have the access token and refresh token, you can stop the xauth server. (Ctrl+C)

_The xauth submodule is modified from: <https://github.com/alkihis/twitter-api-v2-user-oauth-flow-example.git>_

### Facebook

[Placeholder - not implemented yet]

### Instagram

[Placeholder - not implemented yet]

## APIs

See [README.md](README.md) for the complete list of API keys needed for v2.0:

- **OpenRouter** - LLM access
- **Tavily** - AI-powered web search
- **Google Cloud / Vertex AI** - Gemini image generation
- **OpenAI** - Sora 2 video generation
- **Cloudflare** - KV storage for tokens, R2 for workflow storage (optional)
