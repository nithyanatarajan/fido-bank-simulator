/**
 * Dashboard page showing user info, passkeys, and actions.
 */
import { logout } from '../api.js';

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

  container.querySelector('#logout-btn').addEventListener('click', async () => {
    await logout();
    onLogout();
  });

  // Passkey and transfer buttons will be wired in later tasks
}
