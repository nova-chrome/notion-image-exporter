import assert from "node:assert/strict";
import test from "node:test";
import {
  createExtensionSecret,
  createPairingCode,
  hashExtensionToken,
  tokenHashesMatch,
  tokenPreview,
} from "./extension-token";

test("creates prefixed extension and pairing tokens", () => {
  const extensionSecret = createExtensionSecret();
  const pairingCode = createPairingCode();

  assert.match(extensionSecret, /^nie_ext_[A-Za-z0-9_-]+$/);
  assert.match(pairingCode, /^nie_pair_[A-Za-z0-9_-]+$/);
  assert.notEqual(extensionSecret, createExtensionSecret());
  assert.notEqual(pairingCode, createPairingCode());
});

test("hashes and compares tokens without storing plaintext", () => {
  const token = "nie_ext_test-token";
  const hash = hashExtensionToken(token);

  assert.equal(hash.length, 64);
  assert.equal(tokenHashesMatch(hash, hashExtensionToken(token)), true);
  assert.equal(tokenHashesMatch(hash, hashExtensionToken("different")), false);
});

test("uses a short token preview for display only", () => {
  assert.equal(tokenPreview("nie_ext_abcdefghijklmnopqrstuvwxyz"), "uvwxyz");
});
