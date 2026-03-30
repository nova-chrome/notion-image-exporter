export function notionIntegrationPersistenceErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error &&
    error.message.includes("notion_integration_user_label_unique")
    ? "You already have an integration with that label."
    : fallback;
}
