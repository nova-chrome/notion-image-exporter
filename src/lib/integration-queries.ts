import { queryOptions } from "@tanstack/react-query";
import { readJsonBody, responseErrorMessage } from "~/lib/http-error";
import type { IntegrationSummary } from "~/lib/notion-integrations";
import { tryCatch } from "~/util/try-catch";

type IntegrationsResponse = {
  integrations: IntegrationSummary[];
};

type CreateIntegrationInput = {
  label: string;
  secret: string;
};

type RenameIntegrationInput = {
  integrationId: string;
  label: string;
};

type ExportImagesInput = {
  integrationId: string;
  pageIdOrUrl: string;
};

type ExportImagesResult = {
  blob: Blob;
  filename: string;
};

export const integrationListQueryKey = ["notion-integrations"] as const;

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

async function submitJson<T>(input: {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: Record<string, string>;
}) {
  const responseResult = await tryCatch(
    fetch(input.url, {
      method: input.method,
      headers: input.body ? { "Content-Type": "application/json" } : undefined,
      body: input.body ? JSON.stringify(input.body) : undefined,
    }),
  );
  if (responseResult.error !== null || !responseResult.data) {
    throw new Error("Request failed.");
  }

  const response = responseResult.data;

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Request failed."));
  }

  const bodyResult = await tryCatch(readJsonBody<T>(response));
  if (bodyResult.error !== null) {
    throw new Error("Request failed.");
  }

  return bodyResult.data;
}

export function integrationListQueryOptions() {
  return queryOptions({
    queryKey: integrationListQueryKey,
    queryFn: async () => {
      const responseResult = await tryCatch(
        fetch("/api/notion-integrations", {
          method: "GET",
        }),
      );
      if (responseResult.error !== null || !responseResult.data) {
        throw new Error("Could not load saved integrations.");
      }

      const response = responseResult.data;

      if (!response.ok) {
        throw new Error(
          await responseErrorMessage(
            response,
            "Could not load saved integrations.",
          ),
        );
      }

      const bodyResult = await tryCatch(
        readJsonBody<IntegrationsResponse>(response),
      );
      if (bodyResult.error !== null) {
        throw new Error("Could not load saved integrations.");
      }

      const body = bodyResult.data;
      return body?.integrations ?? [];
    },
  });
}

export async function createIntegrationRequest(input: CreateIntegrationInput) {
  return submitJson<{ integration: IntegrationSummary | null }>({
    url: "/api/notion-integrations",
    method: "POST",
    body: {
      label: input.label,
      secret: input.secret,
    },
  });
}

export async function renameIntegrationRequest(input: RenameIntegrationInput) {
  return submitJson<{ integration: IntegrationSummary | null }>({
    url: `/api/notion-integrations/${input.integrationId}`,
    method: "PATCH",
    body: {
      label: input.label,
    },
  });
}

export async function deleteIntegrationRequest(integrationId: string) {
  return submitJson<{ ok: boolean }>({
    url: `/api/notion-integrations/${integrationId}`,
    method: "DELETE",
  });
}

export async function exportImagesRequest(
  input: ExportImagesInput,
): Promise<ExportImagesResult> {
  const responseResult = await tryCatch(
    fetch("/api/notion-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  if (responseResult.error !== null || !responseResult.data) {
    throw new Error("Export failed.");
  }

  const response = responseResult.data;

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Export failed."));
  }

  const blobResult = await tryCatch(response.blob());
  if (blobResult.error !== null || !blobResult.data) {
    throw new Error("Export failed.");
  }

  return {
    blob: blobResult.data,
    filename:
      filenameFromContentDisposition(
        response.headers.get("Content-Disposition"),
      ) ?? "notion-images.zip",
  };
}
