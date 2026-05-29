let currentActiveTab = '';
let myOffers = [];
let mySubmissions = [];

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) {
    showToast('Veuillez vous connecter pour accéder au tableau de bord.', 'error');
    window.location.href = '/auth.html';
    return;
  }
  initDashboardMenu(user);
});

function initDashboardMenu(user) {
  const menuContainer = document.getElementById('dashboard-menu');

  if (user.type === 'Candidat') {
    menuContainer.innerHTML = `
      <li class="sidebar-item" id="menu-submissions" onclick="switchTab('submissions')">
        💼 Mes candidatures
      </li>
    `;
    switchTab('submissions');
  } else {
    menuContainer.innerHTML = `
      <li class="sidebar-item" id="menu-my-offers" onclick="switchTab('my-offers')">
        📋 Mes offres publiées
      </li>
      <li class="sidebar-item" id="menu-publish" onclick="switchTab('publish')">
        ➕ Publier une offre
      </li>
    `;
    const jobVille = document.getElementById('job-ville');
    const jobQuartier = document.getElementById('job-quartier');
    const jobLat = document.getElementById('job-lat');
    const jobLng = document.getElementById('job-lng');
    if (jobVille) jobVille.value = user.geoloc.ville;
    if (jobQuartier) jobQuartier.value = user.geoloc.quartier;
    if (jobLat) jobLat.value = user.geoloc.latitude;
    if (jobLng) jobLng.value = user.geoloc.longitude;

    switchTab('my-offers');
  }
}

function switchTab(tabName) {
  currentActiveTab = tabName;

  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  document.getElementById('section-publish').style.display = 'none';
  document.getElementById('section-my-offers').style.display = 'none';
  document.getElementById('section-my-submissions').style.display = 'none';

  if (tabName === 'publish') {
    const user = getUser();
    if (user && user.cniStatus !== 'Verified') {
      showToast('Veuillez faire vérifier votre CNI avant de publier une offre.', 'error');
      setTimeout(() => { window.location.href = '/auth.html'; }, 1500);
      return;
    }
    document.getElementById('menu-publish').classList.add('active');
    document.getElementById('section-publish').style.display = 'block';
  } else if (tabName === 'my-offers') {
    document.getElementById('menu-my-offers').classList.add('active');
    document.getElementById('section-my-offers').style.display = 'block';
    loadMyOffers();
  } else if (tabName === 'submissions') {
    document.getElementById('menu-submissions').classList.add('active');
    document.getElementById('section-my-submissions').style.display = 'block';
    loadMySubmissions();
  }
}

async function loadMyOffers() {
  try {
    const tbody = document.getElementById('my-offers-tbody');
    const msg = document.getElementById('no-offers-msg');

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Chargement de vos offres...</td></tr>';
    msg.style.display = 'none';

    const data = await apiCall('/jobs/my/offers', { method: 'GET' });
    myOffers = data.jobs;
    tbody.innerHTML = '';

    if (myOffers.length === 0) {
      msg.style.display = 'block';
      return;
    }

    myOffers.forEach(job => {
      const tr = document.createElement('tr');
      const dateStr = new Date(job.createdAt).toLocaleDateString('fr-FR');
      const formattedBudget = new Intl.NumberFormat('fr-FR').format(job.budget) + ' XAF';

      // Utiliser escapeHtml pour les données dynamiques dans innerHTML
      tr.innerHTML = `
        <td style="font-weight: 600;">${escapeHtml(job.titre)}</td>
        <td>${escapeHtml(formattedBudget)}</td>
        <td>${escapeHtml(job.type)}</td>
        <td>${dateStr}</td>
        <td><span class="status-pill accepted">${escapeHtml(job.statut)}</span></td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;"
            onclick="openApplicantsDrawer('${job._id}', ${JSON.stringify(job.titre)})">
            👥 Voir les postulants
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

document.getElementById('create-job-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const user = getUser();
  if (user && user.cniStatus !== 'Verified') {
    showToast('Action impossible : Vous devez vérifier votre CNI.', 'error');
    return;
  }

  const titre = document.getElementById('job-title').value.trim();
  const type = document.getElementById('job-type').value;
  const domaine = document.getElementById('job-domaine').value;
  const budget = document.getElementById('job-budget').value;
  const description = document.getElementById('job-desc').value.trim();
  const ville = document.getElementById('job-ville').value.trim();
  const quartier = document.getElementById('job-quartier').value.trim();
  const latitude = document.getElementById('job-lat').value;
  const longitude = document.getElementById('job-lng').value;

  if (!titre || !description || !ville || !quartier) {
    showToast('Veuillez remplir tous les champs obligatoires.', 'error');
    return;
  }

  try {
    await apiCall('/jobs', {
      method: 'POST',
      body: JSON.stringify({ titre, type, domaine, budget, description, ville, quartier, latitude, longitude })
    });
    showToast("Votre offre d'emploi a été publiée avec succès !", 'success');
    document.getElementById('create-job-form').reset();
    switchTab('my-offers');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

async function openApplicantsDrawer(jobId, jobTitle) {
  try {
    const drawer = document.getElementById('applicants-drawer');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerContent = document.getElementById('drawer-content');

    drawerTitle.textContent = `Candidats : ${jobTitle}`;
    drawerContent.innerHTML = '<p style="text-align: center; padding: 2rem;">Chargement des profils...</p>';
    drawer.classList.add('active');

    const data = await apiCall(`/applications/job/${jobId}`, { method: 'GET' });
    const applications = data.applications;
    drawerContent.innerHTML = '';

    if (applications.length === 0) {
      drawerContent.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">Aucun candidat n\'a encore postulé.</p>';
      return;
    }

    applications.forEach(app => {
      const c = app.candidat;
      const card = document.createElement('div');
      card.className = 'applicant-card';

      const cniBadgeHtml = c.cniStatus === 'Verified'
        ? '<span class="cni-badge verified">CNI Vérifié</span>'
        : '<span class="cni-badge not-submitted">Non Vérifié</span>';

      let actionButtons = '';
      if (app.statut === 'En attente') {
        actionButtons = `
          <div class="actions">
            <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;"
              onclick="updateStatus('${app._id}', 'Accepté', '${jobId}', ${JSON.stringify(jobTitle)})">
              Accepter
            </button>
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;"
              onclick="updateStatus('${app._id}', 'Refusé', '${jobId}', ${JSON.stringify(jobTitle)})">
              Refuser
            </button>
          </div>
        `;
      } else if (app.statut === 'Accepté') {
        actionButtons = `
          <div class="actions" style="align-items: center; justify-content: space-between;">
            <span style="color: var(--primary); font-weight: 700; font-size: 0.85rem;">✅ Candidature Acceptée</span>
            <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;"
              onclick="startChat('${c._id}')">
              💬 Discuter
            </button>
          </div>
        `;
      } else {
        actionButtons = `<span style="color: var(--danger); font-weight: 700; font-size: 0.85rem;">❌ Candidature Refusée</span>`;
      }

      card.innerHTML = `
        <div class="header">
          <span style="font-weight: 700; font-size: 1.05rem;">${escapeHtml(c.prenom)} ${escapeHtml(c.nom)}</span>
          ${cniBadgeHtml}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 2px;">
          <span>📞 Tél : ${escapeHtml(c.telephone)}</span>
          <span>📧 Email : ${escapeHtml(c.email)}</span>
          <span>📍 ${escapeHtml(c.geoloc.quartier)}, ${escapeHtml(c.geoloc.ville)}</span>
        </div>
        <p class="motivation">${escapeHtml(app.motivation)}</p>
        ${actionButtons}
      `;

      drawerContent.appendChild(card);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function closeDrawer() {
  document.getElementById('applicants-drawer').classList.remove('active');
}

async function updateStatus(appId, newStatus, jobId, jobTitle) {
  try {
    await apiCall(`/applications/${appId}`, {
      method: 'PUT',
      body: JSON.stringify({ statut: newStatus })
    });
    showToast(`Candidature mise à jour : ${newStatus}`, 'success');
    openApplicantsDrawer(jobId, jobTitle);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function startChat(userId) {
  window.location.href = `/chat.html?contact=${userId}`;
}

async function loadMySubmissions() {
  try {
    const tbody = document.getElementById('my-submissions-tbody');
    const msg = document.getElementById('no-submissions-msg');

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Chargement de vos candidatures...</td></tr>';
    msg.style.display = 'none';

    const data = await apiCall('/applications/my/submissions', { method: 'GET' });
    mySubmissions = data.submissions;
    tbody.innerHTML = '';

    if (mySubmissions.length === 0) {
      msg.style.display = 'block';
      return;
    }

    mySubmissions.forEach(app => {
      const tr = document.createElement('tr');
      const rec = app.job.auteur;

      let actionBtn = '-';
      if (app.statut === 'Accepté') {
        actionBtn = `
          <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: #000;"
            onclick="startChat('${rec._id}')">
            💬 Discuter
          </button>
        `;
      }

      let statusClass = 'pending';
      if (app.statut === 'Accepté') statusClass = 'accepted';
      if (app.statut === 'Refusé') statusClass = 'rejected';

      tr.innerHTML = `
        <td style="font-weight: 600;">${escapeHtml(app.job.titre)}</td>
        <td>${escapeHtml(rec.prenom)} ${escapeHtml(rec.nom)}</td>
        <td>${escapeHtml(rec.telephone)}</td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(app.statut)}</span></td>
        <td>${actionBtn}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}
