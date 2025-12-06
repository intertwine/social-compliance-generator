![Static Badge](https://img.shields.io/badge/Code_%26_Context-Exclusive-2980B9?labelColor=E67E22)
![Static Badge](https://img.shields.io/badge/AI_Drop-Week_1-2C3E50?labelColor=1ABC9C)

# Social Compliance Generator v2.0

This project is part of [Code & Context](https://codeandcontext.substack.com)'s [AI Drop of the Week](https://codeandcontext.substack.com/p/ai-drop-social-compliance-generator).

This bot posts four times a day to X.com. [See the results here.](https://x.com/intertwine88038)

## Overview

Very often, I feel pressured to create content for social media platforms like X, Facebook, and Instagram.
However, I hate the hassle of posting to those platforms, so I just don't ever get around to it.

This project aims to address this challenge by using AI to generate daily content for social media platforms,
and it gives me a chance to play with various AI APIs and models.

I'm open sourcing the project so you can adapt it and become socially compliant too!

## What's New in v2.0

This version has been completely modernized with 2025 AI tools:

| Component | v1.0 (2024) | v2.0 (2025) |
|-----------|-------------|-------------|
| **Scheduler** | Trigger.dev | GitHub Actions (cron) |
| **Content Source** | Random topic list | Live AI news search (Tavily) |
| **LLM** | Claude Haiku (hardcoded) | OpenRouter (configurable) |
| **Image Generation** | OpenAI DALL-E 3 | Google Nano Banana Pro |
| **Audio Generation** | HuggingFace MusicGen | Built into Sora video |
| **Video Generation** | FFmpeg (image + audio) | OpenAI Sora 2 |
| **X API** | v1.1 + v2 hybrid | OAuth 2.0 only |

## How it Works

A GitHub Actions workflow runs 4 times daily. Upon invocation, it:

1. **Searches for AI news** using [Tavily API](https://tavily.com/) to find the latest AI/ML news
2. **Generates content** using [OpenRouter](https://openrouter.ai/) (configurable LLM) to select the most interesting topic and write a post
3. **Creates an image** using [Google Nano Banana Pro](https://blog.google/technology/ai/nano-banana-pro/) (Gemini 3 Pro Image)
4. **Generates a video** using [OpenAI Sora 2](https://platform.openai.com/docs/guides/video-generation) from the image with synchronized audio
5. **Posts to X** using the [X API v2](https://developer.twitter.com/en/docs/twitter-api) with OAuth 2.0

```text
Tavily (AI news) → OpenRouter LLM (content) → Nano Banana Pro (image)
                                                      ↓
                    X API v2 (post) ← Sora 2 (video with audio)
```

## Prerequisites

You'll need accounts and API keys for:

1. **[OpenRouter](https://openrouter.ai/)** - LLM access (supports 200+ models)
2. **[Tavily](https://tavily.com/)** - AI-powered web search
3. **Google Cloud / Vertex AI** - Gemini image generation (see [Image Generation Setup](#image-generation-setup) below)
4. **[OpenAI Platform](https://platform.openai.com/)** - Sora 2 video generation (requires API access)
5. **[X Developer Portal](https://developer.twitter.com/)** - OAuth 2.0 credentials
6. **[Cloudflare](https://cloudflare.com/)** - KV storage for OAuth refresh tokens
7. **[Cloudflare R2](https://cloudflare.com/)** (Optional) - Object storage for workflow persistence and replay

See [README-AUTH.md](README-AUTH.md) for detailed setup instructions.

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/intertwine/social-compliance-generator.git
cd social-compliance-generator
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Test Locally

```bash
npm run generate
```

### 4. Deploy to GitHub Actions

1. Go to your repository's **Settings → Secrets and variables → Actions**
2. Add the following secrets:
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL` (optional, defaults to `anthropic/claude-sonnet-4.5-20250929`)
   - `TAVILY_API_KEY`
   - `GOOGLE_CLOUD_PROJECT` - Your Google Cloud project ID
   - `GOOGLE_CLOUD_CREDENTIALS` - Service account JSON key (see [Image Generation Setup](#image-generation-setup))
   - `OPENAI_API_KEY`
   - `X_API_CLIENT_ID`
   - `X_API_CLIENT_SECRET`
   - `X_API_ACCESS_TOKEN`
   - `X_API_REFRESH_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
   - `CLOUDFLARE_KV_NAMESPACE_ID` - KV namespace ID for token storage
   - `CLOUDFLARE_KV_API_TOKEN` - API token with KV write permissions
   - `CLOUDFLARE_R2_BUCKET` (optional) - R2 bucket name for workflow storage
   - `CLOUDFLARE_R2_ACCESS_KEY_ID` (optional) - R2 API access key
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY` (optional) - R2 API secret key

3. The workflow will run automatically at 6am, 12pm, 6pm, and midnight UTC
4. You can also trigger it manually from the **Actions** tab

## Project Structure

```text
social-compliance-generator/
├── .github/workflows/
│   └── generate-post.yml      # Cron-triggered GitHub Action
├── src/
│   ├── index.ts               # Main orchestration
│   ├── replay.ts              # Workflow replay utility
│   ├── services/
│   │   ├── search.ts          # Tavily web search
│   │   ├── llm.ts             # OpenRouter LLM
│   │   ├── image.ts           # Google Nano Banana Pro
│   │   ├── video.ts           # OpenAI Sora 2
│   │   ├── x.ts               # X API posting
│   │   ├── token-storage.ts   # Cloudflare KV token storage
│   │   └── workflow-storage.ts # Cloudflare R2 workflow storage
│   └── types/
│       └── workflow.ts        # Workflow data types
├── .env.example               # Environment template
├── package.json
└── tsconfig.json
```

## Customization

### Change the LLM Model

Set `OPENROUTER_MODEL` in your environment to any model from [OpenRouter's catalog](https://openrouter.ai/models):

```bash
OPENROUTER_MODEL=openai/gpt-4o
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
OPENROUTER_MODEL=google/gemini-pro-1.5
```

### Change Post Frequency

Edit `.github/workflows/generate-post.yml` and modify the cron schedule:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  - cron: '0 9 * * *'    # Once daily at 9am UTC
```

### Customize Post Tags

Edit `src/services/x.ts` to change the hashtags and links:

```typescript
const POST_TAGS = ["YourTag1", "YourTag2"];
const POST_LINKS = [
  { title: "Your Link", url: "https://your-url.com" }
];
```

## Image Generation Setup

The image service uses Google's Gemini models (Nano Banana Pro / Gemini 2.5 Flash) with automatic fallback on rate limits.

### Option 1: Vertex AI (Recommended for Production)

Vertex AI provides higher rate limits and better reliability. Required for GitHub Actions.

1. **Create a Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com)

2. **Enable billing** for the project:

   ```bash
   gcloud billing projects link YOUR_PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT
   ```

3. **Enable the Vertex AI API**:

   ```bash
   gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID
   ```

4. **Create a service account**:

   ```bash
   gcloud iam service-accounts create github-vertex-ai \
     --project=YOUR_PROJECT_ID \
     --display-name="GitHub Actions Vertex AI"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-vertex-ai@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

5. **Create and download the key**:

   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-vertex-ai@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

6. **Add to GitHub Secrets**:
   - `GOOGLE_CLOUD_PROJECT`: Your project ID
   - `GOOGLE_CLOUD_CREDENTIALS`: Contents of `key.json`

7. **Delete the local key file**:

   ```bash
   rm key.json
   ```

### Option 2: Gemini Developer API (Local Development)

For local development, you can use the simpler Gemini Developer API:

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Set `GOOGLE_API_KEY` in your `.env` file

Note: The free tier has strict rate limits. For production use, set up Vertex AI.

## Workflow Storage Setup (Optional)

The workflow storage feature uses Cloudflare R2 to persist intermediate results (news search, content, images, videos) from each workflow run. This enables:

- **Replay failed posts**: If X posting fails, you can manually repost later
- **Debugging**: Inspect the full workflow state for any run
- **Audit trail**: Keep a history of all generated content

### Setting Up R2 Storage

1. **Create an R2 bucket** at [Cloudflare Dashboard](https://dash.cloudflare.com/) → R2 → Create bucket

2. **Create an R2 API token**:
   - Go to Dashboard → R2 → Manage R2 API Tokens → Create API token
   - Select "Object Read & Write" permission
   - Apply to your specific bucket or all buckets
   - Copy the Access Key ID and Secret Access Key

3. **Add to your environment** (`.env` for local, GitHub Secrets for Actions):

   ```bash
   CLOUDFLARE_R2_BUCKET=your-bucket-name
   CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
   ```

Note: R2 storage is optional. If not configured, workflows will run normally without persistence.

### Replay Utility

The replay utility allows you to manage workflow runs stored in R2:

```bash
# List recent workflow runs
npm run replay list

# Show details of a specific run
npm run replay show <runId>

# Repost a failed workflow to X
npm run replay post <runId>

# Delete a workflow run from storage
npm run replay delete <runId>
```

Example output from `npm run replay list`:

```text
[OK] run-20241115-103000-abc123
    Started: 2024-11-15T10:30:00.000Z
    Completed: 2024-11-15T10:32:15.000Z
    Topic: OpenAI announces GPT-5
    Post ID: 1234567890 (video)

[FAIL] run-20241115-063000-def456
    Started: 2024-11-15T06:30:00.000Z
    Topic: Google releases Gemini 3
```

## Troubleshooting

### Video generation fails

The Sora 2 API requires explicit invitation from OpenAI. If video generation fails, the system will automatically fall back to posting an image-only post.

### Token refresh errors

Ensure your Cloudflare KV namespace is set up correctly and the API token has write permissions. The initial OAuth tokens should be set in your environment variables (`X_API_ACCESS_TOKEN` and `X_API_REFRESH_TOKEN`).

### Image generation rate limits

The image service automatically falls back from Nano Banana Pro to Gemini 2.5 Flash on rate limit errors. If both fail:

- Verify billing is enabled: `gcloud billing projects describe YOUR_PROJECT_ID`
- Check the error message - `free_tier` means billing isn't properly linked
- Wait a few minutes if you just enabled billing/APIs

### R2 storage errors

If you're seeing R2-related errors:

- Verify all three R2 environment variables are set: `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- Ensure the API token has "Object Read & Write" permissions
- Check that the bucket name matches exactly (case-sensitive)
- R2 storage is optional - workflows will continue without it if not configured

### X video upload issues

The X API v2 video upload uses chunked uploads with dedicated endpoints (as of January 2025):

- **413 Payload Too Large**: Videos are uploaded in 1MB chunks. If you see this error, the chunk size may need adjustment.
- **Invalid media IDs**: After upload, videos need processing time (10-60 seconds depending on size). The system waits automatically.
- **Rate limits**: Free tier has low limits (17 initialize/finalize per 24h, 85 appends). Consider upgrading your X API tier for production use.

Technical details:

- Endpoints: `/2/media/upload/initialize`, `/{id}/append`, `/{id}/finalize`
- Media category: `amplify_video` (required for video uploads)
- Authentication: OAuth 2.0 with `media.write` scope

### Rate limits

OpenRouter and other APIs have rate limits. If you're hitting limits, consider:

- Reducing post frequency
- Using a different LLM model
- Adding retry logic with exponential backoff

## License

MIT

---

For more fun AI projects and tools, subscribe to the [AI Drop of the Week Newsletter](https://codeandcontext.substack.com/p/building-in-public-introducing-ai).
