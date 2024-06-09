# Social Compliance Generator AI

This project is part of Bryan Young's [AI Creation of the Week Series](https://intertwinesys.com/) - Week 1.

## Overview

Very often, I feel pressured to create content for social media platforms like X, Facebook, and Instagram.
However, I hate the hassle of posting to those platforms, so I just don't ever get around to it.

This project aims to address this challenge by using AI to generate daily content for social media platforms,
and it gives me a chance to play with various AI APIs and models.

I'm open sourcing the project so you can adapt it and become socially compliant too!

Like all my Creation of the Week projects, if it seems like the start of a fun new paid service you'd like to use,
let me know and we will find a way to charge you for it.

The generator uses the following AI models:

- Anthropic Claude - for text generation
- OpenAI DALL-E - for image generation
- Facebook(Xenova) MusicGen - for song generation

The generator uses Supabase Storage to store the generated music content prior to uploading it to social media platforms.

## Getting Started

To get started with this project, follow these steps:

### Prerequisites - Set up Accounts and Auth Tokens

See [README-AUTH.md](README-AUTH.md) for instructions on how to generate authentication tokens for the social media platforms and APIs used in this project.

1. Create a trigger.dev account and set up a v3 project.
1. Create a Supabase account and storage bucket to store the generated content.
1. Create an Anthropic account and set up an API key for Claude.
1. Create an OpenAI account and set up an API key for DALL-E.
1. Create a Hugging Face account and set up an API key for Facebook/MusicGen.
1. Create a Facebook page and set up an access token.

### Project Setup

1. Clone the repository to your local machine.
1. Install the project dependencies by running `npm install` in the project directory.
1. Create an .env file in the project directory and add keys for the following environment variables:
   - `FACEBOOK_ACCESS_TOKEN`: Your Facebook access token.
   - `AWS_ACCESS_KEY_ID`: Your AWS access key ID.
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key.
   - `AWS_REGION`: Your AWS region.
   - `AWS_S3_BUCKET`: Your AWS S3 bucket.
   - `AWS_ENDPOINT`: Your AWS endpoint.
   - `ANTHROPIC_API_KEY`: Your Anthropic API key.
   - `OPENAI_API_KEY`: Your OpenAI API key.
   - `HF_TOKEN`: Your Hugging Face API token.

### Running the Project

1. Run `npx trigger.dev@beta dev` in your project directory to start the development server.
1. Visit your project dashboard (<https://cloud.trigger.dev/projects/v3/your-project-id>) to view and test your newly created tasks.

## APIs Used

- [Anthropic](https://www.anthropic.com/)
- [OpenAI](https://openai.com/)
- [MusicGen](https://huggingface.co/Xenova/musicgen-small)
- [Supabase](https://supabase.com/)
- [AWS S3](https://aws.amazon.com/s3/) - for Supabase storage access

## License

This project is licensed under the MIT License.
