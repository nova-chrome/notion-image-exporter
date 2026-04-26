import { extensionJson, extensionOptionsResponse } from "~/lib/extension-api";
import {
  authenticateExtensionRequest,
  revokeExtensionToken,
} from "~/lib/extension-auth";

export function OPTIONS() {
  return extensionOptionsResponse();
}

export async function DELETE(request: Request) {
  const extensionToken = await authenticateExtensionRequest(request);
  if (!extensionToken) {
    return extensionJson(
      { error: "Extension token required." },
      { status: 401 },
    );
  }

  await revokeExtensionToken(extensionToken.id);
  return extensionJson({ ok: true });
}
