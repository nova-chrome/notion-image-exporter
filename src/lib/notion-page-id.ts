const UUID_WITH_DASHES =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize 32 hex chars to UUID with dashes (Notion API accepts this form). */
function normalize32Hex(hex: string): string {
  const h = hex.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function extractIdFromPathname(pathname: string): string | null {
  const hexOnly = pathname.replace(/[^0-9a-f]/gi, "");
  const match32 = hexOnly.match(/([0-9a-f]{32})$/i);
  if (match32) return normalize32Hex(match32[1]);
  const dashed = pathname.match(UUID_WITH_DASHES);
  if (dashed) return dashed[0].toLowerCase();
  return null;
}

/**
 * Parses a Notion page ID from a raw ID or a notion.so / notion.site URL.
 */
export function parseNotionPageId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (UUID_WITH_DASHES.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^[0-9a-f]{32}$/i.test(trimmed)) {
    return normalize32Hex(trimmed);
  }

  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    const id = extractIdFromPathname(url.pathname);
    if (id) return id;
  } catch {
    return null;
  }

  return null;
}
