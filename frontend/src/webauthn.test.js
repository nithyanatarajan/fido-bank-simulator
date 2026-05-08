import { describe, it, expect } from 'vitest';
import { base64urlToBuffer, bufferToBase64url } from './webauthn.js';

describe('base64urlToBuffer', () => {
  it('converts a base64url string to ArrayBuffer', () => {
    const input = 'SGVsbG8'; // "Hello" in base64url
    const buffer = base64urlToBuffer(input);
    const text = new TextDecoder().decode(buffer);
    expect(text).toBe('Hello');
  });

  it('handles base64url characters (- and _)', () => {
    // Standard base64 uses + and /, base64url uses - and _
    const input = 'ab-c_d'; // contains - and _
    const buffer = base64urlToBuffer(input);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('handles padding correctly', () => {
    // base64url omits padding, but the function should handle it
    const input = 'YQ'; // "a" without padding (would be "YQ==" in standard base64)
    const buffer = base64urlToBuffer(input);
    const text = new TextDecoder().decode(buffer);
    expect(text).toBe('a');
  });

  it('round-trips with bufferToBase64url', () => {
    const original = 'dGVzdCBkYXRhIGZvciByb3VuZCB0cmlw';
    const buffer = base64urlToBuffer(original);
    const result = bufferToBase64url(buffer);
    expect(result).toBe(original);
  });

  it('handles empty input', () => {
    const buffer = base64urlToBuffer('');
    expect(buffer.byteLength).toBe(0);
  });
});

describe('bufferToBase64url', () => {
  it('converts an ArrayBuffer to base64url string', () => {
    const text = 'Hello';
    const buffer = new TextEncoder().encode(text).buffer;
    const result = bufferToBase64url(buffer);
    expect(result).toBe('SGVsbG8');
  });

  it('does not include padding characters', () => {
    const buffer = new TextEncoder().encode('a').buffer;
    const result = bufferToBase64url(buffer);
    expect(result).not.toContain('=');
    expect(result).toBe('YQ');
  });

  it('uses url-safe characters (- and _ instead of + and /)', () => {
    // Create a buffer that would produce + or / in standard base64
    const bytes = new Uint8Array([251, 239, 190]); // produces "++/+" in base64
    const result = bufferToBase64url(bytes.buffer);
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  it('handles empty buffer', () => {
    const buffer = new ArrayBuffer(0);
    const result = bufferToBase64url(buffer);
    expect(result).toBe('');
  });

  it('handles binary data correctly', () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const result = bufferToBase64url(bytes.buffer);
    // Round-trip to verify
    const decoded = base64urlToBuffer(result);
    const decodedBytes = new Uint8Array(decoded);
    expect(Array.from(decodedBytes)).toEqual([0, 1, 2, 255, 254, 253]);
  });
});
