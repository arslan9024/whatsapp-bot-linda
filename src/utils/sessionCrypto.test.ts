import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSessionPayload, decryptSessionPayload } from './sessionCrypto.ts';

describe('sessionCrypto (AES-256-GCM)', () => {
  it('round-trips session credentials securely', () => {
    const secret = 'super-secret-linda-key-32-chars';
    const original = JSON.stringify({ clientId: 'linda-01', token: 'abc-123' });
    const encrypted = encryptSessionPayload(original, secret);
    assert.notEqual(encrypted, original);
    assert.equal(decryptSessionPayload(encrypted, secret), original);
  });

  it('rejects tampered ciphertext', () => {
    const secret = 'super-secret-linda-key-32-chars';
    const encrypted = encryptSessionPayload('sensitive-token', secret);
    const tampered = encrypted.slice(0, -2) + 'ff';
    assert.throws(() => decryptSessionPayload(tampered, secret));
  });
});
