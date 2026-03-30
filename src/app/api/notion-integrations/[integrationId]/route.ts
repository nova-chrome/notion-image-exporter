import { z } from "zod";
import {
  deleteUserIntegration,
  renameUserIntegration,
} from "~/lib/notion-integrations";
import { getSession } from "~/lib/session";

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

  try {
    const integration = await renameUserIntegration({
      userId: session.user.id,
      integrationId,
      label: result.data.label,
    });

    if (!integration) {
      return Response.json(
        { error: "Integration not found." },
        { status: 404 },
      );
    }

    return Response.json({ integration });
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message.includes("notion_integration_user_label_unique")
        ? "You already have an integration with that label."
        : "Could not rename that integration.";

    return Response.json({ error: message }, { status: 400 });
  }
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
