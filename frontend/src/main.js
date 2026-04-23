/**
 * SPA entry point — routes between login and dashboard views.
 */
import 'bootstrap/dist/css/bootstrap.min.css';
import { getMe } from './api.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderLogin } from './pages/login.js';

const app = document.getElementById('app');

function showLogin() {
  renderLogin(app, (username) => showDashboard(username));
}

function showDashboard(username) {
  renderDashboard(app, username, () => showLogin());
}

async function init() {
  try {
    const user = await getMe();
    showDashboard(user.username);
  } catch {
    showLogin();
  }
}

init();
