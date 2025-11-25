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

```
Tavily (AI news) → OpenRouter LLM (content) → Nano Banana Pro (image)
                                                      ↓
                    X API v2 (post) ← Sora 2 (video with audio)
```

## Prerequisites

You'll need accounts and API keys for:

1. **[OpenRouter](https://openrouter.ai/)** - LLM access (supports 200+ models)
2. **[Tavily](https://tavily.com/)** - AI-powered web search
3. **[Google AI Studio](https://aistudio.google.com/)** - Nano Banana Pro image generation
4. **[OpenAI Platform](https://platform.openai.com/)** - Sora 2 video generation (requires API access)
5. **[X Developer Portal](https://developer.twitter.com/)** - OAuth 2.0 credentials
6. **[Supabase](https://supabase.com/)** - Token storage for OAuth refresh

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
   - `OPENROUTER_MODEL` (optional, defaults to `anthropic/claude-sonnet-4-20250514`)
   - `TAVILY_API_KEY`
   - `GOOGLE_API_KEY`
   - `OPENAI_API_KEY`
   - `X_API_CLIENT_ID`
   - `X_API_CLIENT_SECRET`
   - `X_API_ACCESS_TOKEN`
   - `X_API_REFRESH_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

3. The workflow will run automatically at 6am, 12pm, 6pm, and midnight UTC
4. You can also trigger it manually from the **Actions** tab

## Project Structure

```
social-compliance-generator/
├── .github/workflows/
│   └── generate-post.yml      # Cron-triggered GitHub Action
├── src/
│   ├── index.ts               # Main orchestration
│   └── services/
│       ├── search.ts          # Tavily web search
│       ├── llm.ts             # OpenRouter LLM
│       ├── image.ts           # Google Nano Banana Pro
│       ├── video.ts           # OpenAI Sora 2
│       ├── x.ts               # X API posting
│       └── supabase.ts        # Token storage
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

## Troubleshooting

### Video generation fails

The Sora 2 API requires explicit invitation from OpenAI. If video generation fails, the system will automatically fall back to posting an image-only post.

### Token refresh errors

Ensure your Supabase `xrefresh` table exists with columns `id` (int) and `token` (text). The initial OAuth tokens should be set in your environment variables.

### Rate limits

OpenRouter and other APIs have rate limits. If you're hitting limits, consider:
- Reducing post frequency
- Using a different LLM model
- Adding retry logic with exponential backoff

## License

MIT

---

For more fun AI projects and tools, subscribe to the [AI Drop of the Week Newsletter](https://codeandcontext.substack.com/p/building-in-public-introducing-ai).
