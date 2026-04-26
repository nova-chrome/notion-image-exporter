import { extensionJson, extensionOptionsResponse } from "~/lib/extension-api";
import { authenticateExtensionRequest } from "~/lib/extension-auth";
import { listUserIntegrations } from "~/lib/notion-integrations";

export function OPTIONS() {
  return extensionOptionsResponse();
}

export async function GET(request: Request) {
  const extensionToken = await authenticateExtensionRequest(request);
  if (!extensionToken) {
    return extensionJson(
      { error: "Extension token required." },
      { status: 401 },
    );
  }

  const integrations = await listUserIntegrations(extensionToken.userId);
  return extensionJson({ integrations });
}
