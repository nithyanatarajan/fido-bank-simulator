import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login, logout, getMe } from './api.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('register', () => {
  it('sends POST with username and password and credentials include', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ username: 'alice' }),
    });

    const result = await register('alice', 'pass123');

    expect(mockFetch).toHaveBeenCalledWith('/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'pass123' }),
      credentials: 'include',
    });
    expect(result).toEqual({ username: 'alice' });
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'User exists' }),
    });

    await expect(register('alice', 'pass')).rejects.toThrow('User exists');
  });

  it('throws default message when no message in response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    await expect(register('alice', 'pass')).rejects.toThrow('Registration failed');
  });
});

describe('login', () => {
  it('sends POST with username and password and credentials include', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Logged in' }),
    });

    const result = await login('alice', 'pass123');

    expect(mockFetch).toHaveBeenCalledWith('/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'pass123' }),
      credentials: 'include',
    });
    expect(result).toEqual({ message: 'Logged in' });
  });

  it('throws on invalid credentials', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    });

    await expect(login('alice', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

describe('logout', () => {
  it('sends POST to /users/logout with credentials include', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Logged out' }),
    });

    const result = await logout();

    expect(mockFetch).toHaveBeenCalledWith('/users/logout', {
      method: 'POST',
      credentials: 'include',
    });
    expect(result).toEqual({ message: 'Logged out' });
  });
});

describe('getMe', () => {
  it('returns user when authenticated', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ username: 'alice' }),
    });

    const result = await getMe();

    expect(mockFetch).toHaveBeenCalledWith('/users/me', {
      credentials: 'include',
    });
    expect(result).toEqual({ username: 'alice' });
  });

  it('throws when not authenticated', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    await expect(getMe()).rejects.toThrow('Not authenticated');
  });
});

describe('apiUrl from config', () => {
  it('prepends apiUrl when configured', async () => {
    // Set up config
    globalThis.window = { __CONFIG__: { apiUrl: 'http://api.example.com' } };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ username: 'alice' }),
    });

    await getMe();

    expect(mockFetch).toHaveBeenCalledWith('http://api.example.com/users/me', {
      credentials: 'include',
    });

    // Clean up
    delete globalThis.window;
  });
});
