import "./config.js";

function configuredAppUrl() {
  const appUrl =
    typeof globalThis.NIE_APP_URL === "string"
      ? globalThis.NIE_APP_URL
      : "https://nie.uplyfted.io";

  return appUrl.trim().replace(/\/+$/, "");
}

const APP_URL = configuredAppUrl();

function filenameFromContentDisposition(header) {
  if (!header) return "notion-images.zip";
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1].trim()) : "notion-images.zip";
}

async function responseErrorMessage(response, fallback) {
  try {
    const body = await response.json();
    return body.error || response.statusText || fallback;
  } catch {
    return response.statusText || fallback;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function exportImages(message) {
  const response = await fetch(`${APP_URL}/api/extension/notion-images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${message.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pageIdOrUrl: message.pageIdOrUrl,
      integrationId: message.integrationId,
    }),
  });

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Export failed."));
  }

  const filename = filenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
  );
  const mime = response.headers.get("Content-Type") || "application/zip";
  const buffer = await response.arrayBuffer();
  const url = `data:${mime};base64,${arrayBufferToBase64(buffer)}`;

  await chrome.downloads.download({
    url,
    filename,
    saveAs: false,
  });

  return { ok: true, filename };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "export-images") return false;

  exportImages(message)
    .then((result) => sendResponse(result))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );

  return true;
});
