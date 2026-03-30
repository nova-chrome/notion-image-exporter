import { APIResponseError, Client } from "@notionhq/client";
import JSZip from "jszip";
import {
  extensionFromMime,
  extensionFromUrl,
  sanitizeFilenameBase,
  stripTrailingImageExtension,
} from "~/lib/image-file-meta";
import {
  type CollectedImage,
  collectImagesFromPage,
} from "~/lib/notion-collect-images";
import { parseNotionPageId } from "~/lib/notion-page-id";
import { tryCatch } from "~/util/try-catch";

function zipBasenameFromPageId(pageId: string): string {
  const short = pageId.replace(/-/g, "").slice(0, 8);
  return `notion-images-${short}.zip`;
}

function buildEntryBasename(captionPlain: string, index: number): string {
  const trimmed = captionPlain.trim();
  if (trimmed) {
    const base = sanitizeFilenameBase(trimmed);
    if (base !== "image") return base;
  }
  return `image-${String(index + 1).padStart(3, "0")}`;
}

function uniqueZipPath(relativePath: string, used: Set<string>): string {
  if (!used.has(relativePath)) {
    used.add(relativePath);
    return relativePath;
  }
  const lastDot = relativePath.lastIndexOf(".");
  const base = lastDot === -1 ? relativePath : relativePath.slice(0, lastDot);
  const ext = lastDot === -1 ? "" : relativePath.slice(lastDot + 1);
  let n = 2;
  let candidate = ext ? `${base}-${n}.${ext}` : `${base}-${n}`;
  while (used.has(candidate)) {
    n++;
    candidate = ext ? `${base}-${n}.${ext}` : `${base}-${n}`;
  }
  used.add(candidate);
  return candidate;
}

export async function exportNotionImagesZipResponse(input: {
  secret: string;
  pageIdOrUrl: string;
}) {
  const pageId = parseNotionPageId(input.pageIdOrUrl);
  if (!pageId) {
    return Response.json(
      { error: "Could not parse a Notion page ID from that input." },
      { status: 400 },
    );
  }

  const client = new Client({ auth: input.secret });

  const imagesResult = await tryCatch<CollectedImage[], unknown>(
    collectImagesFromPage(client, pageId),
  );
  if (imagesResult.error !== null) {
    const error = imagesResult.error;
    if (APIResponseError.isAPIResponseError(error)) {
      return Response.json(
        { error: error.message, code: error.code },
        {
          status:
            error.status >= 400 && error.status < 600 ? error.status : 502,
        },
      );
    }
    throw error;
  }
  const images = imagesResult.data ?? [];

  if (images.length === 0) {
    return Response.json(
      {
        error:
          "No images found: no Files & media (or other file properties) on this page, and no image blocks in the body (including nested blocks).",
      },
      { status: 404 },
    );
  }

  const zip = new JSZip();
  const usedPaths = new Set<string>();
  const errors: string[] = [];

  for (let i = 0; i < images.length; i += 1) {
    const img = images[i];
    const fetchResult = await tryCatch<Response, unknown>(
      fetch(img.url, {
        redirect: "follow",
        headers: { "User-Agent": "notion-image-exporter/0.1" },
      }),
    );
    if (fetchResult.error !== null) {
      const error = fetchResult.error;
      errors.push(
        `${img.blockId}: fetch failed — ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const res = fetchResult.data;
    if (!res) {
      errors.push(`${img.blockId}: fetch failed — Empty response`);
      continue;
    }

    if (!res.ok) {
      errors.push(`${img.blockId}: HTTP ${res.status}`);
      continue;
    }

    const arrayBuffer = await res.arrayBuffer();
    const mime = res.headers.get("content-type");
    const ext = extensionFromMime(mime) ?? extensionFromUrl(img.url) ?? "bin";

    const rawBase = buildEntryBasename(img.captionPlain, i);
    const withoutExt = stripTrailingImageExtension(rawBase).trim();
    const base = withoutExt || `image-${String(i + 1).padStart(3, "0")}`;
    const relativePath = uniqueZipPath(`${base}.${ext}`, usedPaths);
    zip.file(relativePath, arrayBuffer);
  }

  if (errors.length > 0) {
    zip.file("_fetch-errors.txt", errors.join("\n\n"));
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const addedFiles = Object.keys(zip.files).filter(
    (key) => !zip.files[key]?.dir && key !== "_fetch-errors.txt",
  );
  if (addedFiles.length === 0) {
    return Response.json(
      {
        error:
          "Could not download any images. See details in integration permissions and image URLs.",
        fetchErrors: errors,
      },
      { status: 502 },
    );
  }

  const filename = zipBasenameFromPageId(pageId);
  return new Response(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
