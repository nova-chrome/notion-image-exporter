import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "~/lib/integration-crypto";

describe("integration crypto", () => {
  beforeEach(() => {
    process.env.NOTION_INTEGRATION_ENCRYPTION_KEY =
      "test-encryption-key-for-notion-integrations";
  });

  it("round-trips an integration secret", () => {
    const secret = "ntn_example_secret";
    const encrypted = encryptIntegrationSecret(secret);

    expect(encrypted).not.toBe(secret);
    expect(decryptIntegrationSecret(encrypted)).toBe(secret);
  });

  it("rejects malformed payloads", () => {
    expect(() => decryptIntegrationSecret("bad-payload")).toThrow(
      "Invalid encrypted integration secret",
    );
  });
});
