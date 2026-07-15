/**
 * WebAuthn passkey registration and authentication flows.
 */
import { base64urlToBuffer, bufferToBase64url } from './encoding.js';

/**
 * Serialize a WebAuthn attestation credential for the server.
 * @param {PublicKeyCredential} credential
 * @returns {object}
 */
export function serializeAttestation(credential) {
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
      attestationObject: bufferToBase64url(credential.response.attestationObject),
    },
  };
}

/**
 * Serialize a WebAuthn assertion for the server.
 * @param {PublicKeyCredential} assertion
 * @returns {object}
 */
export function serializeAssertion(assertion) {
  return {
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
}

/**
 * Convert publicKey options from server JSON to navigator.credentials.create() format.
 * @param {object} publicKey
 * @returns {object}
 */
export function toCreateOptions(publicKey) {
  return {
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
}

/**
 * Convert publicKey options from server JSON to navigator.credentials.get() format.
 * @param {object} publicKey
 * @returns {object}
 */
export function toGetOptions(publicKey) {
  return {
    publicKey: {
      ...publicKey,
      challenge: base64urlToBuffer(publicKey.challenge),
      allowCredentials: (publicKey.allowCredentials || []).map((c) => ({
        ...c,
        id: base64urlToBuffer(c.id),
      })),
    },
  };
}

/**
 * POST to a FIDO endpoint and return parsed JSON.
 * @param {string} url
 * @param {object} [body]
 * @returns {Promise<object>}
 */
async function fidoPost(url, body) {
  const options = { method: 'POST', credentials: 'include' };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const resp = await fetch(url, options);
  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || 'Request failed');
  }
  return await resp.json();
}

/**
 * Register a new passkey for the current user.
 *
 * Flow:
 *   1. POST /fido/register/begin → publicKey + challenge token
 *   2. navigator.credentials.create() → attestation
 *   3. POST /fido/register/complete (attestation)
 */
export async function registerPasskey() {
  // Get registration options and the challenge token from the server
  const beginData = await fidoPost('/api/fido/register/begin');
  const { publicKey, challenge_token } = beginData;

  // Create the credential via the WebAuthn API and serialize it for the server
  const credential = await navigator.credentials.create(toCreateOptions(publicKey));
  const attestation = serializeAttestation(credential);

  // Complete registration on the server
  return await fidoPost('/api/fido/register/complete', {
    challenge_token,
    attestation,
  });
}

/**
 * Authenticate with a registered passkey.
 *
 * Flow:
 *   1. POST /fido/auth/begin → publicKey + challenge token
 *   2. navigator.credentials.get() → assertion
 *   3. POST /fido/auth/complete (assertion)
 */
export async function authenticatePasskey() {
  // Get authentication options and the challenge token from the server
  const beginData = await fidoPost('/api/fido/auth/begin');
  const { publicKey, challenge_token } = beginData;

  // Obtain the assertion via the WebAuthn API and serialize it for the server
  const assertion = await navigator.credentials.get(toGetOptions(publicKey));
  const assertionData = serializeAssertion(assertion);

  // Complete authentication on the server
  return await fidoPost('/api/fido/auth/complete', {
    challenge_token,
    assertion: assertionData,
  });
}
