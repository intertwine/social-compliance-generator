# Social Compliance Generator AI

This project is part of Bryan Young's [AI Drop of the Week](https://aidrops.intertwinesys.com/drop/1): Week 1.

This bot posts four times a day to X.com; [see the results here.](https://x.com/intertwine88038)

## Overview

Very often, I feel pressured to create content for social media platforms like X, Facebook, and Instagram.
However, I hate the hassle of posting to those platforms, so I just don't ever get around to it.

This project aims to address this challenge by using AI to generate daily content for social media platforms,
and it gives me a chance to play with various AI APIs and models.

I'm open sourcing the project so you can adapt it and become socially compliant too!

Like all my AI Drop of the Week projects, if it seems like the start of a fun new paid service you'd like to use,
let me know and we will find a way to charge you for it.

Paid susbscribers to the [AI Drop of the Week Newsletter](https://aidrops.intertwinesys.com/subscribe) can access
the live web version of this bot to generate your own custom content.

How it works:

A node.js function is hosted trigger.dev that runs every six hours. Upon invocation, it:

1. [Chooses a random topic](./src/util/topics.ts) from a list of topics
1. [Calls Claude Haiku via API](./src/util/claude.ts) to generate text for a tweet, and prompts for an image and a song.
1. [Passes the image prompt to OpenAI DALL-E](./src/util/openai.ts) to generate an image.
1. [Loads the Meta/Musicgen model from HuggingFace](./src/util/musicgen.ts) and uses it to generate a song based on the song prompt.
1. Uses FFMPEG to [combine the generated image and audio into a video](./src/util/video.ts), and
1. [uploads it](./src/platforms/x.ts) a [bot account on X.com](https://x.com/intertwine88038).

## How To Run Your Own Social Compliance Generator

To get started with this project, follow these steps:

### Prerequisites - Set up Accounts and Auth Tokens

See [README-AUTH.md](README-AUTH.md) for instructions on how to generate authentication tokens for the
social media platforms and APIs used in this project.

1. Create a trigger.dev account and set up a v3 project.
1. Create a Supabase account and storage bucket to store the generated content.
1. Create an Anthropic account and set up an API key for Claude.
1. Create an OpenAI account and set up an API key for DALL-E.
1. Create a Hugging Face account and set up an API key for Facebook/MusicGen.
1. Create a X.com developer account and separate bot account and set up access tokens.

Detailed instructions for each of these steps can be found in [README-AUTH.md](README-AUTH.md).

### Project Setup

1. Clone the repository to your local machine.
1. Install the project dependencies by running `npm install` in the project directory.
1. Setup accounts and environment variables as detailed above.

### Testing the Project Locally

1. Run `npx trigger.dev@beta dev` in your project directory to start the development server.
1. Visit your project dashboard (<https://cloud.trigger.dev/projects/v3/your-project-id>) to view and test your newly created tasks.

## Deploying the Project

1. Set up a github action to deploy the project to trigger.dev.

   - <https://trigger.dev/docs/v3/github-actions#how-to-add-trigger-access-token-in-github>

2. Optionally, setup a schedule to run the task in trigger.dev.

For more fun AI projects and tools, subscribe to the [AI Drop of the Week Newsletter](https://aidrops.intertwinesys.com/subscribe).
