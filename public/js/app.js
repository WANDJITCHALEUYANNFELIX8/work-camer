let jobsData = [];
let selectedJobId = null;

// Charger le portail et les offres au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) {
    window.location.href = '/auth.html';
    return;
  }

  // Remplir les informations utilisateur
  document.getElementById('user-display-name').innerText = `${user.prenom} ${user.nom}`;
  document.getElementById('user-role-text').innerText = user.type;

  // Gérer l'état de vérification CNI
  const cniIndicator = document.getElementById('cni-status-indicator');
  if (user.cniStatus === 'Verified') {
    cniIndicator.className = 'cni-status-indicator verified';
    cniIndicator.innerHTML = '🛡️ Identité CNI Vérifiée par la DGSN 🟢';
  } else if (user.cniStatus === 'Pending') {
    cniIndicator.className = 'cni-status-indicator pending';
    cniIndicator.innerHTML = '⏳ Vérification biométrique en cours... 🟡';
  } else {
    cniIndicator.className = 'cni-status-indicator not-submitted';
    cniIndicator.innerHTML = '⚠️ Identité non vérifiée - Cliquer ici pour valider 🔴';
    cniIndicator.style.cursor = 'pointer';
    cniIndicator.onclick = () => {
      window.location.href = '/auth.html';
    };
  }

  // Adapter les statistiques selon le rôle
  if (user.type === 'Candidat') {
    document.getElementById('stat-label-primary').innerText = 'Candidatures envoyées';
    document.getElementById('stat-label-secondary').innerText = 'Discussions actives';
  } else {
    document.getElementById('stat-label-primary').innerText = 'Offres publiées';
    document.getElementById('stat-label-secondary').innerText = 'Candidats inscrits';
    
    // Masquer le bouton de recherche pour le recruteur car il n'en a pas besoin en priorité
    const btnToggle = document.getElementById('btn-toggle-jobs');
    btnToggle.innerText = '📋 Gérer mes offres d\'emploi';
    btnToggle.onclick = () => {
      window.location.href = '/dashboard.html';
    };
  }

  // Charger les données du dashboard portal
  loadDashboardStats();
  loadNotifications();
  loadRecentDiscussions();

  // Écouter les nouvelles notifications via l'événement global
  window.addEventListener('new_notification', (e) => {
    loadDashboardStats();
    loadNotifications();
    loadRecentDiscussions();
  });
});

// --- CHARGER LES STATISTIQUES DU PORTAIL ---
async function loadDashboardStats() {
  try {
    const user = getUser();
    if (!user) return;

    let primaryCount = 0;
    let secondaryCount = 0;
    let tertiaryCount = 0;

    // Charger les notifications non lues pour le troisième widget
    const notifData = await apiCall('/notifications', { method: 'GET' });
    tertiaryCount = notifData.notifications.filter(n => !n.lu).length;
    document.getElementById('stat-count-tertiary').innerText = tertiaryCount;

    if (user.type === 'Candidat') {
      // Candidat: Mes candidatures et discussions actives
      const subData = await apiCall('/applications/my/submissions', { method: 'GET' });
      primaryCount = subData.submissions.length;

      const chatData = await apiCall('/messages/active/chats', { method: 'GET' });
      secondaryCount = chatData.chats.length;
    } else {
      // Recruteur: Mes offres et candidatures reçues
      const offersData = await apiCall('/jobs/my/offers', { method: 'GET' });
      primaryCount = offersData.jobs.length;

      // Boucler sur chaque offre pour compter le total des candidatures reçues
      for (const job of offersData.jobs) {
        try {
          const appData = await apiCall(`/applications/job/${job._id}`, { method: 'GET' });
          secondaryCount += appData.applications.length;
        } catch (err) {
          console.error('Erreur comptage candidatures pour job:', job._id, err.message);
        }
      }
    }

    document.getElementById('stat-count-primary').innerText = primaryCount;
    document.getElementById('stat-count-secondary').innerText = secondaryCount;

  } catch (error) {
    console.error('Erreur chargement statistiques portal :', error.message);
  }
}

// --- CHARGER LE CENTRE DE NOTIFICATIONS ---
async function loadNotifications() {
  try {
    const list = document.getElementById('notifications-list');
    const data = await apiCall('/notifications', { method: 'GET' });
    const notifications = data.notifications;

    list.innerHTML = '';

    if (notifications.length === 0) {
      list.innerHTML = '<p class="empty-state">Aucune notification pour le moment.</p>';
      return;
    }

    notifications.forEach(notif => {
      const item = document.createElement('div');
      item.className = `notification-item ${notif.lu ? 'read' : 'unread'}`;
      item.onclick = () => readNotification(notif._id, notif.lien);

      let icon = '🔔';
      if (notif.type === 'application_status') icon = '💼';
      if (notif.type === 'new_application') icon = '📥';
      if (notif.type === 'new_message') icon = '💬';
      if (notif.type === 'cni_verified') icon = '🛡️';

      const timeStr = new Date(notif.createdAt).toLocaleDateString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      item.innerHTML = `
        <span class="notif-icon">${icon}</span>
        <div class="notif-content">
          <p class="notif-text">${notif.texte}</p>
          <span class="notif-time">${timeStr}</span>
        </div>
        ${!notif.lu ? '<span class="unread-dot"></span>' : ''}
      `;
      list.appendChild(item);
    });
  } catch (error) {
    console.error('Erreur chargement notifications:', error.message);
  }
}

// --- LIRE UNE NOTIFICATION ---
async function readNotification(id, lien) {
  try {
    await apiCall(`/notifications/${id}/read`, { method: 'PUT' });
    updateUnreadNotifBadge();
    
    if (lien) {
      window.location.href = lien;
    } else {
      loadNotifications();
      loadDashboardStats();
    }
  } catch (error) {
    console.error('Erreur lecture notification:', error.message);
  }
}

// --- TOUT MARQUER COMME LU ---
async function markAllNotificationsAsRead() {
  try {
    await apiCall('/notifications/read-all', { method: 'PUT' });
    showToast('Toutes les notifications sont lues', 'success');
    updateUnreadNotifBadge();
    loadNotifications();
    loadDashboardStats();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// --- TOUT EFFACER ---
async function clearAllNotifications() {
  try {
    await apiCall('/notifications', { method: 'DELETE' });
    showToast('Historique des notifications effacé', 'success');
    updateUnreadNotifBadge();
    loadNotifications();
    loadDashboardStats();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// --- CHARGER LES DISCUSSIONS RECENTES (MINI-CHAT) ---
async function loadRecentDiscussions() {
  try {
    const list = document.getElementById('mini-chat-list');
    const data = await apiCall('/messages/active/chats', { method: 'GET' });
    const chats = data.chats;

    list.innerHTML = '';

    if (chats.length === 0) {
      list.innerHTML = '<p class="empty-state">Aucun échange récent.</p>';
      return;
    }

    // Afficher les 4 plus récents
    chats.slice(0, 4).forEach(chat => {
      const c = chat.contact;
      const lastMsg = chat.lastMessage;
      const item = document.createElement('div');
      item.className = 'mini-chat-item';
      item.onclick = () => window.location.href = `/chat.html?contact=${c._id}`;

      const text = lastMsg ? lastMsg.texte : 'Débuter la discussion';
      const truncated = text.length > 35 ? text.substring(0, 35) + '...' : text;

      item.innerHTML = `
        <div class="avatar">${c.prenom[0]}${c.nom[0]}</div>
        <div class="details">
          <h4>${c.prenom} ${c.nom} <span class="role-pill">${c.type}</span></h4>
          <p>${truncated}</p>
        </div>
        <span class="chevron">➔</span>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    console.error('Erreur chargement discussions récentes:', error.message);
  }
}

// --- AFFICHER / MASQUER LA RECHERCHE DE JOBS ---
function toggleJobsSection() {
  const section = document.getElementById('jobs-search-section');
  const btn = document.getElementById('btn-toggle-jobs');

  if (section.style.display === 'none') {
    section.style.display = 'block';
    btn.innerText = ' Masquer la Recherche d\'Offres';
    btn.className = 'btn btn-secondary';
    
    // Charger les offres si vide
    if (jobsData.length === 0) {
      loadJobs();
    }
    
    // Scroller vers la section
    section.scrollIntoView({ behavior: 'smooth' });
  } else {
    section.style.display = 'none';
    btn.innerText = '💼 Afficher les Offres Disponibles';
    btn.className = 'btn btn-primary';
  }
}

// --- APPPELER L'API DES OFFRES D'EMPLOI ---
async function loadJobs(queryString = '') {
  try {
    const listContainer = document.getElementById('job-list');
    const noJobsBox = document.getElementById('no-jobs');
    
    listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Chargement des offres...</div>';
    noJobsBox.style.display = 'none';

    const data = await apiCall(`/jobs?${queryString}`, { method: 'GET' });
    jobsData = data.jobs;

    listContainer.innerHTML = '';

    if (jobsData.length === 0) {
      noJobsBox.style.display = 'block';
      return;
    }

    jobsData.forEach(job => {
      const card = document.createElement('div');
      card.className = 'glass-panel job-card';
      card.onclick = () => openJobModal(job._id);

      const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';

      card.innerHTML = `
        <span class="type-badge">${job.type}</span>
        <div class="budget-tag">${formattedBudget}</div>
        <h3 style="margin-top: 0.5rem;">${job.titre}</h3>
        <p style="font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-bottom: 0.75rem;">${job.domaine}</p>
        <p class="description">${job.description}</p>
        <div class="meta">
          <div class="author">
            👤 <span>${job.auteur.prenom} ${job.auteur.nom[0]}.</span>
          </div>
          <div>📍 ${job.localisation.quartier}, ${job.localisation.ville}</div>
        </div>
      `;

      listContainer.appendChild(card);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Appliquer les filtres
function applyFilters() {
  const search = document.getElementById('search-keyword').value;
  const ville = document.getElementById('filter-ville').value;
  const quartier = document.getElementById('filter-quartier').value;
  const type = document.getElementById('filter-type').value;
  const domaine = document.getElementById('filter-domaine').value;
  const budgetMin = document.getElementById('filter-budget-min').value;
  const budgetMax = document.getElementById('filter-budget-max').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (ville) params.append('ville', ville);
  if (quartier) params.append('quartier', quartier);
  if (type) params.append('type', type);
  if (domaine) params.append('domaine', domaine);
  if (budgetMin) params.append('budgetMin', budgetMin);
  if (budgetMax) params.append('budgetMax', budgetMax);

  loadJobs(params.toString());
}

// Réinitialiser les filtres
function resetFilters() {
  document.getElementById('filters-form').reset();
  document.getElementById('search-keyword').value = '';
  loadJobs();
}

// Ouvrir la modal de détail de l'offre
function openJobModal(jobId) {
  const job = jobsData.find(j => j._id === jobId);
  if (!job) return;

  selectedJobId = jobId;
  const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';

  document.getElementById('modal-job-type').innerText = job.type;
  document.getElementById('modal-job-title').innerText = job.titre;
  document.getElementById('modal-job-budget').innerText = formattedBudget;
  document.getElementById('modal-job-desc').innerText = job.description;
  document.getElementById('modal-job-domaine').innerText = job.domaine;
  document.getElementById('modal-job-loc').innerText = `${job.localisation.quartier}, ${job.localisation.ville}`;
  document.getElementById('modal-job-author').innerText = `${job.auteur.prenom} ${job.auteur.nom}`;
  
  const cniBadgeHtml = job.auteur.cniStatus === 'Verified' 
    ? '<span class="cni-badge verified">Vérifié</span>' 
    : '<span class="cni-badge not-submitted">Non vérifié</span>';
  document.getElementById('modal-job-author-cni').innerHTML = cniBadgeHtml;

  // Gérer le bloc candidature
  const user = getUser();
  const appBlock = document.getElementById('application-block');

  if (!user) {
    appBlock.innerHTML = `
      <div style="text-align: center; padding: 1rem; border: 1px dashed var(--border-glass); border-radius: var(--radius-md);">
        <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">Vous devez être connecté pour postuler à cette offre.</p>
        <a href="/auth.html" class="btn btn-primary">Se connecter / S'inscrire</a>
      </div>
    `;
  } else if (user._id === job.auteur._id) {
    appBlock.innerHTML = `
      <div style="background: rgba(34, 197, 94, 0.05); color: var(--primary); padding: 1rem; border-radius: var(--radius-md); text-align: center; font-weight: 600;">
        💡 Vous êtes l'auteur de cette offre d'emploi.
      </div>
    `;
  } else if (user.cniStatus !== 'Verified') {
    appBlock.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.05); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(239, 68, 68, 0.15);">
        <p style="margin-bottom: 0.75rem; font-weight: 600;">⚠️ Vérification CNI requise</p>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
          Pour la sécurité du marché, vous devez valider votre identité avant de postuler.
        </p>
        <button onclick="triggerCniWarning()" class="btn btn-danger" style="font-size: 0.85rem; width: 100%;">
          Faire valider ma CNI
        </button>
      </div>
    `;
  } else {
    // Connecté + CNI Validé + Pas l'auteur
    appBlock.innerHTML = `
      <form id="apply-form" onsubmit="submitApplication(event)">
        <div class="form-group">
          <label for="motivation-input">Message de motivation (Vos compétences, disponibilités, etc.)</label>
          <textarea id="motivation-input" class="form-control" rows="4" placeholder="Bonjour, je suis disponible immédiatement..." required></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Envoyer ma candidature</button>
      </form>
    `;
  }

  document.getElementById('job-modal').classList.add('active');
}

// Fermer la modal
function closeJobModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('job-modal').classList.remove('active');
}

// Déclencher l'avertissement CNI
function triggerCniWarning() {
  closeJobModal();
  document.getElementById('cni-warning-modal').classList.add('active');
}

function closeCniWarningModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('cni-warning-modal').classList.remove('active');
}

// Soumettre une candidature
async function submitApplication(e) {
  e.preventDefault();
  
  const motivation = document.getElementById('motivation-input').value;

  try {
    await apiCall('/applications', {
      method: 'POST',
      body: JSON.stringify({
        jobId: selectedJobId,
        motivation
      })
    });

    showToast('Candidature soumise avec succès !', 'success');
    closeJobModal();
    
    // Recharger les stats
    loadDashboardStats();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
