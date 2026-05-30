const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Utilisateur non trouvé' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Non autorisé, token invalide ou expiré' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Non autorisé, aucun token fourni' });
  }
};

// Middleware pour restreindre l'accès aux utilisateurs vérifiés CNI
const verifiedOnly = (req, res, next) => {
  if (req.user && req.user.cniStatus === 'Verified') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Accès refusé. Vous devez d'abord vérifier votre identité avec votre CNI"
    });
  }
};

module.exports = { protect, verifiedOnly };
