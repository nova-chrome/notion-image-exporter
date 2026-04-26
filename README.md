# Notion Image Exporter

A small [Next.js](https://nextjs.org) app that downloads images from a Notion page (from **Files & media** and any `files` page properties, plus **`image` blocks** in the body, including nested blocks), fetches each image URL **on the server**, and returns them as a **ZIP**.

This avoids browser-side saves where Notion often serves optimized formats like **WebP**.

## What it downloads

- Images from **Files & media** (and any other `files` properties)
- Images from **`image` blocks** in the page body, including nested blocks
- A ZIP containing the downloaded images (plus `_fetch-errors.txt` when some URLs fail)

## Quickstart

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

Fill in the required values from `.env.example`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `NOTION_INTEGRATION_ENCRYPTION_KEY`

The Notion integration secret from step 1 is entered in the app UI after sign-in and stored encrypted in the database.

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste the **page URL** or **page ID**, then **Download images as ZIP**.

## How it works

- The homepage sends a `POST` to [`/api/notion-images`](src/app/api/notion-images/route.ts) with JSON `{ "pageIdOrUrl": "..." }`.
- The server parses the page ID, collects `files` properties (including **Files & media**) and recursively walks block children for `image` blocks.
- It downloads each image URL on the server and stores the bytes in a ZIP.
- If some downloads fail, the ZIP includes `_fetch-errors.txt` listing the failures.
- File extensions are picked from `Content-Type` when possible, otherwise from the URL path (final fallback: `bin`).

## Chrome extension

This repo includes a companion Manifest V3 extension in [`extension`](extension).
It keeps Notion integration secrets in the app database and uses an extension
token only to call the app API.

1. Run the app and push the latest schema:

   ```bash
   npm run db:push
   npm run dev
   ```

2. Open Chrome → Extensions → Developer mode → Load unpacked → select the
   `extension` folder.
3. In the extension popup, confirm the app URL (`http://localhost:3000` by
   default), then choose **Open pairing page**.
4. Create and copy a pairing code from the app, paste it into the extension,
   and pair.
5. Open a Notion page and use the extension popup to download the ZIP.

For production, set the extension popup’s app URL to your deployed app URL. The
extension is intentionally broad on host permissions so local and deployed app
URLs both work while this is still a private tool.

## ZIP contents

- Each downloaded image is stored as its own entry in the ZIP.
- The entry base name is derived from the source caption/name when available; otherwise it falls back to `image-001`, `image-002`, etc.
- If names would collide, it appends `-2`, `-3`, ... to keep entries unique.

## Limitations

- Notion file URLs can expire; downloads happen immediately after collecting the image URLs.
- The bytes you download are whatever Notion serves for those URLs (so the format depends on what Notion provides/transcodes).
- Page cover and icon are not included unless you extend the code.
- The exporter targets only `image` blocks and `files` properties (it does not scrape other embeds/previews).

## Troubleshooting

- `Invalid environment variables`: copy `.env.example` to `.env.local` and fill in every required value.
- “No images found”: the page doesn’t have any `files` properties (including “Files & media”) and/or no `image` blocks in its body.
- “Could not download any images” (HTTP 502): usually integration permission issues or image URLs that have expired; try exporting right after connecting the integration, and make sure the integration is connected to the page.

## Development scripts

| Command         | Description        |
| --------------  | ------------------ |
| `npm run dev`   | Development server |
| `npm run build` | Production build   |
| `npm run start` | Start production   |
| `npm run format`| Format code        |
| `npm run lint`  | Biome check        |
