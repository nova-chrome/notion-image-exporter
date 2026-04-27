import Link from "next/link";
import { BrandLogo } from "~/components/brand-logo";
import { ExtensionConnectClient } from "~/components/extension-connect-client";
import { Button } from "~/components/ui/button";
import { requireSession } from "~/lib/session";

export const dynamic = "force-dynamic";

export default async function ExtensionConnectPage() {
  await requireSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 md:px-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="outline" className="w-fit">
          <Link href="/">Back to exporter</Link>
        </Button>
        <div className="flex gap-4">
          <BrandLogo />
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Pair the Chrome extension
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The extension uses this app for saved integrations and ZIP
              exports. Your Notion integration secrets stay encrypted on the
              server.
            </p>
          </div>
        </div>
      </div>

      <ExtensionConnectClient />
    </main>
  );
}
