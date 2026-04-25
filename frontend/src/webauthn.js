/**
 * WebAuthn helper functions for passkey registration and authentication.
 */
import { getApiUrl } from './api.js';

/**
 * Convert a base64url string to an ArrayBuffer.
 * @param {string} base64url
 * @returns {ArrayBuffer}
 */
export function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert an ArrayBuffer to a base64url string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Register a new passkey for the current user.
 * @returns {Promise<void>}
 */
export async function registerPasskey() {
  const api = getApiUrl();

  // Step 1: Get registration options from server
  const beginResp = await fetch(`${api}/fido/register/begin`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!beginResp.ok) {
    const data = await beginResp.json();
    throw new Error(data.message || 'Failed to begin registration');
  }
  const beginData = await beginResp.json();
  const { publicKey, challenge_token } = beginData;

  // Step 2: Convert base64url fields to ArrayBuffers for WebAuthn API
  const createOptions = {
    publicKey: {
      ...publicKey,
      challenge: base64urlToBuffer(publicKey.challenge),
      user: {
        ...publicKey.user,
        id: base64urlToBuffer(publicKey.user.id),
      },
      excludeCredentials: (publicKey.excludeCredentials || []).map((c) => ({
        ...c,
        id: base64urlToBuffer(c.id),
      })),
    },
  };

  // Step 3: Call WebAuthn API
  const credential = await navigator.credentials.create(createOptions);

  // Step 4: Serialize attestation response for server
  const attestation = {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
      attestationObject: bufferToBase64url(credential.response.attestationObject),
    },
  };

  // Step 5: Complete registration on server
  const completeResp = await fetch(`${api}/fido/register/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ challenge_token, attestation }),
  });
  if (!completeResp.ok) {
    const data = await completeResp.json();
    throw new Error(data.message || 'Failed to complete registration');
  }
}

/**
 * Authenticate with a registered passkey.
 * @returns {Promise<void>}
 */
export async function authenticatePasskey() {
  const api = getApiUrl();

  // Step 1: Get authentication options from server
  const beginResp = await fetch(`${api}/fido/auth/begin`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!beginResp.ok) {
    const data = await beginResp.json();
    throw new Error(data.message || 'Failed to begin authentication');
  }
  const beginData = await beginResp.json();
  const { publicKey, challenge_token } = beginData;

  // Step 2: Convert base64url fields to ArrayBuffers
  const getOptions = {
    publicKey: {
      ...publicKey,
      challenge: base64urlToBuffer(publicKey.challenge),
      allowCredentials: (publicKey.allowCredentials || []).map((c) => ({
        ...c,
        id: base64urlToBuffer(c.id),
      })),
    },
  };

  // Step 3: Call WebAuthn API
  const assertion = await navigator.credentials.get(getOptions);

  // Step 4: Serialize assertion response for server
  const assertionData = {
    id: assertion.id,
    rawId: bufferToBase64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
      authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
      signature: bufferToBase64url(assertion.response.signature),
      userHandle: assertion.response.userHandle
        ? bufferToBase64url(assertion.response.userHandle)
        : null,
    },
  };

  // Step 5: Complete authentication on server
  const completeResp = await fetch(`${api}/fido/auth/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ challenge_token, assertion: assertionData }),
  });
  if (!completeResp.ok) {
    const data = await completeResp.json();
    throw new Error(data.message || 'Failed to complete authentication');
  }
}
