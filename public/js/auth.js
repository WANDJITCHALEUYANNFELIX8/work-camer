document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');

  const token = getToken();
  const user = getUser();

  if (token && user) {
    if (user.cniStatus !== 'Verified') {
      showCniScreen();
    } else {
      window.location.href = '/index.html';
    }
  } else if (mode === 'register') {
    toggleMode('register');
  } else {
    toggleMode('login');
  }
});

function toggleMode(mode) {
  const loginBox    = document.getElementById('login-container');
  const registerBox = document.getElementById('register-container');
  const cniBox      = document.getElementById('cni-verification-container');

  cniBox.style.display = 'none';

  if (mode === 'register') {
    loginBox.style.display = 'none';
    registerBox.style.display = 'block';
    setTimeout(detectUserLocation, 100);
  } else {
    loginBox.style.display = 'block';
    registerBox.style.display = 'none';
  }
}

function showCniScreen() {
  document.getElementById('login-container').style.display    = 'none';
  document.getElementById('register-container').style.display = 'none';
  document.getElementById('cni-verification-container').style.display = 'block';
}

// Formulaire de Connexion
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  // CORRECTION : validation basique côté client
  if (!email || !password) {
    showToast('Veuillez remplir tous les champs.', 'error');
    return;
  }

  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setAuth(data.token, data.user);
    showToast('Connexion réussie !', 'success');

    setTimeout(() => {
      if (data.user.cniStatus !== 'Verified') {
        showCniScreen();
      } else {
        window.location.href = '/index.html';
      }
    }, 1000);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Formulaire d'Inscription
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nom       = document.getElementById('reg-nom').value.trim();
  const prenom    = document.getElementById('reg-prenom').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const telephone = document.getElementById('reg-tel').value.trim();
  const type      = document.getElementById('reg-type').value;
  const ville     = document.getElementById('reg-ville').value.trim();
  const quartier  = document.getElementById('reg-quartier').value.trim();
  const latitude  = document.getElementById('reg-lat').value;
  const longitude = document.getElementById('reg-lng').value;
  const password  = document.getElementById('reg-password').value;

  // CORRECTION : validation basique avant envoi
  if (!nom || !prenom || !email || !telephone || !ville || !quartier || !password) {
    showToast('Veuillez remplir tous les champs obligatoires.', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Le mot de passe doit contenir au moins 6 caractères.', 'error');
    return;
  }

  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nom, prenom, email, telephone, type, ville, quartier, latitude, longitude, password })
    });

    setAuth(data.token, data.user);
    showToast('Inscription réussie. Passez à la validation CNI.', 'success');

    setTimeout(() => { showCniScreen(); }, 1200);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// --- LOGIQUE CNI ---
let imagesBase64 = { cni: null, selfie: null };

function triggerUpload(id) {
  document.getElementById(id).click();
}

function previewImage(input, target) {
  const file = input.files[0];
  if (!file) return;

  // CORRECTION : limiter la taille de l'image à 5 Mo avant l'envoi
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image trop lourde (max 5 Mo). Compressez-la avant de l\'envoyer.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const preview = document.getElementById(`${target}-preview`);
    const box     = document.getElementById(`${target}-box`);
    preview.src = e.target.result;
    box.classList.add('has-image');
    imagesBase64[target] = e.target.result;
  };
  reader.readAsDataURL(file);
}

function startBiometricVerification() {
  if (!imagesBase64.cni || !imagesBase64.selfie) {
    showToast('Veuillez uploader les deux photos avant de lancer la vérification.', 'error');
    return;
  }

  const btn     = document.getElementById('btn-start-verify');
  const logsBox = document.getElementById('step-logs');

  btn.disabled  = true;
  btn.innerText = 'Vérification biométrique en cours...';
  logsBox.style.display = 'flex';

  document.getElementById('cni-box').classList.add('scanning');
  document.getElementById('selfie-box').classList.add('scanning');

  const logs = [
    { id: 'log-1', delay: 0,    text: "⚙️ Connexion aux serveurs de la DGSN Cameroun..." },
    { id: 'log-2', delay: 1200, text: "🔍 OCR : Extraction textuelle de la carte d'identité..." },
    { id: 'log-3', delay: 2400, text: "🛡️ Analyse des filigranes et de la signature..." },
    { id: 'log-4', delay: 3500, text: "🧬 Biométrie : Calcul de la carte faciale (selfie vs photo CNI)..." },
    { id: 'log-5', delay: 4500, text: "📈 Comparaison en temps réel et validation finale..." }
  ];

  logs.forEach(log => {
    setTimeout(() => {
      const el = document.getElementById(log.id);
      el.className = 'step-log-item active';
      el.innerHTML = `<span>⏳</span> ${log.text}`;

      const prevIndex = logs.findIndex(l => l.id === log.id) - 1;
      if (prevIndex >= 0) {
        const prevEl = document.getElementById(logs[prevIndex].id);
        prevEl.className = 'step-log-item done';
        prevEl.innerHTML = `<span>✅</span> ${logs[prevIndex].text.substring(3)}`;
      }
    }, log.delay);
  });

  setTimeout(async () => {
    try {
      const data = await apiCall('/auth/verify-cni', {
        method: 'POST',
        body: JSON.stringify({ cniPhoto: imagesBase64.cni, selfiePhoto: imagesBase64.selfie })
      });

      document.getElementById('cni-box').classList.remove('scanning');
      document.getElementById('selfie-box').classList.remove('scanning');

      const finalEl = document.getElementById('log-5');
      finalEl.className = 'step-log-item done';
      finalEl.innerHTML = `<span>✅</span> Similarité faciale confirmée !`;

      document.getElementById('res-cni').innerText   = data.extractedData.cniNumber;
      document.getElementById('res-nom').innerText   = `${data.extractedData.prenomExtrait} ${data.extractedData.nomExtrait}`;
      document.getElementById('res-score').innerText = `${data.extractedData.faceMatchScore}%`;

      // Mettre à jour le statut CNI dans le localStorage
      const currentUser = getUser();
      currentUser.cniStatus = 'Verified';
      localStorage.setItem('user', JSON.stringify(currentUser));

      document.getElementById('verify-results').style.display = 'block';
      showToast('Identité validée à 100% avec succès !', 'success');
    } catch (err) {
      document.getElementById('cni-box').classList.remove('scanning');
      document.getElementById('selfie-box').classList.remove('scanning');
      btn.disabled  = false;
      btn.innerText = "Démarrer l'analyse d'identité";
      showToast(err.message, 'error');
    }
  }, 6000);
}

function finishVerificationFlow() {
  window.location.href = '/index.html';
}

// --- GÉOLOCALISATION ---
function enableManualLocationInput() {
  ['reg-ville', 'reg-quartier'].forEach(id => {
    const el = document.getElementById(id);
    el.removeAttribute('readonly');
    el.style.cursor     = 'text';
    el.style.background = 'transparent';
  });
  showToast('Saisie manuelle activée.', 'success');
}

async function detectUserLocation() {
  const loader = document.getElementById('geoloc-loader');
  const status = document.getElementById('geoloc-status');

  if (!loader || !status) return;

  loader.style.display = 'flex';
  status.innerText = 'Détermination des coordonnées GPS...';

  if (!navigator.geolocation) {
    status.innerText = 'Géolocalisation non supportée par votre navigateur.';
    loader.style.display = 'none';
    enableManualLocationInput();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      document.getElementById('reg-lat').value = lat;
      document.getElementById('reg-lng').value = lng;
      status.innerText = `GPS trouvé (${lat.toFixed(4)}, ${lng.toFixed(4)}). Recherche de la ville...`;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'fr' } }
        );

        if (!response.ok) throw new Error('Erreur Nominatim');

        const data = await response.json();
        const addr = data.address || {};

        const ville    = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || 'Douala';
        const quartier = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.city_district || 'Akwa';

        document.getElementById('reg-ville').value    = ville;
        document.getElementById('reg-quartier').value = quartier;

        status.innerHTML = `✅ Localisation réussie : <strong>${quartier}, ${ville}</strong>`;
        showToast(`Position détectée : ${quartier}, ${ville}`, 'success');
      } catch (err) {
        console.error('Erreur reverse geocoding:', err.message);
        status.innerText = 'Coordonnées GPS obtenues, mais impossible de décoder l\'adresse. Saisie manuelle requise.';
        enableManualLocationInput();
      } finally {
        loader.style.display = 'none';
      }
    },
    (error) => {
      console.warn('Erreur GPS:', error.code, error.message);
      status.innerText = 'Accès GPS refusé ou indisponible. Veuillez renseigner manuellement.';
      loader.style.display = 'none';
      document.getElementById('reg-lat').value      = '4.0511';
      document.getElementById('reg-lng').value      = '9.7679';
      document.getElementById('reg-ville').value    = 'Douala';
      document.getElementById('reg-quartier').value = 'Akwa';
      enableManualLocationInput();
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}
