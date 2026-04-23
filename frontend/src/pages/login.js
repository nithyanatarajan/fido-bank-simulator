/**
 * Login/New Account page with tab switching.
 */
import { login, register } from '../api.js';

export function renderLogin(container, onLogin) {
  let activeTab = 'login';

  function render() {
    container.innerHTML = `
      <div class="auth-container">
        <div class="text-center mb-4">
          <h2 class="fw-bold">SimpleFIDO Demo Bank</h2>
          <p class="text-muted">Secure banking with passkey authentication</p>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body p-4">
            <ul class="nav nav-pills nav-fill mb-4" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link ${activeTab === 'login' ? 'active' : ''}" data-tab="login" type="button">
                  Login
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link ${activeTab === 'register' ? 'active' : ''}" data-tab="register" type="button">
                  New Account
                </button>
              </li>
            </ul>
            <form id="auth-form">
              <div class="mb-3">
                <label for="username" class="form-label">Username</label>
                <input type="text" class="form-control" id="username" data-testid="username"
                       required autocomplete="username" placeholder="Enter your username" />
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" data-testid="password"
                       required autocomplete="current-password" placeholder="Enter your password" />
              </div>
              <button type="submit" class="btn btn-primary w-100 py-2" data-testid="submit-btn">
                ${activeTab === 'login' ? 'Login' : 'Create Account'}
              </button>
              <div id="auth-error" class="text-danger mt-3 small" data-testid="auth-error"></div>
              <div id="auth-success" class="text-success mt-3 small" data-testid="auth-success"></div>
            </form>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.nav-link').forEach((tab) => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        render();
      });
    });

    container.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = container.querySelector('#username').value;
      const password = container.querySelector('#password').value;
      const errorEl = container.querySelector('#auth-error');
      const successEl = container.querySelector('#auth-success');
      errorEl.textContent = '';
      successEl.textContent = '';

      try {
        if (activeTab === 'register') {
          await register(username, password);
          successEl.textContent = 'Account created! Logging you in...';
          await login(username, password);
          onLogin(username);
        } else {
          await login(username, password);
          onLogin(username);
        }
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  }

  render();
}
