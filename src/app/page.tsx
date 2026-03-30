"use client";

import { RiDownload2Line } from "@remixicon/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header);
  return m?.[1]?.trim() ?? null;
}

export default function Home() {
  const [pageIdOrUrl, setPageIdOrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = pageIdOrUrl.trim();
    if (!trimmed) {
      setError("Paste a Notion page URL or page ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/notion-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIdOrUrl: trimmed }),
      });

      if (!res.ok) {
        let message = res.statusText || "Request failed";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          /* use statusText */
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        filenameFromContentDisposition(
          res.headers.get("Content-Disposition"),
        ) ?? "notion-images.zip";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div
          className={cn(
            "w-full max-w-lg border border-border bg-card p-8 text-card-foreground shadow-sm",
          )}
        >
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Notion image export
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Downloads images from{" "}
            <strong className="font-medium text-foreground">
              Files &amp; media
            </strong>{" "}
            (and other file properties) plus{" "}
            <strong className="font-medium text-foreground">
              image blocks
            </strong>{" "}
            in the page body as a ZIP via the Notion API (server-side fetches),
            so you avoid browser WebP saves. Create an internal integration,
            connect it to the page, and set{" "}
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs">
              NOTION_INTEGRATION_SECRET
            </code>{" "}
            in{" "}
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs">
              .env.local
            </code>
            .
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="page"
                className="text-xs font-medium text-foreground"
              >
                Page URL or ID
              </label>
              <input
                id="page"
                name="page"
                type="text"
                autoComplete="off"
                placeholder="https://www.notion.so/… or UUID"
                value={pageIdOrUrl}
                onChange={(e) => setPageIdOrUrl(e.target.value)}
                disabled={loading}
                className={cn(
                  "h-9 w-full border border-input bg-background px-2.5 text-sm outline-none",
                  "placeholder:text-muted-foreground",
                  "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={loading}
            >
              <RiDownload2Line className="size-4" aria-hidden />
              {loading ? "Building ZIP…" : "Download images as ZIP"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
