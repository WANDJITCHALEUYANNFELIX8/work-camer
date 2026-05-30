// Client utilities
const API_URL = window.location.origin;

// Récupérer le token depuis le stockage local
function getToken() {
  return localStorage.getItem('token');
}

// Récupérer les données de l'utilisateur stocké
function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Enregistrer le token et l'utilisateur
function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Supprimer la session d'authentification
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Fonction de requête API globale pour gérer automatiquement les en-têtes d'authentification
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers
  };
  
  const response = await fetch(`${API_URL}/api${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Une erreur est survenue lors de l\'appel API');
  }
  
  return data;
}

// Notifications toast dynamiques
function showToast(message, type = 'success') {
  // Supprimer les anciens toasts si existants
  const oldToast = document.querySelector('.toast');
  if (oldToast) {
    oldToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : '❌';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  document.body.appendChild(toast);
  
  // Faire disparaître après 4 secondes
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Mettre à jour la barre de navigation
function handleCommencer(e) {
  if (!getUser()) {
    e.preventDefault();
    window.location.href = '/auth.html?mode=register';
  }
}

function updateNavbar() {
  const user = getUser();
  const navLinks = document.getElementById('nav-links');

  if (!navLinks) return;

  const currentPath = window.location.pathname;
  const isActive = (path) => currentPath === path || (path === '/index.html' && currentPath === '/') ? 'active-link' : '';

  if (user) {
    // Badge CNI
    let cniHtml = '';
    if (user.cniStatus === 'Verified') {
      cniHtml = `<span class="cni-badge verified" style="font-size:0.7rem;padding:0.2rem 0.5rem;letter-spacing:1px;font-weight:800">CNI VÉRIFIÉ</span>`;
    } else if (user.cniStatus === 'Pending') {
      cniHtml = `<span class="cni-badge pending" style="font-size:0.7rem;padding:0.2rem 0.5rem">CNI EN COURS</span>`;
    } else {
      cniHtml = `<span class="cni-badge not-submitted" style="font-size:0.7rem;padding:0.2rem 0.5rem">CNI NON SOUMIS</span>`;
    }
  
    navLinks.innerHTML = `
      <li><a href="/index.html" class="nav-link ${isActive('/index.html')}">Accueil</a></li>
      <li><a href="/recherche.html" class="nav-link ${isActive('/recherche.html')}">Emplois en Live</a></li>
      <li><a href="/dashboard.html" class="nav-link ${isActive('/dashboard.html')}">Tableau de bord</a></li>
      <li><a href="/chat.html" class="nav-link ${isActive('/chat.html')}">Discussions</a></li>

      <li style="display:flex;align-items:center;gap:6px">
        <span style="font-weight:600;color:var(--text-primary);font-size:0.9rem">${user.prenom} (${user.type})</span>
        ${cniHtml}
      </li>
      <li><button onclick="logout()" class="btn btn-secondary" style="padding:0.4rem 0.9rem;font-size:0.82rem">Déconnexion</button></li>
       <li>
        <button onclick="void(0)" style="background:none;border:none;cursor:pointer;color:var(--secondary);position:relative;padding:4px" title="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
      </li>
    `;
  } else {
    navLinks.innerHTML = `
      <li><a href="/index.html" class="nav-link ${isActive('/index.html')}">Accueil</a></li>
      <li><a href="/recherche.html" class="nav-link ${isActive('/recherche.html')}">Emplois en Live</a></li>
      <li><a href="/auth.html?mode=register" class="btn btn-primary" style="padding:0.4rem 0.9rem;font-size:0.85rem">S'inscrire</a></li>
    `;
  }
}

// Déconnexion
function logout() {
  clearAuth();
  showToast('Déconnecté avec succès', 'success');
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 1000);
}

// Initialisation globale de la page
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
});