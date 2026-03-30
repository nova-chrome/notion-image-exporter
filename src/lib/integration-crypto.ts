import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "~/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey() {
  return createHash("sha256")
    .update(env.NOTION_INTEGRATION_ENCRYPTION_KEY)
    .digest();
}

export function encryptIntegrationSecret(secret: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((value) => value.toString("base64url"))
    .join(".");
}

export function decryptIntegrationSecret(payload: string) {
  const [ivValue, authTagValue, encryptedValue] = payload.split(".");

  if (!(ivValue && authTagValue && encryptedValue)) {
    throw new Error("Invalid encrypted integration secret");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
