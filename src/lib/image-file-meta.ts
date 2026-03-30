const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/tiff": "tif",
  "image/x-icon": "ico",
  "image/heic": "heic",
  "image/avif": "avif",
};

export function extensionFromMime(mime: string | null): string | undefined {
  if (!mime) return undefined;
  const base = mime.split(";")[0].trim().toLowerCase();
  return MIME_TO_EXT[base];
}

export function extensionFromUrl(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    const seg = pathname.split("/").pop() ?? "";
    const dot = seg.lastIndexOf(".");
    if (dot === -1) return undefined;
    const ext = seg.slice(dot + 1).toLowerCase();
    if (/^[a-z0-9]{2,5}$/.test(ext)) return ext;
  } catch {
    return undefined;
  }
  return undefined;
}

export function sanitizeFilenameBase(name: string): string {
  const s = name
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return s || "image";
}

/** Drop one trailing image extension so we do not produce names like `photo.jpeg.jpg`. */
export function stripTrailingImageExtension(name: string): string {
  return name.replace(
    /\.(jpe?g|png|gif|webp|svg|bmp|tiff?|ico|heic|avif|apng)$/i,
    "",
  );
}
