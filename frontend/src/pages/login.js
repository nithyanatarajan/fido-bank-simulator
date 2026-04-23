/**
 * Login/Register page with tab switching.
 */
import { login, register } from '../api.js';

/**
 * Render the login/register page into the given container.
 * @param {HTMLElement} container
 * @param {function} onLogin - callback when login succeeds
 */
export function renderLogin(container, onLogin) {
  let activeTab = 'login';

  function render() {
    container.innerHTML = `
      <h1>FIDO Bank</h1>
      <div class="card">
        <div class="tabs">
          <button class="tab ${activeTab === 'login' ? 'active' : ''}" data-tab="login">Login</button>
          <button class="tab ${activeTab === 'register' ? 'active' : ''}" data-tab="register">Register</button>
        </div>
        <form id="auth-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" data-testid="username" required autocomplete="username" />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" data-testid="password" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn-primary" data-testid="submit-btn">
            ${activeTab === 'login' ? 'Login' : 'Register'}
          </button>
          <div id="auth-error" class="error" data-testid="auth-error"></div>
          <div id="auth-success" class="success" data-testid="auth-success"></div>
        </form>
      </div>
    `;

    container.querySelectorAll('.tab').forEach((tab) => {
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
          successEl.textContent = 'Registration successful! Logging you in...';
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
