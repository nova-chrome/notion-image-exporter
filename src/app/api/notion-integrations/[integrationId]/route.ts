import { z } from "zod";
import { notionIntegrationPersistenceErrorMessage } from "~/lib/notion-integration-route-error";
import {
  deleteUserIntegration,
  renameUserIntegration,
} from "~/lib/notion-integrations";
import { getSession } from "~/lib/session";
import { tryCatch } from "~/util/try-catch";

const renameIntegrationSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(100),
});

type RouteContext = {
  params: Promise<{
    integrationId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }
  const { integrationId } = await context.params;
  const body = await request.json();
  const result = renameIntegrationSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: result.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const renameResult = await tryCatch(
    renameUserIntegration({
      userId: session.user.id,
      integrationId,
      label: result.data.label,
    }),
  );

  if (renameResult.error !== null) {
    return Response.json(
      {
        error: notionIntegrationPersistenceErrorMessage(
          renameResult.error,
          "Could not rename that integration.",
        ),
      },
      { status: 400 },
    );
  }

  if (!renameResult.data) {
    return Response.json({ error: "Integration not found." }, { status: 404 });
  }

  return Response.json({ integration: renameResult.data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }
  const { integrationId } = await context.params;

  const integration = await deleteUserIntegration({
    userId: session.user.id,
    integrationId,
  });

  if (!integration) {
    return Response.json({ error: "Integration not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
