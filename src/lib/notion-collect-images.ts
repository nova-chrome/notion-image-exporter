import type {
  BlockObjectResponse,
  ImageBlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";
import { type Client, isFullBlock, isFullPage } from "@notionhq/client";

/** Notion `files` property row (uploaded file or external URL + display name). */
type FilesPropertyFileItem = {
  type: "file" | "external";
  name: string;
  file?: { url: string };
  external?: { url: string };
};

export type CollectedImage = {
  url: string;
  captionPlain: string;
  blockId: string;
};

function richTextToPlain(richText: RichTextItemResponse[] | undefined): string {
  if (!richText?.length) return "";
  return richText.map((t) => t.plain_text).join("");
}

function imageBlockUrl(block: ImageBlockObjectResponse): string | null {
  const { image } = block;
  if (image.type === "file") return image.file.url;
  if (image.type === "external") return image.external.url;
  return null;
}

function fileUrlFromPropertyItem(item: FilesPropertyFileItem): string | null {
  if (item.type === "file") return item.file?.url ?? null;
  if (item.type === "external") return item.external?.url ?? null;
  return null;
}

/** Files uploaded to "Files & media" (and other `files` properties) on the page. */
async function collectFilesFromPageProperties(
  client: Client,
  pageId: string,
): Promise<CollectedImage[]> {
  const page = await client.pages.retrieve({ page_id: pageId });
  if (!isFullPage(page)) return [];

  const out: CollectedImage[] = [];
  for (const [propName, prop] of Object.entries(page.properties)) {
    if (prop.type !== "files") continue;
    for (let i = 0; i < prop.files.length; i++) {
      const item = prop.files[i];
      const url = fileUrlFromPropertyItem(item);
      if (!url) continue;
      const baseName = item.name?.trim() || `${propName}-${i + 1}`;
      out.push({
        url,
        captionPlain: baseName,
        blockId: `property:${propName}:${i}`,
      });
    }
  }
  return out;
}

async function listChildrenPage(
  client: Client,
  blockId: string,
): Promise<BlockObjectResponse[]> {
  const out: BlockObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const res = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });
    for (const block of res.results) {
      if (isFullBlock(block)) out.push(block);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return out;
}

async function walkBlocks(
  client: Client,
  blockId: string,
  images: CollectedImage[],
): Promise<void> {
  const blocks = await listChildrenPage(client, blockId);
  for (const block of blocks) {
    if (block.in_trash) continue;

    if (block.type === "image") {
      const url = imageBlockUrl(block);
      if (url) {
        images.push({
          url,
          captionPlain: richTextToPlain(block.image.caption),
          blockId: block.id,
        });
      }
    }

    if (block.has_children) {
      await walkBlocks(client, block.id, images);
    }
  }
}

/**
 * Collects image URLs from:
 * - **Files & media** and any other `files` page properties
 * - **Image blocks** in the page body (including nested under toggles, columns, etc.)
 */
export async function collectImagesFromPage(
  client: Client,
  pageId: string,
): Promise<CollectedImage[]> {
  const fromProperties = await collectFilesFromPageProperties(client, pageId);
  const fromBlocks: CollectedImage[] = [];
  await walkBlocks(client, pageId, fromBlocks);
  return [...fromProperties, ...fromBlocks];
}
