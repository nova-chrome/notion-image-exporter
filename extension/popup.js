const DEFAULT_APP_URL = "http://localhost:3000";

const elements = {
  settingsToggle: document.getElementById("settings-toggle"),
  settings: document.getElementById("settings"),
  status: document.getElementById("status"),
  appUrl: document.getElementById("app-url"),
  pairingCode: document.getElementById("pairing-code"),
  openPairing: document.getElementById("open-pairing"),
  pair: document.getElementById("pair"),
  exporter: document.getElementById("exporter"),
  integration: document.getElementById("integration"),
  pageUrl: document.getElementById("page-url"),
  export: document.getElementById("export"),
  refresh: document.getElementById("refresh"),
  disconnect: document.getElementById("disconnect"),
};

let state = {
  appUrl: DEFAULT_APP_URL,
  token: "",
  integrations: [],
};

function storageGet(keys) {
  return chrome.storage.local.get(keys);
}

function storageSet(values) {
  return chrome.storage.local.set(values);
}

function storageRemove(keys) {
  return chrome.storage.local.remove(keys);
}

function normalizeAppUrl(value) {
  return (value || DEFAULT_APP_URL).trim().replace(/\/+$/, "");
}

function setStatus(message, type = "info") {
  elements.status.textContent = message;
  elements.status.className = type === "error" ? "status error" : "status";
  elements.status.hidden = !message;
}

function setBusy(isBusy) {
  elements.pair.disabled = isBusy;
  elements.export.disabled = isBusy || state.integrations.length === 0;
  elements.refresh.disabled = isBusy;
  elements.disconnect.disabled = isBusy || !state.token;
}

function isNotionUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "notion.so" || parsed.hostname.endsWith(".notion.so")
    );
  } catch {
    return false;
  }
}

async function activeTabUrl() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.url || "";
}

function renderIntegrations() {
  elements.integration.replaceChildren();

  if (state.integrations.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No integrations found";
    elements.integration.append(option);
    elements.export.disabled = true;
    return;
  }

  for (const integration of state.integrations) {
    const option = document.createElement("option");
    option.value = integration.id;
    option.textContent = integration.label;
    elements.integration.append(option);
  }

  elements.export.disabled = false;
}

function renderPairingState() {
  elements.appUrl.value = state.appUrl;
  elements.exporter.hidden = !state.token;
  elements.settings.hidden = Boolean(state.token);
  elements.disconnect.hidden = !state.token;
  renderIntegrations();
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${state.appUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${state.token}`,
    },
  });

  if (!response.ok) {
    let error = response.statusText || "Request failed.";
    try {
      const body = await response.json();
      error = body.error || error;
    } catch {
      // Keep the status text fallback.
    }
    throw new Error(error);
  }

  return response.json();
}

async function loadIntegrations() {
  if (!state.token) return;

  setBusy(true);
  setStatus("Loading integrations...");
  try {
    const body = await apiFetch("/api/extension/integrations");
    state.integrations = body.integrations || [];
    renderIntegrations();
    setStatus(
      state.integrations.length > 0
        ? "Ready to export."
        : "No saved integrations found in the app.",
    );
  } catch (error) {
    setStatus(error.message || "Could not load integrations.", "error");
  } finally {
    setBusy(false);
  }
}

async function pairExtension() {
  const appUrl = normalizeAppUrl(elements.appUrl.value);
  const code = elements.pairingCode.value.trim();
  if (!code) {
    setStatus("Paste a pairing code first.", "error");
    return;
  }

  setBusy(true);
  setStatus("Pairing extension...");
  try {
    const response = await fetch(`${appUrl}/api/extension/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, label: "Chrome extension" }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || response.statusText || "Pairing failed.");
    }

    const body = await response.json();
    state = {
      ...state,
      appUrl,
      token: body.token,
      integrations: [],
    };
    await storageSet({ appUrl: state.appUrl, token: state.token });
    elements.pairingCode.value = "";
    renderPairingState();
    await loadIntegrations();
  } catch (error) {
    setStatus(error.message || "Pairing failed.", "error");
  } finally {
    setBusy(false);
  }
}

async function openPairingPage() {
  const appUrl = normalizeAppUrl(elements.appUrl.value);
  await storageSet({ appUrl });
  state.appUrl = appUrl;
  await chrome.tabs.create({ url: `${appUrl}/extension/connect` });
}

async function exportImages() {
  const pageIdOrUrl = elements.pageUrl.value.trim();
  const integrationId = elements.integration.value;

  if (!pageIdOrUrl) {
    setStatus("Paste a Notion page URL or page ID.", "error");
    return;
  }

  if (!integrationId) {
    setStatus("Choose a saved integration first.", "error");
    return;
  }

  setBusy(true);
  setStatus("Building ZIP...");
  try {
    const response = await chrome.runtime.sendMessage({
      type: "export-images",
      appUrl: state.appUrl,
      token: state.token,
      pageIdOrUrl,
      integrationId,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Export failed.");
    }

    setStatus(`Download started: ${response.filename}`);
  } catch (error) {
    setStatus(error.message || "Export failed.", "error");
  } finally {
    setBusy(false);
  }
}

async function disconnect() {
  setBusy(true);
  try {
    if (state.token) {
      await fetch(`${state.appUrl}/api/extension/session`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${state.token}` },
      }).catch(() => null);
    }
    await storageRemove(["token"]);
    state.token = "";
    state.integrations = [];
    renderPairingState();
    setStatus("Extension disconnected.");
  } finally {
    setBusy(false);
  }
}

async function init() {
  const stored = await storageGet(["appUrl", "token"]);
  state.appUrl = normalizeAppUrl(stored.appUrl);
  state.token = stored.token || "";

  const tabUrl = await activeTabUrl();
  if (isNotionUrl(tabUrl)) {
    elements.pageUrl.value = tabUrl;
  }

  renderPairingState();

  if (state.token) {
    await loadIntegrations();
  } else {
    setStatus("Pair this extension with the app before exporting.");
  }
}

elements.settingsToggle.addEventListener("click", () => {
  elements.settings.hidden = !elements.settings.hidden;
});
elements.openPairing.addEventListener("click", openPairingPage);
elements.pair.addEventListener("click", pairExtension);
elements.export.addEventListener("click", exportImages);
elements.refresh.addEventListener("click", loadIntegrations);
elements.disconnect.addEventListener("click", disconnect);

init();
