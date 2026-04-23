/**
 * SPA entry point — routes between login and dashboard views.
 */
import { getMe } from './api.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderLogin } from './pages/login.js';

const app = document.getElementById('app');

/**
 * Show the login page.
 */
function showLogin() {
  renderLogin(app, (username) => {
    showDashboard(username);
  });
}

/**
 * Show the dashboard for the given user.
 * @param {string} username
 */
function showDashboard(username) {
  renderDashboard(app, username, () => {
    showLogin();
  });
}

/**
 * Initialize: check session and route accordingly.
 */
async function init() {
  try {
    const user = await getMe();
    showDashboard(user.username);
  } catch {
    showLogin();
  }
}

init();
