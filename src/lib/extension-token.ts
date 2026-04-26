import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

function base64Url(bytes: Buffer) {
  return bytes.toString("base64url");
}

export function createExtensionSecret() {
  return `nie_ext_${base64Url(randomBytes(32))}`;
}

export function createPairingCode() {
  return `nie_pair_${base64Url(randomBytes(24))}`;
}

export function hashExtensionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokenPreview(token: string) {
  return token.slice(-6);
}

export function tokenHashesMatch(leftHash: string, rightHash: string) {
  const left = Buffer.from(leftHash, "hex");
  const right = Buffer.from(rightHash, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
