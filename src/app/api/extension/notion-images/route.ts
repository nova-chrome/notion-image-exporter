import { z } from "zod";
import {
  extensionJson,
  extensionOptionsResponse,
  withExtensionCors,
} from "~/lib/extension-api";
import { authenticateExtensionRequest } from "~/lib/extension-auth";
import { exportNotionImagesZipResponse } from "~/lib/notion-export";
import {
  decryptOwnedIntegrationSecret,
  getOwnedIntegration,
  touchIntegrationLastUsed,
} from "~/lib/notion-integrations";

export const runtime = "nodejs";

const postBodySchema = z.object({
  pageIdOrUrl: z.string().trim().min(1, "Provide pageIdOrUrl."),
  integrationId: z.string().trim().min(1, "Provide integrationId."),
});

export function OPTIONS() {
  return extensionOptionsResponse();
}

export async function POST(request: Request) {
  const extensionToken = await authenticateExtensionRequest(request);
  if (!extensionToken) {
    return extensionJson(
      { error: "Extension token required." },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = postBodySchema.safeParse(body);

  if (!parsed.success) {
    return extensionJson(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const integration = await getOwnedIntegration(
    extensionToken.userId,
    parsed.data.integrationId,
  );

  if (!integration) {
    return extensionJson(
      { error: "That integration does not belong to you." },
      { status: 404 },
    );
  }

  const response = await exportNotionImagesZipResponse({
    secret: decryptOwnedIntegrationSecret(integration),
    pageIdOrUrl: parsed.data.pageIdOrUrl,
  });

  if (response.ok) {
    await touchIntegrationLastUsed({
      userId: extensionToken.userId,
      integrationId: integration.id,
    });
  }

  return withExtensionCors(response);
}
