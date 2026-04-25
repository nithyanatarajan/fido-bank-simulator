/**
 * Dashboard page showing user info, passkeys, and banking actions.
 */
import { getApiUrl, logout } from '../api.js';
import { authenticatePasskey, registerPasskey } from '../webauthn.js';

/**
 * Escape a string for safe insertion into HTML attributes.
 * @param {string} str
 * @returns {string}
 */
function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function loadPasskeys(listEl, onDelete) {
  try {
    const resp = await fetch(`${getApiUrl()}/fido/credentials`, { credentials: 'include' });
    if (!resp.ok) return;
    const data = await resp.json();
    const creds = data.credentials || [];
    if (creds.length === 0) {
      listEl.innerHTML = `
        <div class="text-center text-muted py-4">
          <div class="mb-2" style="font-size: 2rem;">&#128274;</div>
          <p class="mb-0">No passkeys registered yet</p>
          <small>Add a passkey to enable secure step-up authentication</small>
        </div>
      `;
    } else {
      // Build passkey list items using DOM API to avoid XSS
      listEl.innerHTML = '';
      creds.forEach((c, i) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.setAttribute('data-testid', 'passkey-item');

        const itemDiv = document.createElement('div');
        itemDiv.className = 'passkey-item';

        const icon = document.createElement('span');
        icon.className = 'passkey-icon';
        icon.textContent = '\u{1F511}';

        const infoDiv = document.createElement('div');
        const nameDiv = document.createElement('div');
        nameDiv.className = 'fw-medium';
        nameDiv.textContent = `Passkey ${i + 1}`;
        const idSmall = document.createElement('small');
        idSmall.className = 'text-muted';
        idSmall.textContent = `${c.credential_id.substring(0, 20)}...`;
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(idSmall);

        itemDiv.appendChild(icon);
        itemDiv.appendChild(infoDiv);

        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-danger btn-sm';
        btn.setAttribute('data-testid', 'delete-passkey-btn');
        btn.setAttribute('data-credential-id', c.credential_id);
        btn.textContent = '\u2715';
        btn.addEventListener('click', () => onDelete(c.credential_id));

        li.appendChild(itemDiv);
        li.appendChild(btn);
        listEl.appendChild(li);
      });
    }
  } catch {
    listEl.innerHTML = '<div class="text-center text-muted py-3">Failed to load passkeys</div>';
  }
}

export function renderDashboard(container, username, onLogout) {
  // Build the static shell without user data in innerHTML
  container.innerHTML = `
    <nav class="navbar navbar-expand navbar-dark bg-dark">
      <div class="container">
        <span class="navbar-brand">SimpleFIDO Demo Bank</span>
        <div class="d-flex align-items-center gap-3">
          <span class="text-light small" data-testid="welcome-user" id="welcome-user"></span>
          <button class="btn btn-outline-light btn-sm" data-testid="logout-btn" id="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>

    <div class="dashboard-container">
      <div class="row g-4 mt-1">
        <!-- Security Section -->
        <div class="col-md-6">
          <div class="card shadow-sm border-0 h-100">
            <div class="card-header bg-white border-0 pb-0">
              <h5 class="card-title mb-0">&#128737; Security</h5>
            </div>
            <div class="card-body">
              <p class="text-muted small mb-3">
                Passkeys let you verify your identity for sensitive actions.
              </p>
              <ul class="list-group list-group-flush mb-3" id="passkey-list" data-testid="passkey-list">
                <li class="list-group-item text-center text-muted py-3">Loading...</li>
              </ul>
              <button class="btn btn-primary" data-testid="add-passkey-btn" id="add-passkey-btn">
                + Add Passkey
              </button>
              <div id="passkey-message" class="mt-2 small" data-testid="passkey-message"></div>
            </div>
          </div>
        </div>

        <!-- Banking Section -->
        <div class="col-md-6">
          <div class="card shadow-sm border-0 h-100">
            <div class="card-header bg-white border-0 pb-0">
              <h5 class="card-title mb-0">&#128179; Banking</h5>
            </div>
            <div class="card-body">
              <p class="text-muted small mb-3">
                Transfers require step-up verification with a registered passkey.
              </p>
              <button class="btn btn-success" data-testid="transfer-btn" id="transfer-btn">
                Transfer Money
              </button>
              <div id="transfer-message" class="mt-2 small" data-testid="transfer-message"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step-up verification overlay (hidden by default) -->
    <div id="step-up-overlay" class="step-up-overlay" style="display: none;">
      <div class="step-up-card">
        <div style="font-size: 3rem;" class="mb-3">&#128273;</div>
        <h5 class="fw-bold mb-2">Verify Your Identity</h5>
        <p class="text-muted mb-3" id="step-up-text">Use your passkey to authorize this transfer.</p>
        <div class="spinner-border text-primary" role="status" id="step-up-spinner">
          <span class="visually-hidden">Verifying...</span>
        </div>
      </div>
    </div>
  `;

  // Set username via textContent to prevent XSS
  container.querySelector('#welcome-user').textContent = username;

  const passkeyList = container.querySelector('#passkey-list');
  const passkeyMsg = container.querySelector('#passkey-message');
  const transferMsg = container.querySelector('#transfer-message');
  const stepUpOverlay = container.querySelector('#step-up-overlay');
  const stepUpText = container.querySelector('#step-up-text');
  const stepUpSpinner = container.querySelector('#step-up-spinner');

  async function handleDeletePasskey(credentialId) {
    try {
      const resp = await fetch(`${getApiUrl()}/fido/credentials/${escapeAttr(credentialId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.message || 'Delete failed');
      }
      await loadPasskeys(passkeyList, handleDeletePasskey);
    } catch (err) {
      passkeyMsg.textContent = err.message;
      passkeyMsg.className = 'mt-2 small text-danger';
    }
  }

  loadPasskeys(passkeyList, handleDeletePasskey);

  // Add Passkey
  container.querySelector('#add-passkey-btn').addEventListener('click', async () => {
    passkeyMsg.textContent = '';
    passkeyMsg.className = 'mt-2 small';
    try {
      passkeyMsg.textContent = 'Waiting for authenticator...';
      passkeyMsg.classList.add('text-muted');
      await registerPasskey();
      passkeyMsg.textContent = 'Passkey registered successfully!';
      passkeyMsg.className = 'mt-2 small text-success';
      await loadPasskeys(passkeyList, handleDeletePasskey);
    } catch (err) {
      passkeyMsg.textContent = err.message;
      passkeyMsg.className = 'mt-2 small text-danger';
    }
  });

  // Transfer Money with step-up
  container.querySelector('#transfer-btn').addEventListener('click', async () => {
    transferMsg.textContent = '';
    transferMsg.className = 'mt-2 small';
    try {
      const resp = await fetch(`${getApiUrl()}/transfer`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.message || 'Transfer failed');
      }
      const data = await resp.json();

      if (data.status === 'step_up_required') {
        stepUpOverlay.style.display = 'flex';
        stepUpText.textContent = 'Use your passkey to authorize this transfer.';
        stepUpText.className = 'text-muted mb-3';
        stepUpSpinner.style.display = '';
        try {
          await authenticatePasskey();
          stepUpText.textContent = 'Verified! Transfer complete.';
          stepUpText.className = 'text-success mb-3 fw-medium';
          stepUpSpinner.style.display = 'none';
          setTimeout(() => {
            stepUpOverlay.style.display = 'none';
            transferMsg.textContent = 'Transfer completed successfully!';
            transferMsg.className = 'mt-2 small text-success';
          }, 1500);
        } catch (authErr) {
          stepUpText.textContent = `Verification failed: ${authErr.message}`;
          stepUpText.className = 'text-danger mb-3';
          stepUpSpinner.style.display = 'none';
          setTimeout(() => {
            stepUpOverlay.style.display = 'none';
            transferMsg.textContent = `Step-up failed: ${authErr.message}`;
            transferMsg.className = 'mt-2 small text-danger';
          }, 2000);
        }
      } else {
        transferMsg.textContent = 'Transfer completed successfully!';
        transferMsg.className = 'mt-2 small text-success';
      }
    } catch (err) {
      transferMsg.textContent = err.message;
      transferMsg.className = 'mt-2 small text-danger';
    }
  });

  // Logout
  container.querySelector('#logout-btn').addEventListener('click', async () => {
    await logout();
    onLogout();
  });
}
