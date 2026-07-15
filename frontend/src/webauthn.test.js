import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  serializeAttestation,
  serializeAssertion,
  toCreateOptions,
  toGetOptions,
  registerPasskey,
  authenticatePasskey,
} from './webauthn.js';

function mockCredential() {
  return {
    id: 'cred-1',
    rawId: new ArrayBuffer(4),
    type: 'public-key',
    response: { clientDataJSON: new ArrayBuffer(4), attestationObject: new ArrayBuffer(4) },
  };
}

function mockAssertionObj() {
  return {
    id: 'assert-1',
    rawId: new ArrayBuffer(4),
    type: 'public-key',
    response: {
      clientDataJSON: new ArrayBuffer(4),
      authenticatorData: new ArrayBuffer(4),
      signature: new ArrayBuffer(4),
      userHandle: null,
    },
  };
}

function beginRegResponse() {
  return {
    publicKey: { challenge: 'YQ', user: { id: 'YQ', name: 'alice' }, excludeCredentials: [] },
    challenge_token: 'tok',
  };
}

function beginAuthResponse() {
  return { publicKey: { challenge: 'YQ', allowCredentials: [] }, challenge_token: 'tok' };
}

// --- Unit tests ---

describe('serializeAttestation', () => {
  it('serializes credential fields to base64url', () => {
    const result = serializeAttestation(mockCredential());
    expect(result.id).toBe('cred-1');
    expect(typeof result.rawId).toBe('string');
    expect(typeof result.response.clientDataJSON).toBe('string');
  });
});

describe('serializeAssertion', () => {
  it('serializes assertion fields', () => {
    const result = serializeAssertion(mockAssertionObj());
    expect(result.id).toBe('assert-1');
    expect(result.response.userHandle).toBeNull();
  });

  it('serializes userHandle when present', () => {
    const a = mockAssertionObj();
    a.response.userHandle = new ArrayBuffer(4);
    expect(typeof serializeAssertion(a).response.userHandle).toBe('string');
  });
});

describe('toCreateOptions', () => {
  it('converts base64url to ArrayBuffers', () => {
    const result = toCreateOptions({
      challenge: 'YQ',
      user: { id: 'YQ', name: 'a' },
      excludeCredentials: [{ id: 'YQ', type: 'public-key' }],
    });
    expect(result.publicKey.challenge).toBeInstanceOf(ArrayBuffer);
    expect(result.publicKey.user.id).toBeInstanceOf(ArrayBuffer);
    expect(result.publicKey.excludeCredentials[0].id).toBeInstanceOf(ArrayBuffer);
  });

  it('handles missing excludeCredentials', () => {
    const result = toCreateOptions({ challenge: 'YQ', user: { id: 'YQ', name: 'a' } });
    expect(result.publicKey.excludeCredentials).toEqual([]);
  });
});

describe('toGetOptions', () => {
  it('converts base64url to ArrayBuffers', () => {
    const result = toGetOptions({
      challenge: 'YQ',
      allowCredentials: [{ id: 'YQ', type: 'public-key' }],
    });
    expect(result.publicKey.challenge).toBeInstanceOf(ArrayBuffer);
    expect(result.publicKey.allowCredentials[0].id).toBeInstanceOf(ArrayBuffer);
  });
});

// --- Integration tests ---

describe('registerPasskey', () => {
  let fetchSpy;
  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  it('completes registration', async () => {
    fetchSpy
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(beginRegResponse()) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
    Object.defineProperty(globalThis, 'navigator', {
      value: { credentials: { create: vi.fn().mockResolvedValue(mockCredential()) } },
      configurable: true,
    });

    const result = await registerPasskey();

    expect(result).toEqual({ status: 'ok' });
    const body = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(body.challenge_token).toBe('tok');
    expect(body.attestation.id).toBe('cred-1');
  });

  it('throws when begin fails', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ message: 'fail' }) });
    await expect(registerPasskey()).rejects.toThrow('fail');
  });

  it('throws when complete fails', async () => {
    fetchSpy
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(beginRegResponse()) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ message: 'invalid' }) });
    Object.defineProperty(globalThis, 'navigator', {
      value: { credentials: { create: vi.fn().mockResolvedValue(mockCredential()) } },
      configurable: true,
    });

    await expect(registerPasskey()).rejects.toThrow('invalid');
  });
});

describe('authenticatePasskey', () => {
  let fetchSpy;
  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  it('completes authentication', async () => {
    fetchSpy
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(beginAuthResponse()) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
    Object.defineProperty(globalThis, 'navigator', {
      value: { credentials: { get: vi.fn().mockResolvedValue(mockAssertionObj()) } },
      configurable: true,
    });

    const result = await authenticatePasskey();

    expect(result).toEqual({ status: 'ok' });
    const body = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(body.challenge_token).toBe('tok');
    expect(body.assertion.id).toBe('assert-1');
  });

  it('throws when begin fails', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ message: 'fail' }) });
    await expect(authenticatePasskey()).rejects.toThrow('fail');
  });
});
