const API_URL = window.location.origin;

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
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

  const response = await fetch(`${API_URL}/api${endpoint}`, { ...options, headers });
  const data = await response.json();

  // CORRECTION : rediriger vers login si le token est expiré/invalide (401)
  if (response.status === 401) {
    clearAuth();
    window.location.href = '/auth.html';
    return;
  }

  if (!response.ok) {
    throw new Error(data.message || "Une erreur est survenue lors de l'appel API");
  }

  return data;
}

function showToast(message, type = 'success') {
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : '❌';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
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
        <span style="font-weight: 600; color: var(--text-primary);">${user.prenom} (${user.type})</span>
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
    if (!data) return;
    const unreadCount = data.notifications.filter(n => !n.lu).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.innerText = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }
  } catch (err) {
    console.error('Erreur badge notifications :', err.message);
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

    // CORRECTION : gérer l'expiration du token sur le socket
    globalSocket.on('connect_error', (err) => {
      if (err.message && err.message.includes('Token')) {
        clearAuth();
        window.location.href = '/auth.html';
      }
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
