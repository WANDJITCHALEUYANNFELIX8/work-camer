const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');

// Charger les variables d'environnement en premier
dotenv.config();

// CORRECTION : vérifier les variables obligatoires au démarrage
if (!process.env.JWT_SECRET) {
  console.error('FATAL : JWT_SECRET est absent du fichier .env. Arrêt du serveur.');
  process.exit(1);
}

const connectDB = require('./config/db');
const authRoutes         = require('./routes/authRoutes');
const jobRoutes          = require('./routes/jobRoutes');
const applicationRoutes  = require('./routes/applicationRoutes');
const messageRoutes      = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const Message            = require('./models/Message');
const User               = require('./models/User');

connectDB();

const app = express();
const server = http.createServer(app);

// CORRECTION : headers de sécurité HTTP
app.use(helmet({
  // Désactiver CSP strict pour compatibilité avec les assets front-end servis en statique
  contentSecurityPolicy: false
}));

// CORRECTION : CORS configuré (restreindre en production via CLIENT_URL dans .env)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5100'
}));

// Socket.io avec CORS
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5100',
    methods: ['GET', 'POST']
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Injecter Socket.io dans l'objet request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes API
app.use('/api/auth',          authRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/applications',  applicationRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/notifications', notificationRoutes);

// CORRECTION : handler 404 JSON pour les routes /api inconnues AVANT le catch-all front-end
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Route API introuvable' });
});

// Catch-all : renvoyer index.html pour le routage côté client (SPA)
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentification Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error("Erreur d'authentification : Token manquant"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error("Erreur d'authentification : Token invalide ou expiré"));
  }
});

// Gestion des connexions Socket.io
io.on('connection', async (socket) => {
  console.log(`Nouvelle connexion temps réel : ${socket.userId}`);

  socket.join(socket.userId);

  try {
    const user = await User.findById(socket.userId);
    if (user) {
      console.log(`${user.prenom} ${user.nom} est en ligne`);
    }
  } catch (err) {
    console.error(err);
  }

  socket.on('send_message', async (data) => {
    try {
      const { destinataire, texte } = data;

      if (!destinataire || !texte || texte.trim() === '') return;

      const nouveauMessage = await Message.create({
        expediteur: socket.userId,
        destinataire,
        texte: texte.trim()
      });

      // Notification de nouveau message
      try {
        const Notification = require('./models/Notification');
        const expediteurInfo = await User.findById(socket.userId);
        const nomExpediteur = expediteurInfo ? `${expediteurInfo.prenom} ${expediteurInfo.nom}` : "Quelqu'un";

        const notification = await Notification.create({
          destinataire,
          texte: `Nouveau message de ${nomExpediteur} : "${texte.trim().substring(0, 30)}${texte.trim().length > 30 ? '...' : ''}"`,
          type: 'new_message',
          lien: `/chat.html?contact=${socket.userId}`
        });

        io.to(destinataire).emit('notification', notification);
      } catch (notifError) {
        console.error('Erreur notification message:', notifError.message);
      }

      io.to(destinataire).emit('receive_message', nouveauMessage);
      io.to(socket.userId).emit('receive_message', nouveauMessage);

      console.log(`Message envoyé de ${socket.userId} à ${destinataire}`);
    } catch (err) {
      console.error("Erreur envoi message Socket :", err.message);
    }
  });

  socket.on('typing', (data) => {
    const { destinataire } = data;
    socket.to(destinataire).emit('user_typing', { expediteur: socket.userId });
  });

  socket.on('disconnect', () => {
    console.log(`Utilisateur déconnecté : ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 5100;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
