import { describe, it, expect } from 'vitest';
import { base64urlToBuffer, bufferToBase64url } from './encoding.js';

describe('base64urlToBuffer', () => {
  it('converts a base64url string to ArrayBuffer', () => {
    const buffer = base64urlToBuffer('SGVsbG8');
    expect(new TextDecoder().decode(buffer)).toBe('Hello');
  });

  it('handles base64url characters (- and _)', () => {
    const buffer = base64urlToBuffer('ab-c_d');
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('handles padding correctly', () => {
    expect(new TextDecoder().decode(base64urlToBuffer('YQ'))).toBe('a');
  });

  it('round-trips with bufferToBase64url', () => {
    const original = 'dGVzdCBkYXRhIGZvciByb3VuZCB0cmlw';
    expect(bufferToBase64url(base64urlToBuffer(original))).toBe(original);
  });

  it('handles empty input', () => {
    expect(base64urlToBuffer('').byteLength).toBe(0);
  });
});

describe('bufferToBase64url', () => {
  it('converts an ArrayBuffer to base64url string', () => {
    expect(bufferToBase64url(new TextEncoder().encode('Hello').buffer)).toBe('SGVsbG8');
  });

  it('does not include padding characters', () => {
    const result = bufferToBase64url(new TextEncoder().encode('a').buffer);
    expect(result).not.toContain('=');
    expect(result).toBe('YQ');
  });

  it('uses url-safe characters', () => {
    const result = bufferToBase64url(new Uint8Array([251, 239, 190]).buffer);
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  it('handles empty buffer', () => {
    expect(bufferToBase64url(new ArrayBuffer(0))).toBe('');
  });

  it('handles binary data correctly', () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const decoded = new Uint8Array(base64urlToBuffer(bufferToBase64url(bytes.buffer)));
    expect(Array.from(decoded)).toEqual([0, 1, 2, 255, 254, 253]);
  });
});
