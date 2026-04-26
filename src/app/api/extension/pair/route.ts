import { z } from "zod";
import { extensionJson, extensionOptionsResponse } from "~/lib/extension-api";
import { consumeExtensionPairingCode } from "~/lib/extension-auth";

const pairSchema = z.object({
  code: z.string().trim().min(1, "Pairing code is required."),
  label: z.string().trim().min(1).max(100).optional(),
});

export function OPTIONS() {
  return extensionOptionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = pairSchema.safeParse(body);

  if (!parsed.success) {
    return extensionJson(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const result = await consumeExtensionPairingCode(parsed.data);
  if (!result) {
    return extensionJson(
      { error: "Pairing code is invalid, expired, or already used." },
      { status: 401 },
    );
  }

  return extensionJson(result, { status: 201 });
}
