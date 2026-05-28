import { encrypt, decrypt, isEncrypted } from '../index';

describe('crypto', () => {
  it('encrypt/decrypt round-trips', () => {
    const plain = 'This is a sensitive legal opinion.';
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it('decrypt throws on tampered ciphertext', () => {
    const enc = encrypt('test');
    const [iv, tag, data] = enc.split(':');
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}ff`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('isEncrypted identifies encrypted vs plaintext', () => {
    expect(isEncrypted(encrypt('hello'))).toBe(true);
    expect(isEncrypted('plain legal reasoning text')).toBe(false);
    expect(isEncrypted('')).toBe(false);
  });

  it('different plaintexts produce different ciphertexts', () => {
    expect(encrypt('a')).not.toBe(encrypt('a')); // IV is random
  });
});
