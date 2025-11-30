# Generating API and Social Media Auth Tokens for Social Compliance Generator

To set up and run the project, you will need to generate authentication tokens for the following APIs
and social media platforms and add them to your local `.env` file:

## Social Media Platforms

### X.com

Follow the steps below to set up an automated bot account on X.com and obtain authentication tokens for posting to the platform:

1. (Highly recommended) Create an automated bot account on X.com to comply with X's [Terms of Service](https://developer.x.com/en/more/developer-terms).

    - Link your main X account to the bot account using Step 1 of the [X developer tutorial](https://developer.x.com/en/docs/tutorials/creating-a-twitter-bot-with-python--oauth-2-0--and-v2-of-the-twi).

1. In your main X.com account, create a developer account, configure an X App and obtain consumer keys by [following this tutorial](https://developer.x.com/en/docs/tutorials/step-by-step-guide-to-making-your-first-request-to-the-twitter-api-v2)

1. Use the Xauth submodule to generate the authentication tokens for your X.com Bot account. Follow the steps below:

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

*The xauth submodule is modified from: <https://github.com/alkihis/twitter-api-v2-user-oauth-flow-example.git>*

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
