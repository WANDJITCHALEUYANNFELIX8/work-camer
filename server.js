const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

dotenv.config();

// Vérification obligatoire des variables d'environnement critiques
if (!process.env.JWT_SECRET) {
  console.error('ERREUR FATALE : JWT_SECRET est manquant dans le fichier .env');
  process.exit(1);
}

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const Message = require('./models/Message');
const User = require('./models/User');

connectDB();

const app = express();
const server = http.createServer(app);

// ==================== SÉCURITÉ ====================

// Helmet - Configuration recommandée
app.use(helmet({
  contentSecurityPolicy: false,           // Désactivé pour compatibilité front-end/CDN
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,                     // 1 an
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "deny" }
}));

// CORS global
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting global sur l'API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.' }
});

app.use('/api', globalLimiter);

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Injection de Socket.io dans les requêtes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ==================== ROUTES ====================

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Handler 404 pour les routes API
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ 
      success: false, 
      message: 'Route API introuvable' 
    });
  }
  next();
});

// Catch-all pour SPA (doit être en dernier)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== SOCKET.IO ====================

const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    methods: ['GET', 'POST']
  }
});

// Middleware d'authentification Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentification : token manquant'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error('Authentification : token invalide ou expiré'));
  }
});

// Gestion des connexions
io.on('connection', async (socket) => {
  console.log(`Connexion temps réel : utilisateur ${socket.userId}`);

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

      // Notification
      try {
        const Notification = require('./models/Notification');
        const expediteurInfo = await User.findById(socket.userId);
        const nomExpediteur = expediteurInfo ? `${expediteurInfo.prenom} ${expediteurInfo.nom}` : "Quelqu'un";
        const preview = texte.trim().substring(0, 30) + (texte.trim().length > 30 ? '...' : '');

        const notification = await Notification.create({
          destinataire,
          texte: `Nouveau message de ${nomExpediteur} : "${preview}"`,
          type: 'new_message',
          lien: `/chat.html?contact=${socket.userId}`
        });

        io.to(destinataire).emit('notification', notification);
      } catch (notifError) {
        console.error('Erreur notification message:', notifError.message);
      }

      io.to(destinataire).emit('receive_message', nouveauMessage);
      io.to(socket.userId).emit('receive_message', nouveauMessage);
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
