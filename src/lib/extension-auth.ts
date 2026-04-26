import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "~/db";
import { extensionPairingTokens, extensionTokens } from "~/db/schema";
import {
  createExtensionSecret,
  createPairingCode,
  hashExtensionToken,
  tokenHashesMatch,
  tokenPreview,
} from "~/lib/extension-token";

const PAIRING_TOKEN_TTL_MS = 10 * 60 * 1000;

function createId() {
  return crypto.randomUUID();
}

export async function createExtensionPairingToken(input: {
  userId: string;
  label: string;
}) {
  const code = createPairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MS);

  await getDb()
    .insert(extensionPairingTokens)
    .values({
      id: createId(),
      userId: input.userId,
      label: input.label,
      tokenHash: hashExtensionToken(code),
      expiresAt,
    });

  return {
    code,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function consumeExtensionPairingCode(input: {
  code: string;
  label?: string;
}) {
  const codeHash = hashExtensionToken(input.code);
  const pairing = await getDb().query.extensionPairingTokens.findFirst({
    where: and(
      eq(extensionPairingTokens.tokenHash, codeHash),
      isNull(extensionPairingTokens.usedAt),
      gt(extensionPairingTokens.expiresAt, new Date()),
    ),
  });

  if (!pairing || !tokenHashesMatch(pairing.tokenHash, codeHash)) {
    return null;
  }

  await getDb()
    .update(extensionPairingTokens)
    .set({ usedAt: sql`timezone('utc', now())` })
    .where(
      and(
        eq(extensionPairingTokens.id, pairing.id),
        isNull(extensionPairingTokens.usedAt),
      ),
    );

  const token = createExtensionSecret();
  const now = new Date();
  const label = input.label?.trim() || pairing.label;
  const [createdToken] = await getDb()
    .insert(extensionTokens)
    .values({
      id: createId(),
      userId: pairing.userId,
      label,
      tokenHash: hashExtensionToken(token),
      tokenPreview: tokenPreview(token),
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: extensionTokens.id,
      label: extensionTokens.label,
      tokenPreview: extensionTokens.tokenPreview,
    });

  return createdToken
    ? {
        token,
        extension: createdToken,
      }
    : null;
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
  return match?.[1]?.trim() ?? null;
}

export async function authenticateExtensionRequest(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;

  const tokenHash = hashExtensionToken(token);
  const extensionToken = await getDb().query.extensionTokens.findFirst({
    where: and(
      eq(extensionTokens.tokenHash, tokenHash),
      isNull(extensionTokens.revokedAt),
    ),
  });

  if (
    !extensionToken ||
    !tokenHashesMatch(extensionToken.tokenHash, tokenHash)
  ) {
    return null;
  }

  await getDb()
    .update(extensionTokens)
    .set({
      lastUsedAt: sql`timezone('utc', now())`,
      updatedAt: sql`timezone('utc', now())`,
    })
    .where(eq(extensionTokens.id, extensionToken.id));

  return extensionToken;
}

export async function revokeExtensionToken(extensionTokenId: string) {
  await getDb()
    .update(extensionTokens)
    .set({
      revokedAt: sql`timezone('utc', now())`,
      updatedAt: sql`timezone('utc', now())`,
    })
    .where(eq(extensionTokens.id, extensionTokenId));
}
