import { z } from "zod";
import { exportNotionImagesZipResponse } from "~/lib/notion-export";
import {
  decryptOwnedIntegrationSecret,
  getOwnedIntegration,
  touchIntegrationLastUsed,
} from "~/lib/notion-integrations";
import { getSession } from "~/lib/session";

export const runtime = "nodejs";

const postBodySchema = z.object({
  pageIdOrUrl: z.string().trim().min(1, "Provide pageIdOrUrl."),
  integrationId: z.string().trim().min(1, "Provide integrationId."),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = postBodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const integration = await getOwnedIntegration(
    session.user.id,
    parsed.data.integrationId,
  );

  if (!integration) {
    return Response.json(
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
      userId: session.user.id,
      integrationId: integration.id,
    });
  }

  return response;
}
