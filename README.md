# Script → Video Pipeline

Turn voiceover scripts into cinematic Veo 3.1 video prompts — and auto-submit them to Google Vertex AI for generation.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app opens automatically at **http://localhost:3000**

## How It Works

1. **Paste your script** — each sentence becomes a scene
2. **Choose a visual style** — presets, custom description, or analyze a YouTube video's look
3. **Generate** — Claude writes tailored Veo 3.1 prompts for every scene
4. **Auto-submit** — if connected to Vertex AI, prompts are sent to Veo automatically
5. **Export** — download as Word, PDF, or JSON

## Setup: Vertex AI (for video generation)

Click **⚙ Connect** in the app header and choose:

### Option A: Google Sign-In (recommended)
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** → Web application
3. Add `http://localhost:3000` to **Authorized JavaScript origins**
4. Copy the Client ID into the app
5. Make sure the **Vertex AI API** is enabled on your project

### Option B: Manual Token
```bash
gcloud auth print-access-token
```
Paste the token into the app. Expires after ~60 minutes.

### Both options need:
- **Project ID** — your GCP project
- **Location** — `us-central1` (default), `europe-west4`, or `asia-northeast1`
- **Veo Model** — Veo 3.1 Preview (default) or GA variants

## Setup: YouTube Style Analysis (optional)

The "▶ Match a Video" style preset lets you upload screenshots from any video and Claude extracts the exact visual language. To also pull the video's title/tags/description for richer analysis:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **YouTube Data API v3**
3. Create an **API Key** under Credentials
4. Paste it in the YouTube analysis section

This is optional — the visual analysis works from screenshots alone.

## Features

- **8 style presets** + custom text + YouTube video matching
- **Art style reference images** — upload up to 3 images to guide the visual direction
- **Negative prompts** — sent directly to the Veo API
- **Per-scene controls** — edit, regenerate, reorder, retry
- **Batch Veo submission** with async polling
- **OAuth auto-refresh** — token stays fresh during long generation runs
- **Export** — Word (.doc), PDF, JSON — zero external dependencies

## Build for Production

```bash
npm run build
```

Output in `dist/` — deploy to any static host (Vercel, Netlify, Cloudflare Pages, etc.)

## Tech Stack

- **React 18** + Vite
- **Claude API** (Sonnet 4) — prompt generation + YouTube style analysis
- **Vertex AI API** — Veo 3.1 video generation
- **Google Identity Services** — OAuth 2.0
- Zero runtime dependencies beyond React
