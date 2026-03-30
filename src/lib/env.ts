function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get DATABASE_URL() {
    return getRequiredEnv("DATABASE_URL");
  },
  get BETTER_AUTH_SECRET() {
    return getRequiredEnv("BETTER_AUTH_SECRET");
  },
  get BETTER_AUTH_URL() {
    return getRequiredEnv("BETTER_AUTH_URL");
  },
  get GITHUB_CLIENT_ID() {
    return getRequiredEnv("GITHUB_CLIENT_ID");
  },
  get GITHUB_CLIENT_SECRET() {
    return getRequiredEnv("GITHUB_CLIENT_SECRET");
  },
  get NOTION_INTEGRATION_ENCRYPTION_KEY() {
    return getRequiredEnv("NOTION_INTEGRATION_ENCRYPTION_KEY");
  },
};
