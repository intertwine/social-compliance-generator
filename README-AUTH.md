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

### Trigger.dev

Used to schedule and host the generation task.

1. [Create a trigger.dev account](https://cloud.trigger.dev/login) and set up a v3 project.
    - Quickstart Docs: <https://trigger.dev/docs/v3/quick-start>

### Anthropic

Used to generate text content.

1. [Create an Anthropic Claude account](https://claude.ai/login)
1. Set up an API key for Claude and update this key in your .env file:
    - `ANTHROPIC_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### OpenAI

Used to generate text content and images.

1. [Create an OpenAI account](https://platform.openai.com/account/api-keys)
1. Set up an API key for OpenAI and update this key in your .env file:
    - `OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Hugging Face

Used to download the musicgen model and run inference on it.

1. [Create an Hugging Face account](https://huggingface.co/login)
1. [Set up an API key for Hugging Face](https://huggingface.co/settings/tokens) and update this key in your .env file:
    - `HF_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Supabase

1. Set up a Supabase account and create a new project.
1. Create a storage bucket in Supabase called "social-compliance-generator" and make sure it is public.
1. Add the following storage S3 Connection environment variables to your .env file (found on the Supabase Storage Settings page):

```shell
SUPABASE_AWS_S3_ACCESS_KEY_ID=<your-supabase-s3-access-key-id>
SUPABASE_AWS_S3_SECRET=<your-supabase-s3-secret-key>
SUPABASE_AWS_S3_REGION=<your-supabase-s3-region>
SUPABASE_AWS_S3_ENDPOINT=<your-supabase-s3-endpoint>
```

1. Add the following database environment variables to your .env file (found on the Supabase project settings page):

```shell
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
```

1. From a terminal in the project directory, run the following commands to login to Supabase:

```shell
> supabase login
```

1. Run the following command to create a new Supabase table called "xrefresh" with columns id, updated_at, and token:

```shell
> supabase table create xrefresh --column id:integer --column updated_at:timestamptz --column token:text
```

1. Run the following command in the project directory to generate types for the Supabase table:

```shell
> supabase login
> npm run generate-types
```
