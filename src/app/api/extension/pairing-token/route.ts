import { z } from "zod";
import { createExtensionPairingToken } from "~/lib/extension-auth";
import { getSession } from "~/lib/session";

const createPairingTokenSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
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
  const parsed = createPairingTokenSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const pairing = await createExtensionPairingToken({
    userId: session.user.id,
    label: parsed.data.label || "Chrome extension",
  });

  return Response.json({ pairing }, { status: 201 });
}
