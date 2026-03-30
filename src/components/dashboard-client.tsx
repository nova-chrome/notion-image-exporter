"use client";

import {
  RiAddLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiFolderKeyholeLine,
  RiPencilLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { SignOutButton } from "~/components/auth-controls";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  errorMessage,
  readJsonBody,
  responseErrorMessage,
} from "~/lib/http-error";
import { tryCatch } from "~/util/try-catch";

type IntegrationSummary = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

type DashboardClientProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  integrations: IntegrationSummary[];
};

function formatDate(value: string | null) {
  if (!value) return "Never used";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

export function DashboardClient({ user, integrations }: DashboardClientProps) {
  const router = useRouter();
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(
    integrations[0]?.id ?? "",
  );
  const [pageIdOrUrl, setPageIdOrUrl] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportPending, setExportPending] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<IntegrationSummary | null>(
    null,
  );
  const [createLabel, setCreateLabel] = useState("");
  const [createSecret, setCreateSecret] = useState("");
  const [renameLabel, setRenameLabel] = useState("");
  const [mutationPending, setMutationPending] = useState(false);

  useEffect(() => {
    if (integrations.length === 0) {
      setSelectedIntegrationId("");
      return;
    }

    const stillExists = integrations.some(
      (integration) => integration.id === selectedIntegrationId,
    );

    if (!stillExists) {
      setSelectedIntegrationId(integrations[0]?.id ?? "");
    }
  }, [integrations, selectedIntegrationId]);

  async function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function runAsyncAction(input: {
    setError: (message: string | null) => void;
    setPending: (pending: boolean) => void;
    fallbackMessage: string;
    action: () => Promise<void>;
  }) {
    input.setError(null);
    input.setPending(true);

    const result = await tryCatch(input.action());
    if (result.error !== null) {
      input.setError(errorMessage(result.error, input.fallbackMessage));
    }

    input.setPending(false);
    return result.error === null;
  }

  async function submitJson(input: {
    url: string;
    method: "POST" | "PATCH" | "DELETE";
    body?: Record<string, string>;
  }) {
    const res = await fetch(input.url, {
      method: input.method,
      headers: input.body ? { "Content-Type": "application/json" } : undefined,
      body: input.body ? JSON.stringify(input.body) : undefined,
    });

    if (!res.ok) {
      throw new Error(await responseErrorMessage(res, "Request failed"));
    }

    return readJsonBody(res);
  }

  async function onExportSubmit(event: FormEvent) {
    event.preventDefault();
    setExportError(null);

    if (!selectedIntegrationId) {
      setExportError("Choose a saved integration first.");
      return;
    }

    const trimmed = pageIdOrUrl.trim();
    if (!trimmed) {
      setExportError("Paste a Notion page URL or page ID.");
      return;
    }

    await runAsyncAction({
      setError: setExportError,
      setPending: setExportPending,
      fallbackMessage: "Something went wrong.",
      action: async () => {
        const res = await fetch("/api/notion-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageIdOrUrl: trimmed,
            integrationId: selectedIntegrationId,
          }),
        });

        if (!res.ok) {
          setExportError(await responseErrorMessage(res, "Export failed"));
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download =
          filenameFromContentDisposition(
            res.headers.get("Content-Disposition"),
          ) ?? "notion-images.zip";
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        await refresh();
      },
    });
  }

  async function onCreateIntegration(event: FormEvent) {
    event.preventDefault();
    await runAsyncAction({
      setError: setMutationError,
      setPending: setMutationPending,
      fallbackMessage: "Request failed",
      action: async () => {
        await submitJson({
          url: "/api/notion-integrations",
          method: "POST",
          body: {
            label: createLabel.trim(),
            secret: createSecret.trim(),
          },
        });
        setCreateOpen(false);
        setCreateLabel("");
        setCreateSecret("");
        await refresh();
      },
    });
  }

  async function onRenameIntegration(event: FormEvent) {
    event.preventDefault();
    if (!renameTarget) return;

    await runAsyncAction({
      setError: setMutationError,
      setPending: setMutationPending,
      fallbackMessage: "Request failed",
      action: async () => {
        await submitJson({
          url: `/api/notion-integrations/${renameTarget.id}`,
          method: "PATCH",
          body: {
            label: renameLabel.trim(),
          },
        });
        setRenameOpen(false);
        setRenameTarget(null);
        setRenameLabel("");
        await refresh();
      },
    });
  }

  async function onDeleteIntegration(integrationId: string) {
    await runAsyncAction({
      setError: setMutationError,
      setPending: setMutationPending,
      fallbackMessage: "Request failed",
      action: async () => {
        await submitJson({
          url: `/api/notion-integrations/${integrationId}`,
          method: "DELETE",
        });
        await refresh();
      },
    });
  }

  function openRenameDialog(integration: IntegrationSummary) {
    setRenameTarget(integration);
    setRenameLabel(integration.label);
    setRenameOpen(true);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 md:px-6">
        <section className="grid gap-4 border border-border bg-card p-6 md:grid-cols-[1.4fr_0.6fr] md:items-end">
          <div className="flex flex-col gap-3">
            <Badge variant="secondary">Private Workspace</Badge>
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                Export with the right Notion account every time.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Signed in as{" "}
                <span className="text-foreground">{user.email}</span>. Save
                multiple Notion integrations, switch between them per export,
                and keep the secrets server-side.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-start gap-3 md:justify-end">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="lg">
                  <RiAddLine data-icon="inline-start" aria-hidden />
                  Add integration
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a Notion integration</DialogTitle>
                  <DialogDescription>
                    Save an internal integration secret under a label you can
                    reuse.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="flex flex-col gap-5 p-5"
                  autoComplete="off"
                  onSubmit={onCreateIntegration}
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="create-label">Label</Label>
                    <Input
                      id="create-label"
                      name="notionIntegrationLabel"
                      value={createLabel}
                      onChange={(event) => setCreateLabel(event.target.value)}
                      placeholder="Personal workspace"
                      autoComplete="off"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      disabled={mutationPending}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="create-secret">Integration secret</Label>
                    <Input
                      id="create-secret"
                      name="notionIntegrationSecret"
                      type="password"
                      value={createSecret}
                      onChange={(event) => setCreateSecret(event.target.value)}
                      placeholder="ntn_..."
                      autoComplete="new-password"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      disabled={mutationPending}
                    />
                  </div>
                  <DialogFooter className="p-0 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      disabled={mutationPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={mutationPending}>
                      {mutationPending ? "Saving…" : "Save integration"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <SignOutButton />
          </div>
        </section>

        {mutationError ? (
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTitle>Integration update failed</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="export">
          <TabsList>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Download page images as ZIP</CardTitle>
                <CardDescription>
                  Pick a saved integration, paste a page URL or ID, and export
                  without swapping env vars.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {integrations.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <RiShieldKeyholeLine aria-hidden />
                      </EmptyMedia>
                      <EmptyTitle>No integration connected yet</EmptyTitle>
                      <EmptyDescription>
                        Add a Notion integration first. The app validates it on
                        the server and stores the secret encrypted at rest.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button type="button" onClick={() => setCreateOpen(true)}>
                        <RiAddLine data-icon="inline-start" aria-hidden />
                        Add integration
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <form
                    className="flex flex-col gap-5"
                    onSubmit={onExportSubmit}
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="integration">Saved integration</Label>
                        <Select
                          value={selectedIntegrationId}
                          onValueChange={setSelectedIntegrationId}
                        >
                          <SelectTrigger id="integration">
                            <SelectValue placeholder="Choose an integration" />
                          </SelectTrigger>
                          <SelectContent>
                            {integrations.map((integration) => (
                              <SelectItem
                                key={integration.id}
                                value={integration.id}
                              >
                                {integration.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="page">Page URL or ID</Label>
                        <Input
                          id="page"
                          value={pageIdOrUrl}
                          onChange={(event) =>
                            setPageIdOrUrl(event.target.value)
                          }
                          placeholder="https://www.notion.so/... or UUID"
                          disabled={exportPending}
                        />
                      </div>
                    </div>

                    {exportError ? (
                      <Alert className="border-destructive/40 bg-destructive/5">
                        <AlertTitle>Export failed</AlertTitle>
                        <AlertDescription>{exportError}</AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
                      <p className="text-sm text-muted-foreground">
                        The selected integration stays server-side. Only the ZIP
                        is sent back.
                      </p>
                      <Button type="submit" size="lg" disabled={exportPending}>
                        <RiDownload2Line data-icon="inline-start" aria-hidden />
                        {exportPending ? "Building ZIP…" : "Download images"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="grid gap-4">
              {integrations.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia>
                      <RiFolderKeyholeLine aria-hidden />
                    </EmptyMedia>
                    <EmptyTitle>No saved integrations</EmptyTitle>
                    <EmptyDescription>
                      Add as many Notion internal integrations as you need, then
                      switch between accounts per export.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button type="button" onClick={() => setCreateOpen(true)}>
                      <RiAddLine data-icon="inline-start" aria-hidden />
                      Add your first integration
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                integrations.map((integration) => (
                  <Card key={integration.id}>
                    <CardHeader>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex flex-col gap-2">
                          <CardTitle>{integration.label}</CardTitle>
                          <CardDescription>
                            Last used {formatDate(integration.lastUsedAt)}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openRenameDialog(integration)}
                            disabled={mutationPending}
                          >
                            <RiPencilLine
                              data-icon="inline-start"
                              aria-hidden
                            />
                            Rename
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => onDeleteIntegration(integration.id)}
                            disabled={mutationPending}
                          >
                            <RiDeleteBinLine
                              data-icon="inline-start"
                              aria-hidden
                            />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                      <p>Created {formatDate(integration.createdAt)}</p>
                      <p>Updated {formatDate(integration.updatedAt)}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename integration</DialogTitle>
              <DialogDescription>
                Update the saved label without re-entering the secret.
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-5 p-5"
              onSubmit={onRenameIntegration}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="rename-label">Label</Label>
                <Input
                  id="rename-label"
                  value={renameLabel}
                  onChange={(event) => setRenameLabel(event.target.value)}
                  placeholder="Production workspace"
                  disabled={mutationPending}
                />
              </div>
              <DialogFooter className="p-0 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRenameOpen(false)}
                  disabled={mutationPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutationPending}>
                  {mutationPending ? "Saving…" : "Save label"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
