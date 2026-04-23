/**
 * API client for user endpoints.
 */

/**
 * Register a new user.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{username: string}>}
 */
export async function register(username, password) {
  const resp = await fetch('/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || 'Registration failed');
  }
  return resp.json();
}

/**
 * Login an existing user.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{message: string}>}
 */
export async function login(username, password) {
  const resp = await fetch('/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || 'Login failed');
  }
  return resp.json();
}

/**
 * Logout the current user.
 * @returns {Promise<{message: string}>}
 */
export async function logout() {
  const resp = await fetch('/users/logout', { method: 'POST' });
  return resp.json();
}

/**
 * Get the current authenticated user.
 * @returns {Promise<{username: string}>}
 */
export async function getMe() {
  const resp = await fetch('/users/me');
  if (!resp.ok) {
    throw new Error('Not authenticated');
  }
  return resp.json();
}
