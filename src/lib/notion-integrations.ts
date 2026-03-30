import { APIResponseError, Client } from "@notionhq/client";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "~/db";
import { notionIntegrations } from "~/db/schema";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "~/lib/integration-crypto";

export type IntegrationSummary = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

function toSummary(
  integration: typeof notionIntegrations.$inferSelect,
): IntegrationSummary {
  return {
    id: integration.id,
    label: integration.label,
    createdAt: integration.createdAt.toISOString(),
    updatedAt: integration.updatedAt.toISOString(),
    lastUsedAt: integration.lastUsedAt?.toISOString() ?? null,
  };
}

function createIntegrationId() {
  return crypto.randomUUID();
}

export async function listUserIntegrations(userId: string) {
  const integrations = await getDb().query.notionIntegrations.findMany({
    where: eq(notionIntegrations.userId, userId),
    orderBy: [desc(notionIntegrations.updatedAt)],
  });

  return integrations.map(toSummary);
}

export async function getOwnedIntegration(
  userId: string,
  integrationId: string,
) {
  return getDb().query.notionIntegrations.findFirst({
    where: and(
      eq(notionIntegrations.id, integrationId),
      eq(notionIntegrations.userId, userId),
    ),
  });
}

export async function createUserIntegration(input: {
  userId: string;
  label: string;
  secret: string;
}) {
  const now = new Date();
  const [integration] = await getDb()
    .insert(notionIntegrations)
    .values({
      id: createIntegrationId(),
      userId: input.userId,
      label: input.label,
      encryptedSecret: encryptIntegrationSecret(input.secret),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return integration ? toSummary(integration) : null;
}

export async function renameUserIntegration(input: {
  userId: string;
  integrationId: string;
  label: string;
}) {
  const [integration] = await getDb()
    .update(notionIntegrations)
    .set({
      label: input.label,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notionIntegrations.id, input.integrationId),
        eq(notionIntegrations.userId, input.userId),
      ),
    )
    .returning();

  return integration ? toSummary(integration) : null;
}

export async function deleteUserIntegration(input: {
  userId: string;
  integrationId: string;
}) {
  const [integration] = await getDb()
    .delete(notionIntegrations)
    .where(
      and(
        eq(notionIntegrations.id, input.integrationId),
        eq(notionIntegrations.userId, input.userId),
      ),
    )
    .returning({ id: notionIntegrations.id });

  return integration ?? null;
}

export async function touchIntegrationLastUsed(input: {
  userId: string;
  integrationId: string;
}) {
  await getDb()
    .update(notionIntegrations)
    .set({
      lastUsedAt: sql`timezone('utc', now())`,
      updatedAt: sql`timezone('utc', now())`,
    })
    .where(
      and(
        eq(notionIntegrations.id, input.integrationId),
        eq(notionIntegrations.userId, input.userId),
      ),
    );
}

export function decryptOwnedIntegrationSecret(
  integration: typeof notionIntegrations.$inferSelect,
) {
  return decryptIntegrationSecret(integration.encryptedSecret);
}

export async function validateNotionIntegrationSecret(secret: string) {
  const client = new Client({ auth: secret });

  try {
    await client.users.me({});
    return { valid: true as const };
  } catch (error) {
    if (APIResponseError.isAPIResponseError(error)) {
      return {
        valid: false as const,
        message:
          error.status === 401 || error.status === 403
            ? "That Notion integration secret is invalid or does not have access yet."
            : error.message,
      };
    }

    return {
      valid: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Could not validate that Notion integration.",
    };
  }
}
