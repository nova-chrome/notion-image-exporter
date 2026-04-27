"use client";

import {
  RiAddLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiFolderKeyholeLine,
  RiPencilLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { SignOutButton } from "~/components/auth-controls";
import { BrandLogo } from "~/components/brand-logo";
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
import { errorMessage } from "~/lib/http-error";
import {
  createIntegrationRequest,
  deleteIntegrationRequest,
  exportImagesRequest,
  integrationListQueryKey,
  integrationListQueryOptions,
  renameIntegrationRequest,
} from "~/lib/integration-queries";
import type { IntegrationSummary } from "~/lib/notion-integrations";
import { downloadBlob } from "~/util/download-blob";

type DashboardClientProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

function formatDate(value: string | null) {
  if (!value) return "Never used";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DashboardClient({ user }: DashboardClientProps) {
  const queryClient = useQueryClient();
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [pageIdOrUrl, setPageIdOrUrl] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<IntegrationSummary | null>(
    null,
  );
  const [createLabel, setCreateLabel] = useState("");
  const [createSecret, setCreateSecret] = useState("");
  const [renameLabel, setRenameLabel] = useState("");
  const integrationsQuery = useQuery(integrationListQueryOptions());
  const integrations = integrationsQuery.data ?? [];

  async function invalidateIntegrations() {
    await queryClient.invalidateQueries({ queryKey: integrationListQueryKey });
  }

  const createIntegrationMutation = useMutation({
    mutationFn: createIntegrationRequest,
    onMutate: () => {
      setMutationError(null);
    },
    onSuccess: async () => {
      setCreateOpen(false);
      setCreateLabel("");
      setCreateSecret("");
      await invalidateIntegrations();
    },
    onError: (error) => {
      setMutationError(errorMessage(error, "Request failed."));
    },
  });

  const renameIntegrationMutation = useMutation({
    mutationFn: renameIntegrationRequest,
    onMutate: () => {
      setMutationError(null);
    },
    onSuccess: async () => {
      setRenameOpen(false);
      setRenameTarget(null);
      setRenameLabel("");
      await invalidateIntegrations();
    },
    onError: (error) => {
      setMutationError(errorMessage(error, "Request failed."));
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: deleteIntegrationRequest,
    onMutate: () => {
      setMutationError(null);
    },
    onSuccess: async () => {
      await invalidateIntegrations();
    },
    onError: (error) => {
      setMutationError(errorMessage(error, "Request failed."));
    },
  });

  const exportMutation = useMutation({
    mutationFn: exportImagesRequest,
    onMutate: () => {
      setExportError(null);
    },
    onSuccess: async (result) => {
      downloadBlob(result);
      await invalidateIntegrations();
    },
    onError: (error) => {
      setExportError(errorMessage(error, "Something went wrong."));
    },
  });

  const mutationPending =
    createIntegrationMutation.isPending ||
    renameIntegrationMutation.isPending ||
    deleteIntegrationMutation.isPending;

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

    await exportMutation.mutateAsync({
      pageIdOrUrl: trimmed,
      integrationId: selectedIntegrationId,
    });
  }

  async function onCreateIntegration(event: FormEvent) {
    event.preventDefault();

    await createIntegrationMutation.mutateAsync({
      label: createLabel.trim(),
      secret: createSecret.trim(),
    });
  }

  async function onRenameIntegration(event: FormEvent) {
    event.preventDefault();
    if (!renameTarget) return;

    await renameIntegrationMutation.mutateAsync({
      integrationId: renameTarget.id,
      label: renameLabel.trim(),
    });
  }

  async function onDeleteIntegration(integrationId: string) {
    await deleteIntegrationMutation.mutateAsync(integrationId);
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
          <div className="flex gap-4">
            <BrandLogo className="mt-1" />
            <div className="flex flex-col gap-3">
              <Badge variant="secondary" className="w-fit">
                Private Workspace
              </Badge>
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
            <Button asChild size="lg" variant="outline">
              <Link href="/extension/connect">
                <RiShieldKeyholeLine data-icon="inline-start" aria-hidden />
                Connect extension
              </Link>
            </Button>
            <SignOutButton />
          </div>
        </section>

        {integrationsQuery.isError ? (
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTitle>Could not load integrations</AlertTitle>
            <AlertDescription>
              {errorMessage(
                integrationsQuery.error,
                "Could not load saved integrations.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

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
                {integrationsQuery.isPending ? (
                  <p className="text-sm text-muted-foreground">
                    Loading saved integrations…
                  </p>
                ) : integrations.length === 0 ? (
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
                          disabled={exportMutation.isPending}
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
                      <Button
                        type="submit"
                        size="lg"
                        disabled={exportMutation.isPending}
                      >
                        <RiDownload2Line data-icon="inline-start" aria-hidden />
                        {exportMutation.isPending
                          ? "Building ZIP…"
                          : "Download images"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            {integrationsQuery.isPending ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Loading saved integrations…
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {integrations.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <RiFolderKeyholeLine aria-hidden />
                      </EmptyMedia>
                      <EmptyTitle>No saved integrations</EmptyTitle>
                      <EmptyDescription>
                        Add as many Notion internal integrations as you need,
                        then switch between accounts per export.
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
                              onClick={() =>
                                onDeleteIntegration(integration.id)
                              }
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
            )}
          </TabsContent>
        </Tabs>

        <Dialog
          open={renameOpen}
          onOpenChange={(open) => {
            setRenameOpen(open);
            if (!open) {
              setRenameTarget(null);
            }
          }}
        >
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
