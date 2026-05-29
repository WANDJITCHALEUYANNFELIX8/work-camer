let jobsData = [];
let selectedJobId = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) {
    window.location.href = '/auth.html';
    return;
  }

  // Utiliser textContent pour les données utilisateur (protection XSS)
  document.getElementById('user-display-name').textContent = `${user.prenom} ${user.nom}`;
  document.getElementById('user-role-text').textContent = user.type;

  const cniIndicator = document.getElementById('cni-status-indicator');
  if (user.cniStatus === 'Verified') {
    cniIndicator.className = 'cni-status-indicator verified';
    cniIndicator.textContent = '🛡️ Identité CNI Vérifiée par la DGSN 🟢';
  } else if (user.cniStatus === 'Pending') {
    cniIndicator.className = 'cni-status-indicator pending';
    cniIndicator.textContent = '⏳ Vérification biométrique en cours... 🟡';
  } else {
    cniIndicator.className = 'cni-status-indicator not-submitted';
    cniIndicator.textContent = '⚠️ Identité non vérifiée - Cliquer ici pour valider 🔴';
    cniIndicator.style.cursor = 'pointer';
    cniIndicator.onclick = () => { window.location.href = '/auth.html'; };
  }

  if (user.type === 'Candidat') {
    document.getElementById('stat-label-primary').textContent = 'Candidatures envoyées';
    document.getElementById('stat-label-secondary').textContent = 'Discussions actives';
  } else {
    document.getElementById('stat-label-primary').textContent = 'Offres publiées';
    document.getElementById('stat-label-secondary').textContent = 'Candidatures reçues';
    const btnToggle = document.getElementById('btn-toggle-jobs');
    btnToggle.textContent = '📋 Gérer mes offres d\'emploi';
    btnToggle.onclick = () => { window.location.href = '/dashboard.html'; };
  }

  loadDashboardStats();
  loadNotifications();
  loadRecentDiscussions();

  window.addEventListener('new_notification', () => {
    loadDashboardStats();
    loadNotifications();
    loadRecentDiscussions();
  });
});

async function loadDashboardStats() {
  try {
    const user = getUser();
    if (!user) return;

    const notifData = await apiCall('/notifications', { method: 'GET' });
    const tertiaryCount = notifData.notifications.filter(n => !n.lu).length;
    document.getElementById('stat-count-tertiary').textContent = tertiaryCount;

    if (user.type === 'Candidat') {
      const subData = await apiCall('/applications/my/submissions', { method: 'GET' });
      document.getElementById('stat-count-primary').textContent = subData.submissions.length;

      const chatData = await apiCall('/messages/active/chats', { method: 'GET' });
      document.getElementById('stat-count-secondary').textContent = chatData.chats.length;
    } else {
      const offersData = await apiCall('/jobs/my/offers', { method: 'GET' });
      document.getElementById('stat-count-primary').textContent = offersData.jobs.length;

      // Compter le total des candidatures reçues via une seule route dédiée
      // On réutilise les données des offres pour calculer sans appels N+1
      // (amélioration future : endpoint /applications/recruiter/total)
      let totalCandidatures = 0;
      for (const job of offersData.jobs) {
        try {
          const appData = await apiCall(`/applications/job/${job._id}`, { method: 'GET' });
          totalCandidatures += appData.applications.length;
        } catch (err) {
          // On continue même si une offre échoue
        }
      }
      document.getElementById('stat-count-secondary').textContent = totalCandidatures;
    }
  } catch (error) {
    console.error('Erreur stats portal:', error.message);
  }
}

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

      const icons = {
        application_status: '💼',
        new_application: '📥',
        new_message: '💬',
        cni_verified: '🛡️'
      };
      const icon = icons[notif.type] || '🔔';

      const timeStr = new Date(notif.createdAt).toLocaleDateString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Utiliser escapeHtml sur le texte de notification (peut contenir des noms d'utilisateurs)
      item.innerHTML = `
        <span class="notif-icon">${icon}</span>
        <div class="notif-content">
          <p class="notif-text">${escapeHtml(notif.texte)}</p>
          <span class="notif-time">${timeStr}</span>
        </div>
        ${!notif.lu ? '<span class="unread-dot"></span>' : ''}
      `;
      list.appendChild(item);
    });
  } catch (error) {
    console.error('Erreur notifications:', error.message);
  }
}

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

    chats.slice(0, 4).forEach(chat => {
      const c = chat.contact;
      const lastMsg = chat.lastMessage;
      const item = document.createElement('div');
      item.className = 'mini-chat-item';
      item.onclick = () => window.location.href = `/chat.html?contact=${c._id}`;

      const text = lastMsg ? lastMsg.texte : 'Débuter la discussion';
      const truncated = text.length > 35 ? text.substring(0, 35) + '...' : text;

      item.innerHTML = `
        <div class="avatar">${escapeHtml(c.prenom[0])}${escapeHtml(c.nom[0])}</div>
        <div class="details">
          <h4>${escapeHtml(c.prenom)} ${escapeHtml(c.nom)} <span class="role-pill">${escapeHtml(c.type)}</span></h4>
          <p>${escapeHtml(truncated)}</p>
        </div>
        <span class="chevron">➔</span>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    console.error('Erreur discussions récentes:', error.message);
  }
}

function toggleJobsSection() {
  const section = document.getElementById('jobs-search-section');
  const btn = document.getElementById('btn-toggle-jobs');

  if (section.style.display === 'none') {
    section.style.display = 'block';
    btn.textContent = ' Masquer la Recherche d\'Offres';
    btn.className = 'btn btn-secondary';
    if (jobsData.length === 0) loadJobs();
    section.scrollIntoView({ behavior: 'smooth' });
  } else {
    section.style.display = 'none';
    btn.textContent = '💼 Afficher les Offres Disponibles';
    btn.className = 'btn btn-primary';
  }
}

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
        <span class="type-badge">${escapeHtml(job.type)}</span>
        <div class="budget-tag">${formattedBudget}</div>
        <h3 style="margin-top: 0.5rem;">${escapeHtml(job.titre)}</h3>
        <p style="font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-bottom: 0.75rem;">${escapeHtml(job.domaine)}</p>
        <p class="description">${escapeHtml(job.description)}</p>
        <div class="meta">
          <div class="author">👤 <span>${escapeHtml(job.auteur.prenom)} ${escapeHtml(job.auteur.nom[0])}.</span></div>
          <div>📍 ${escapeHtml(job.localisation.quartier)}, ${escapeHtml(job.localisation.ville)}</div>
        </div>
      `;
      listContainer.appendChild(card);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

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

function resetFilters() {
  document.getElementById('filters-form').reset();
  document.getElementById('search-keyword').value = '';
  loadJobs();
}

function openJobModal(jobId) {
  const job = jobsData.find(j => j._id === jobId);
  if (!job) return;

  selectedJobId = jobId;
  const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';

  document.getElementById('modal-job-type').textContent = job.type;
  document.getElementById('modal-job-title').textContent = job.titre;
  document.getElementById('modal-job-budget').textContent = formattedBudget;
  document.getElementById('modal-job-desc').textContent = job.description;
  document.getElementById('modal-job-domaine').textContent = job.domaine;
  document.getElementById('modal-job-loc').textContent = `${job.localisation.quartier}, ${job.localisation.ville}`;
  document.getElementById('modal-job-author').textContent = `${job.auteur.prenom} ${job.auteur.nom}`;

  const cniBadgeHtml = job.auteur.cniStatus === 'Verified'
    ? '<span class="cni-badge verified">Vérifié</span>'
    : '<span class="cni-badge not-submitted">Non vérifié</span>';
  document.getElementById('modal-job-author-cni').innerHTML = cniBadgeHtml;

  const user = getUser();
  const appBlock = document.getElementById('application-block');

  if (!user) {
    appBlock.innerHTML = `
      <div style="text-align: center; padding: 1rem; border: 1px dashed var(--border-glass); border-radius: var(--radius-md);">
        <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">Vous devez être connecté pour postuler.</p>
        <a href="/auth.html" class="btn btn-primary">Se connecter / S'inscrire</a>
      </div>
    `;
  } else if (user._id === job.auteur._id) {
    appBlock.innerHTML = `
      <div style="background: rgba(34,197,94,0.05); color: var(--primary); padding: 1rem; border-radius: var(--radius-md); text-align: center; font-weight: 600;">
        💡 Vous êtes l'auteur de cette offre.
      </div>
    `;
  } else if (user.cniStatus !== 'Verified') {
    appBlock.innerHTML = `
      <div style="background: rgba(239,68,68,0.05); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(239,68,68,0.15);">
        <p style="margin-bottom: 0.75rem; font-weight: 600;">⚠️ Vérification CNI requise</p>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
          Pour la sécurité du marché, validez votre identité avant de postuler.
        </p>
        <button onclick="triggerCniWarning()" class="btn btn-danger" style="font-size: 0.85rem; width: 100%;">
          Faire valider ma CNI
        </button>
      </div>
    `;
  } else {
    appBlock.innerHTML = `
      <form id="apply-form" onsubmit="submitApplication(event)">
        <div class="form-group">
          <label for="motivation-input">Message de motivation</label>
          <textarea id="motivation-input" class="form-control" rows="4" placeholder="Bonjour, je suis disponible immédiatement..." required></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Envoyer ma candidature</button>
      </form>
    `;
  }

  document.getElementById('job-modal').classList.add('active');
}

function closeJobModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('job-modal').classList.remove('active');
}

function triggerCniWarning() {
  closeJobModal();
  document.getElementById('cni-warning-modal').classList.add('active');
}

function closeCniWarningModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('cni-warning-modal').classList.remove('active');
}

async function submitApplication(e) {
  e.preventDefault();
  const motivation = document.getElementById('motivation-input').value;

  try {
    await apiCall('/applications', {
      method: 'POST',
      body: JSON.stringify({ jobId: selectedJobId, motivation })
    });
    showToast('Candidature soumise avec succès !', 'success');
    closeJobModal();
    loadDashboardStats();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
