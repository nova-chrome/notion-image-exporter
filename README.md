# Notion image exporter

Small [Next.js](https://nextjs.org) app that collects images from **Files & media** (and any other **`files` page properties**) and from **image blocks** in the page body (including nested blocks), fetches each URL **on the server**, and returns a **ZIP** download. That avoids saving through the browser, where Notion often serves **WebP** or other optimized formats.

## Setup

### 1. Create a Notion internal integration

1. Open [My integrations](https://www.notion.so/my-integrations).
2. Create a new integration (internal).
3. Copy the **Internal Integration Secret**.

### 2. Connect the integration to the page

Open the Notion page → **⋯** (top right) → **Connections** / **Add connections** → pick your integration. Without this, the API returns forbidden / not found.

### 3. Configure the app

```bash
cp .env.example .env.local
```

Set `NOTION_INTEGRATION_SECRET` in `.env.local` to the secret from step 1.

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste the **page URL** or **page ID**, then **Download images as ZIP**.

## How it works

- **POST** [`/api/notion-images`](src/app/api/notion-images/route.ts) accepts JSON `{ "pageIdOrUrl": "…" }`.
- The server parses the page ID, reads **`files` properties** (e.g. Files & media) from the page, walks **block children** recursively for `image` blocks, downloads each URL, and builds a ZIP.
- Failed downloads are listed in `_fetch-errors.txt` inside the ZIP when some images could not be fetched.
- File extensions come from `Content-Type` when possible, with a fallback from the URL path.

## Limitations

- Notion file URLs expire; the app fetches images immediately after listing blocks.
- The bytes you get are whatever Notion serves for that API URL; if Notion stores or transcodes an asset in a given format, that is what you will download.
- **Page cover** and **icon** are not included unless you extend the code. Inline embeds/previews are not scraped beyond **image** blocks and **files** properties.

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Development server |
| `npm run build` | Production build  |
| `npm run start` | Start production  |
| `npm run lint`  | Biome check       |
