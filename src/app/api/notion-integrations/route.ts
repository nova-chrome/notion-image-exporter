import { z } from "zod";
import {
  createUserIntegration,
  validateNotionIntegrationSecret,
} from "~/lib/notion-integrations";
import { getSession } from "~/lib/session";

const createIntegrationSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(100),
  secret: z.string().trim().min(1, "Secret is required."),
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
  const result = createIntegrationSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: result.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const validation = await validateNotionIntegrationSecret(result.data.secret);
  if (!validation.valid) {
    return Response.json({ error: validation.message }, { status: 400 });
  }

  try {
    const integration = await createUserIntegration({
      userId: session.user.id,
      label: result.data.label,
      secret: result.data.secret,
    });

    return Response.json({ integration }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message.includes("notion_integration_user_label_unique")
        ? "You already have an integration with that label."
        : "Could not save that integration.";

    return Response.json({ error: message }, { status: 400 });
  }
}
