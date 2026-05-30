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
      window.location.href = '/index.html';
    }
  } else if (mode === 'register') {
    toggleMode('register');
  } else {
    toggleMode('login');
  }
});

// Basculer l'affichage Connexion / Inscription
function toggleMode(mode) {
  const loginBox    = document.getElementById('login-container');
  const registerBox = document.getElementById('register-container');
  const cniBox      = document.getElementById('cni-verification-container');
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  cniBox.style.display = 'none';

  // Mettre à jour les onglets actifs
  if (tabLogin)    tabLogin.classList.toggle('active', mode === 'login');
  if (tabRegister) tabRegister.classList.toggle('active', mode === 'register');

  const incoming = mode === 'register' ? registerBox : loginBox;
  const outgoing  = mode === 'register' ? loginBox    : registerBox;

  if (outgoing.style.display !== 'none') {
    outgoing.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    outgoing.style.opacity    = '0';
    outgoing.style.transform  = mode === 'register' ? 'translateX(-18px)' : 'translateX(18px)';
    setTimeout(() => {
      outgoing.style.display   = 'none';
      outgoing.style.opacity   = '';
      outgoing.style.transform = '';
      incoming.style.display   = 'block';
      incoming.style.opacity   = '0';
      incoming.style.transform = mode === 'register' ? 'translateX(18px)' : 'translateX(-18px)';
      requestAnimationFrame(() => {
        incoming.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        incoming.style.opacity    = '1';
        incoming.style.transform  = 'translateX(0)';
        setTimeout(() => {
          incoming.style.transition = '';
          incoming.style.opacity    = '';
          incoming.style.transform  = '';
        }, 220);
      });
    }, 180);
  } else {
    outgoing.style.display  = 'none';
    incoming.style.display  = 'block';
  }
}

// Afficher l'écran de validation CNI
function showCniScreen() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('register-container').style.display = 'none';
  document.getElementById('cni-verification-container').style.display = 'block';
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

// --- CAMÉRA FRONTALE POUR SELFIE ---

let selfieStream = null;

async function openFrontCamera() {
  const btn = document.getElementById('btn-open-camera');
  const captureBtn = document.getElementById('btn-capture-selfie');
  const cameraView = document.getElementById('selfie-camera-view');
  const video = document.getElementById('selfie-video');

  btn.disabled = true;
  btn.innerText = 'Activation...';

  try {
    selfieStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    video.srcObject = selfieStream;
    cameraView.style.display = 'block';
    btn.style.display = 'none';
    captureBtn.style.display = 'flex';
    showToast('Caméra frontale activée !', 'success');
  } catch (err) {
    console.error('Caméra refusée:', err);
    btn.disabled = false;
    btn.innerText = 'Activer Caméra Frontale';
    showToast('Accès caméra refusé. Vérifiez les permissions.', 'error');
  }
}

function captureSelfie() {
  const video = document.getElementById('selfie-video');
  const canvas = document.getElementById('selfie-canvas');
  const preview = document.getElementById('selfie-preview');
  const cameraView = document.getElementById('selfie-camera-view');
  const selfieBox = document.getElementById('selfie-box');
  const captureBtn = document.getElementById('btn-capture-selfie');
  const retakeBtn = document.getElementById('btn-retake-selfie');

  // Flash effect
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:white;opacity:0.85;z-index:9999;pointer-events:none;transition:opacity 0.3s';
  document.body.appendChild(flash);
  setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 300); }, 80);

  // Draw video frame on canvas (mirrored like the preview)
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  imagesBase64.selfie = dataUrl;

  // Stop camera stream
  if (selfieStream) {
    selfieStream.getTracks().forEach(t => t.stop());
    selfieStream = null;
  }

  // Show preview
  preview.src = dataUrl;
  cameraView.style.display = 'none';
  selfieBox.style.display = 'block';
  selfieBox.classList.add('has-image');
  captureBtn.style.display = 'none';
  retakeBtn.style.display = 'block';

  showToast('Selfie capturé !', 'success');
  checkAndAutoVerify();
}

function retakeSelfie() {
  const selfieBox = document.getElementById('selfie-box');
  const retakeBtn = document.getElementById('btn-retake-selfie');
  const openBtn = document.getElementById('btn-open-camera');

  imagesBase64.selfie = null;
  selfieBox.style.display = 'none';
  selfieBox.classList.remove('has-image');
  retakeBtn.style.display = 'none';
  openBtn.style.display = 'flex';
  openBtn.disabled = false;
  openBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Activer Caméra Frontale`;
}

// Vérification automatique dès que CNI + selfie sont prêts
function checkAndAutoVerify() {
  if (imagesBase64.cni && imagesBase64.selfie) {
    // Petit délai pour que l'UI se mette à jour visuellement
    setTimeout(() => startBiometricVerification(), 600);
  }
}

// Fonction de simulation biométrique avec logs animés
function startBiometricVerification() {
  if (!imagesBase64.cni || !imagesBase64.selfie) {
    showToast('Veuillez uploader les deux photos avant de lancer la vérification.', 'error');
    return;
  }
  
  const logsBox = document.getElementById('step-logs');
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

      // Animation dynamique du statut DGSN
      animateDgsnStatus();

      showToast('Identité validée à 100% avec succès !', 'success');
      
    } catch (err) {
      document.getElementById('cni-box').classList.remove('scanning');
      document.getElementById('selfie-box').classList.remove('scanning');
      showToast(err.message, 'error');
    }
  }, 6000);
}

// Démarrer le flux d'inscription et rediriger
function finishVerificationFlow() {
  window.location.href = '/index.html';
}

// Animation dynamique du statut DGSN
function animateDgsnStatus() {
  const badge = document.getElementById('dgsn-status-badge');
  const pulse = document.getElementById('dgsn-pulse');
  const text = document.getElementById('dgsn-status-text');

  if (!badge || !text) return;

  const steps = [
    { label: 'CONNEXION...', color: 'var(--secondary)', pulseColor: '#eab308' },
    { label: 'AUTHENTIFICATION...', color: 'var(--secondary)', pulseColor: '#eab308' },
    { label: 'VÉRIFICATION...', color: '#60a5fa', pulseColor: '#60a5fa' },
    { label: 'VALIDATION...', color: '#a78bfa', pulseColor: '#a78bfa' },
    { label: '✔ VERIFIED', color: 'var(--primary)', pulseColor: '#22c55e', final: true },
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(interval);
      return;
    }
    const step = steps[i];
    text.style.color = step.color;
    text.innerText = step.label;
    pulse.style.background = step.pulseColor;
    pulse.style.boxShadow = `0 0 0 0 ${step.pulseColor}66`;

    if (step.final) {
      clearInterval(interval);
      pulse.style.animation = 'none';
      // Pop animation sur le badge
      badge.style.animation = 'dgsn-verified-pop 0.45s cubic-bezier(0.22,1,0.36,1) forwards';
      text.style.fontWeight = '900';
      text.style.letterSpacing = '2px';
    }
    i++;
  }, 520);
}
