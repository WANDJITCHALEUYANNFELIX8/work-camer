// Mode de page par défaut ou dynamique via URL query params
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  
  const token = getToken();
  const user = getUser();
  
  if (token && user) {
    if (user.cniStatus !== 'Verified') {
      showCniScreen();
    } else {
      window.location.href = '/dashboard.html';
    }
  } else if (mode === 'register') {
    toggleMode('register');
  } else {
    toggleMode('login');
  }
});

// Basculer l'affichage Connexion / Inscription
function toggleMode(mode) {
  const loginBox = document.getElementById('login-container');
  const registerBox = document.getElementById('register-container');
  const cniBox = document.getElementById('cni-verification-container');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authTabs = document.getElementById('auth-selector-tabs');
  
  cniBox.style.display = 'none';

  if (mode === 'register') {
    loginBox.style.display = 'none';
    registerBox.style.display = 'block';
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
    if (authTabs) authTabs.style.display = 'flex';
    // Auto-trigger geolocation
    setTimeout(() => { if (typeof detectGeolocation === 'function') detectGeolocation(); }, 300);
  } else {
    loginBox.style.display = 'block';
    registerBox.style.display = 'none';
    if (tabLogin) tabLogin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
    if (authTabs) authTabs.style.display = 'flex';
  }
}

// Afficher l'écran de validation CNI
function showCniScreen() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('register-container').style.display = 'none';
  document.getElementById('cni-verification-container').style.display = 'block';
  const authTabs = document.getElementById('auth-selector-tabs');
  if (authTabs) authTabs.style.display = 'none';
}

// Formulaire de Connexion
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
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
      window.location.href = '/dashboard.html';
      }
    }, 1000);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Formulaire d'Inscription
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nom = document.getElementById('reg-nom').value;
  const prenom = document.getElementById('reg-prenom').value;
  const email = document.getElementById('reg-email').value;
  const telephone = document.getElementById('reg-tel').value;
  const type = document.getElementById('reg-type').value;
  const ville = document.getElementById('reg-ville').value;
  const quartier = document.getElementById('reg-quartier').value;
  const latitude = document.getElementById('reg-lat').value;
  const longitude = document.getElementById('reg-lng').value;
  const password = document.getElementById('reg-password').value;
  
  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nom, prenom, email, telephone, type,
        ville, quartier, latitude, longitude, password
      })
    });
    
    setAuth(data.token, data.user);
    showToast('Inscription réussie. Passez à la validation CNI.', 'success');
    
    setTimeout(() => {
      showCniScreen();
    }, 1200);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// --- LOGIQUE DE SCAN ET VÉRIFICATION CNI ---

let imagesBase64 = {
  cni: null,
  selfie: null
};

// Activer le clic de sélection d'image
function triggerUpload(id) {
  document.getElementById(id).click();
}

// Aperçu des images téléchargées et encodage base64
function previewImage(input, target) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const preview = document.getElementById(`${target}-preview`);
    const box = document.getElementById(`${target}-box`);
    
    preview.src = e.target.result;
    box.classList.add('has-image');
    imagesBase64[target] = e.target.result;
  };
  
  reader.readAsDataURL(file);
}

// Fonction de simulation biométrique avec logs animés
function startBiometricVerification() {
  if (!imagesBase64.cni || !imagesBase64.selfie) {
    showToast('Veuillez uploader les deux photos avant de lancer la vérification.', 'error');
    return;
  }
  
  const btn = document.getElementById('btn-start-verify');
  const logsBox = document.getElementById('step-logs');
  
  btn.disabled = true;
  btn.innerText = 'Vérification biométrique en cours...';
  logsBox.style.display = 'flex';
  
  // Activer l'animation laser sur les deux images
  document.getElementById('cni-box').classList.add('scanning');
  document.getElementById('selfie-box').classList.add('scanning');
  
  const logs = [
    { id: 'log-1', delay: 0, text: '⚙️ Connexion aux serveurs de la DGSN Cameroun...' },
    { id: 'log-2', delay: 1200, text: '🔍 OCR : Extraction textuelle de la carte d\'identité...' },
    { id: 'log-3', delay: 2400, text: '🛡️ Analyse des filigranes et de la signature...' },
    { id: 'log-4', delay: 3500, text: '🧬 Biométrie : Calcul de la carte faciale (selfie vs photo CNI)...' },
    { id: 'log-5', delay: 4500, text: '📈 Comparaison en temps réel et validation finale...' }
  ];
  
  logs.forEach(log => {
    setTimeout(() => {
      const el = document.getElementById(log.id);
      el.className = 'step-log-item active';
      el.innerHTML = `<span>⏳</span> ${log.text}`;
      
      // Mettre le précédent en vert (Terminé)
      const prevIndex = logs.findIndex(l => l.id === log.id) - 1;
      if (prevIndex >= 0) {
        const prevEl = document.getElementById(logs[prevIndex].id);
        prevEl.className = 'step-log-item done';
        prevEl.innerHTML = `<span>✅</span> ${logs[prevIndex].text.substring(3)}`;
      }
    }, log.delay);
  });
  
  // Lancer l'appel backend à la fin de l'animation de simulation
  setTimeout(async () => {
    try {
      const data = await apiCall('/auth/verify-cni', {
        method: 'POST',
        body: JSON.stringify({
          cniPhoto: imagesBase64.cni,
          selfiePhoto: imagesBase64.selfie
        })
      });
      
      // Stopper le scan laser
      document.getElementById('cni-box').classList.remove('scanning');
      document.getElementById('selfie-box').classList.remove('scanning');
      
      // Mettre le dernier log en succès
      const finalEl = document.getElementById('log-5');
      finalEl.className = 'step-log-item done';
      finalEl.innerHTML = `<span>✅</span> Similarité faciale confirmée !`;
      
      // Afficher les résultats extraits
      document.getElementById('res-cni').innerText = data.extractedData.cniNumber;
      document.getElementById('res-nom').innerText = `${data.extractedData.prenomExtrait} ${data.extractedData.nomExtrait}`;
      document.getElementById('res-score').innerText = `${data.extractedData.faceMatchScore}%`;
      
      // Mettre à jour l'utilisateur localement
      const currentUser = getUser();
      currentUser.cniStatus = 'Verified';
      localStorage.setItem('user', JSON.stringify(currentUser));
      
      document.getElementById('verify-results').style.display = 'block';
      showToast('Identité validée à 100% avec succès !', 'success');
      
    } catch (err) {
      document.getElementById('cni-box').classList.remove('scanning');
      document.getElementById('selfie-box').classList.remove('scanning');
      btn.disabled = false;
      btn.innerText = "Démarrer l'analyse d'identité";
      showToast(err.message, 'error');
    }
  }, 6000);
}

// Terminer le flux d'inscription et rediriger
function finishVerificationFlow() {
  window.location.href = '/dashboard.html';
}
