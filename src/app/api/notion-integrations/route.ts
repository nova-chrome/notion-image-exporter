import { z } from "zod";
import { notionIntegrationPersistenceErrorMessage } from "~/lib/notion-integration-route-error";
import {
  createUserIntegration,
  validateNotionIntegrationSecret,
} from "~/lib/notion-integrations";
import { getSession } from "~/lib/session";
import { tryCatch } from "~/util/try-catch";

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

  const createResult = await tryCatch(
    createUserIntegration({
      userId: session.user.id,
      label: result.data.label,
      secret: result.data.secret,
    }),
  );

  if (createResult.error !== null) {
    return Response.json(
      {
        error: notionIntegrationPersistenceErrorMessage(
          createResult.error,
          "Could not save that integration.",
        ),
      },
      { status: 400 },
    );
  }

  return Response.json({ integration: createResult.data }, { status: 201 });
}
