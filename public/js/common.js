const API_URL = window.location.origin;

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const userStr = localStorage.getItem('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Echapper les caractères HTML pour prévenir le XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { ...options, headers };
  const response = await fetch(`${API_URL}/api${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    // Si le token est expiré, déconnecter automatiquement
    if (response.status === 401) {
      clearAuth();
      window.location.href = '/auth.html';
      return;
    }
    throw new Error(data.message || 'Une erreur est survenue');
  }

  return data;
}

function showToast(message, type = 'success') {
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✅' : '❌';
  // Utiliser textContent pour le message pour éviter l'injection XSS via les messages d'erreur
  const iconSpan = document.createElement('span');
  iconSpan.textContent = icon;
  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;
  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function updateNavbar() {
  const user = getUser();
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  if (user) {
    let badgeHtml = '';
    if (user.cniStatus === 'Verified') {
      badgeHtml = `<span class="cni-badge verified">CNI Vérifié</span>`;
    } else if (user.cniStatus === 'Pending') {
      badgeHtml = `<span class="cni-badge pending">CNI En Cours</span>`;
    } else {
      badgeHtml = `<span class="cni-badge not-submitted">CNI Non Vérifié</span>`;
    }

    navLinks.innerHTML = `
      <li><a href="/index.html" class="nav-link">Accueil Portal</a></li>
      <li><a href="/dashboard.html" class="nav-link">Tableau de bord</a></li>
      <li><a href="/chat.html" class="nav-link">Discussions</a></li>
      <li style="position: relative;">
        <a href="/index.html#notifications-block" class="nav-link" title="Notifications">
          🔔<span id="notif-badge" class="nav-badge" style="display: none;">0</span>
        </a>
      </li>
      <li style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600; color: var(--text-primary);">${escapeHtml(user.prenom)} (${escapeHtml(user.type)})</span>
        ${badgeHtml}
      </li>
      <li><button onclick="logout()" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Déconnexion</button></li>
    `;
    updateUnreadNotifBadge();
  } else {
    navLinks.innerHTML = `
      <li><a href="/index.html" class="nav-link">Accueil Portal</a></li>
      <li><a href="/auth.html" class="btn btn-secondary">Connexion</a></li>
      <li><a href="/auth.html?mode=register" class="btn btn-primary">S'inscrire</a></li>
    `;
  }
}

async function updateUnreadNotifBadge() {
  if (!getToken()) return;
  try {
    const data = await apiCall('/notifications', { method: 'GET' });
    const unreadCount = data.notifications.filter(n => !n.lu).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Erreur badge notifications:', err.message);
  }
}

let globalSocket = null;
function initGlobalSocket() {
  const token = getToken();
  if (token && typeof io !== 'undefined') {
    globalSocket = io({ auth: { token } });

    globalSocket.on('notification', (notif) => {
      showToast(notif.texte, 'success');
      updateUnreadNotifBadge();
      window.dispatchEvent(new CustomEvent('new_notification', { detail: notif }));
    });
  }
}

function logout() {
  clearAuth();
  showToast('Déconnecté avec succès', 'success');
  setTimeout(() => { window.location.href = '/auth.html'; }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const user = getUser();
  const path = window.location.pathname;
  const isAuthPage = path.includes('auth.html');

  if (!token || !user) {
    if (!isAuthPage) {
      window.location.href = '/auth.html';
      return;
    }
  } else {
    if (isAuthPage && user.cniStatus === 'Verified') {
      window.location.href = '/index.html';
      return;
    }
    initGlobalSocket();
  }

  updateNavbar();
});
