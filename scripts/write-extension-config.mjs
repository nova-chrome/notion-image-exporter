import "dotenv/config";
import { writeFile } from "node:fs/promises";

const DEFAULT_APP_URL = "https://nie.uplyfted.io";
const appUrl = (process.env.NIE_EXTENSION_APP_URL || DEFAULT_APP_URL).replace(
  /\/+$/,
  "",
);

try {
  new URL(appUrl);
} catch {
  throw new Error("NIE_EXTENSION_APP_URL must be a valid URL.");
}

await writeFile(
  new URL("../extension/config.js", import.meta.url),
  `globalThis.NIE_APP_URL = ${JSON.stringify(appUrl)};\n`,
);
