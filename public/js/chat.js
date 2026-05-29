let socket = null;
let activeContactId = null;
let typingTimeout = null;
let lastTypingTime = 0;

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) {
    window.location.href = '/auth.html';
    return;
  }

  // Initialiser la connexion Socket
  initSocket();

  // Charger la liste des discussions actives
  loadActiveChats().then(() => {
    // Vérifier si un contact spécifique est passé en paramètre URL
    const urlParams = new URLSearchParams(window.location.search);
    const contactId = urlParams.get('contact');
    if (contactId) {
      selectContact(contactId);
    }
  });
});

// Initialisation de la connexion Socket.io avec authentification
function initSocket() {
  const token = getToken();
  
  socket = io({
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Connecté au serveur de messagerie instantanée');
  });

  // Écouter la réception d'un nouveau message
  socket.on('receive_message', (msg) => {
    // Si le message appartient à la conversation ouverte, l'ajouter
    if (activeContactId && (msg.expediteur === activeContactId || msg.destinataire === activeContactId)) {
      appendMessage(msg);
      scrollToBottom();
      
      // Cacher l'indicateur d'écriture
      document.getElementById('typing-indicator').style.display = 'none';
    }
    
    // Mettre à jour et retrier la liste des chats à gauche
    loadActiveChats();
  });

  // Écouter si le contact écrit
  socket.on('user_typing', (data) => {
    if (activeContactId && data.expediteur === activeContactId) {
      const indicator = document.getElementById('typing-indicator');
      indicator.style.display = 'block';
      
      // Auto-masquer après 3 secondes sans nouvelle frappe
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        indicator.style.display = 'none';
      }, 3000);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Erreur Socket.io:', err.message);
    showToast('Erreur de connexion en temps réel', 'error');
  });
}

// Charger la liste des discussions actives depuis l'API
async function loadActiveChats() {
  try {
    const listContainer = document.getElementById('chat-list-container');
    const data = await apiCall('/messages/active/chats', { method: 'GET' });
    
    listContainer.innerHTML = '';
    
    if (data.chats.length === 0) {
      listContainer.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-500">
          Aucune discussion en cours.<br>Allez sur vos candidatures pour débuter.
        </div>
      `;
      return;
    }

    data.chats.forEach(chat => {
      const c = chat.contact;
      const lastMsg = chat.lastMessage;
      
      const item = document.createElement('div');
      
      // Appliquer le style actif si sélectionné
      const isActive = activeContactId === c._id;
      item.className = `p-4 cursor-pointer border-b border-white/5 transition-all flex justify-between items-center ${
        isActive ? 'bg-white/5 border-l-4 border-green-500' : 'hover:bg-white/5'
      }`;
      
      item.onclick = () => selectContact(c._id);

      const truncatedText = lastMsg ? (lastMsg.texte.length > 25 ? lastMsg.texte.substring(0, 25) + '...' : lastMsg.texte) : 'Commencer la discussion';
      const cniBadge = c.cniStatus === 'Verified' ? ' 🟢' : '';

      item.innerHTML = `
        <div class="flex items-center space-x-3 overflow-hidden">
          <div class="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-slate-300 text-xs flex-shrink-0">
            ${c.prenom[0]}${c.nom[0]}
          </div>
          <div class="overflow-hidden">
            <h4 class="font-semibold text-sm text-slate-100 truncate">${c.prenom} ${c.nom}${cniBadge}</h4>
            <p class="text-xs text-slate-400 truncate">${truncatedText}</p>
          </div>
        </div>
        <span class="text-[10px] text-slate-500 flex-shrink-0">
          ${c.type.substring(0, 3)}.
        </span>
      `;
      
      listContainer.appendChild(item);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Sélectionner un contact et charger la conversation
async function selectContact(contactId) {
  activeContactId = contactId;
  
  // Mettre à jour l'état visuel actif dans la barre latérale
  loadActiveChats();

  // Masquer le message de bienvenue par défaut
  const welcomeBlock = document.getElementById('welcome-message-block');
  if (welcomeBlock) welcomeBlock.style.display = 'none';

  // Afficher les conteneurs de chat
  document.getElementById('chat-header').style.display = 'flex';
  document.getElementById('chat-input-bar').style.display = 'block';

  // Charger les informations du contact
  await loadContactHeader(contactId);

  // Charger les messages historiques
  await loadHistory(contactId);
}

// Récupérer et remplir les informations de l'en-tête du contact sélectionné
async function loadContactHeader(contactId) {
  try {
    // Si le contact est déjà dans les chats actifs, on peut extraire ses données directement.
    // Sinon, on fait un appel API pour récupérer son profil.
    // Pour cela, nous créons un endpoint ou utilisons les données déjà obtenues.
    // Ajoutons un endpoint /auth/profile/:id ou utilisons une récupération
    const response = await fetch(`/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    
    // Pour simplifier de manière très propre et robuste, nous allons chercher le contact dans les chats chargés,
    // ou appeler une route dédiée si absente (nous allons l'implémenter).
    let contactInfo = null;
    const chatsData = await apiCall('/messages/active/chats', { method: 'GET' });
    const chatFound = chatsData.chats.find(c => c.contact._id === contactId);
    
    if (chatFound) {
      contactInfo = chatFound.contact;
    } else {
      // Appel d'une route profil spécifique
      const profileData = await apiCall(`/auth/profile/${contactId}`, { method: 'GET' });
      contactInfo = profileData.profile;
    }

    if (contactInfo) {
      document.getElementById('chat-contact-name').innerText = `${contactInfo.prenom} ${contactInfo.nom}`;
      document.getElementById('chat-contact-avatar').innerText = `${contactInfo.prenom[0]}${contactInfo.nom[0]}`;
      document.getElementById('chat-contact-meta').innerText = `📞 ${contactInfo.telephone} • 📍 ${contactInfo.geoloc.quartier}, ${contactInfo.geoloc.ville}`;
      document.getElementById('chat-contact-role').innerText = contactInfo.type;

      // Badge CNI
      const badge = document.getElementById('chat-contact-cni-badge');
      if (contactInfo.cniStatus === 'Verified') {
        badge.innerHTML = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">CNI VERIFIED</span>';
      } else {
        badge.innerHTML = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">NON VERIFIED</span>';
      }
    }
  } catch (err) {
    console.error('Impossible de charger les métadonnées de contact :', err.message);
  }
}

// Charger l'historique de chat
async function loadHistory(contactId) {
  try {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = '<p class="text-center text-xs text-slate-500 py-4">Chargement de la discussion...</p>';

    const data = await apiCall(`/messages/${contactId}`, { method: 'GET' });
    
    container.innerHTML = '';
    
    if (data.messages.length === 0) {
      container.innerHTML = `
        <div class="my-auto text-center p-6 text-xs text-slate-500">
          💡 Aucun message échangé. Écrivez votre premier message ci-dessous pour démarrer la discussion.
        </div>
      `;
      return;
    }

    data.messages.forEach(msg => {
      appendMessage(msg);
    });

    scrollToBottom();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Ajouter un message à l'interface
function appendMessage(msg) {
  const container = document.getElementById('chat-messages-container');
  
  // Supprimer le bloc vide s'il existe
  const emptyBlock = container.querySelector('.my-auto');
  if (emptyBlock) emptyBlock.remove();

  const user = getUser();
  const isMine = msg.expediteur === user._id;

  const msgDiv = document.createElement('div');
  msgDiv.className = `flex ${isMine ? 'justify-end' : 'justify-start'} w-full animate-fade-in`;

  const timeStr = new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  msgDiv.innerHTML = `
    <div class="max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md flex flex-col gap-1 ${
      isMine 
        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white rounded-tr-none' 
        : 'bg-white/5 border border-white/10 text-slate-100 rounded-tl-none'
    }">
      <p class="text-sm break-words leading-relaxed">${msg.texte}</p>
      <span class="text-[9px] self-end opacity-60">${timeStr}</span>
    </div>
  `;

  container.appendChild(msgDiv);
}

// Scroller vers le bas
function scrollToBottom() {
  const container = document.getElementById('chat-messages-container');
  container.scrollTop = container.scrollHeight;
}

// Soumission du formulaire d'envoi de message
document.getElementById('chat-send-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const textInput = document.getElementById('chat-input-text');
  const texte = textInput.value.trim();

  if (!texte || !activeContactId) return;

  // Émettre le message via Socket.io
  socket.emit('send_message', {
    destinataire: activeContactId,
    texte
  });

  textInput.value = '';
  textInput.focus();
});

// Émettre un événement d'écriture avec limitation
function sendTypingEvent() {
  if (!socket || !activeContactId) return;

  const currentTime = new Date().getTime();
  if (currentTime - lastTypingTime > 2000) {
    socket.emit('typing', { destinataire: activeContactId });
    lastTypingTime = currentTime;
  }
}
