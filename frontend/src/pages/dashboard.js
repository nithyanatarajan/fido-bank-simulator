/**
 * Dashboard page showing user info, passkeys, and actions.
 */
import { logout } from '../api.js';
import { registerPasskey } from '../webauthn.js';

/**
 * Load and display the passkey list.
 * @param {HTMLElement} listEl
 */
async function loadPasskeys(listEl) {
  try {
    const resp = await fetch('/fido/credentials');
    if (!resp.ok) return;
    const data = await resp.json();
    const creds = data.credentials || [];
    if (creds.length === 0) {
      listEl.innerHTML = '<li>No passkeys registered</li>';
    } else {
      listEl.innerHTML = creds
        .map(
          (c, i) =>
            `<li data-testid="passkey-item">Passkey ${i + 1}: ${c.credential_id.substring(0, 16)}...</li>`,
        )
        .join('');
    }
  } catch {
    // Silently fail — list stays as-is
  }
}

/**
 * Render the dashboard into the given container.
 * @param {HTMLElement} container
 * @param {string} username
 * @param {function} onLogout - callback when logout completes
 */
export function renderDashboard(container, username, onLogout) {
  container.innerHTML = `
    <h1>FIDO Bank</h1>
    <div class="card">
      <h2>Welcome, <span data-testid="welcome-user">${username}</span></h2>
    </div>
    <div class="card">
      <h2>Passkeys</h2>
      <ul class="passkey-list" data-testid="passkey-list">
        <li>No passkeys registered</li>
      </ul>
      <div style="margin-top: 1rem;">
        <button class="btn-primary" data-testid="add-passkey-btn" id="add-passkey-btn">Add Passkey</button>
      </div>
      <div id="passkey-message" class="success" data-testid="passkey-message"></div>
    </div>
    <div class="card">
      <div class="actions">
        <button class="btn-secondary" data-testid="transfer-btn" id="transfer-btn">Transfer Money</button>
        <button class="btn-danger" data-testid="logout-btn" id="logout-btn">Logout</button>
      </div>
      <div id="transfer-message" data-testid="transfer-message"></div>
    </div>
  `;

  const passkeyList = container.querySelector('[data-testid="passkey-list"]');
  const passkeyMsg = container.querySelector('#passkey-message');

  // Load existing passkeys
  loadPasskeys(passkeyList);

  // Wire Add Passkey button
  container.querySelector('#add-passkey-btn').addEventListener('click', async () => {
    passkeyMsg.textContent = '';
    passkeyMsg.className = 'success';
    try {
      await registerPasskey();
      passkeyMsg.textContent = 'Passkey registered successfully!';
      await loadPasskeys(passkeyList);
    } catch (err) {
      passkeyMsg.textContent = err.message;
      passkeyMsg.className = 'error';
    }
  });

  // Logout
  container.querySelector('#logout-btn').addEventListener('click', async () => {
    await logout();
    onLogout();
  });
}
