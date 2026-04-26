"use client";

import { RiFileCopyLine, RiRefreshLine } from "@remixicon/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  errorMessage,
  readJsonBody,
  responseErrorMessage,
} from "~/lib/http-error";
import { tryCatch } from "~/util/try-catch";

type PairingResponse = {
  pairing: {
    code: string;
    expiresAt: string;
  };
};

async function createPairingCode(label: string) {
  const responseResult = await tryCatch(
    fetch("/api/extension/pairing-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    }),
  );
  if (responseResult.error !== null || !responseResult.data) {
    throw new Error("Could not create a pairing code.");
  }

  const response = responseResult.data;
  if (!response.ok) {
    throw new Error(
      await responseErrorMessage(response, "Could not create a pairing code."),
    );
  }

  const bodyResult = await tryCatch(readJsonBody<PairingResponse>(response));
  if (bodyResult.error !== null || !bodyResult.data?.pairing) {
    throw new Error("Could not create a pairing code.");
  }

  return bodyResult.data.pairing;
}

function formatExpiry(expiresAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
  }).format(new Date(expiresAt));
}

export function ExtensionConnectClient() {
  const [label, setLabel] = useState("Chrome extension");
  const [pairing, setPairing] = useState<PairingResponse["pairing"] | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: createPairingCode,
    onSuccess: (result) => {
      setPairing(result);
      setCopied(false);
    },
  });

  async function onCopy() {
    if (!pairing) return;
    await navigator.clipboard.writeText(pairing.code);
    setCopied(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Chrome extension</CardTitle>
        <CardDescription>
          Create a short-lived pairing code, then paste it into the extension
          popup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="extension-label">Device label</Label>
            <Input
              id="extension-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              disabled={mutation.isPending}
            />
          </div>

          <Button
            type="button"
            size="lg"
            onClick={() => mutation.mutate(label.trim() || "Chrome extension")}
            disabled={mutation.isPending}
          >
            <RiRefreshLine data-icon="inline-start" aria-hidden />
            {mutation.isPending ? "Creating code..." : "Create pairing code"}
          </Button>

          {pairing ? (
            <div className="flex flex-col gap-3 border border-border bg-muted p-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pairing-code">Pairing code</Label>
                <Input id="pairing-code" value={pairing.code} readOnly />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Expires at {formatExpiry(pairing.expiresAt)}.
                </p>
                <Button type="button" variant="outline" onClick={onCopy}>
                  <RiFileCopyLine data-icon="inline-start" aria-hidden />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}

          {mutation.isError ? (
            <Alert className="border-destructive/40 bg-destructive/5">
              <AlertTitle>Could not create code</AlertTitle>
              <AlertDescription>
                {errorMessage(
                  mutation.error,
                  "Could not create a pairing code.",
                )}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
