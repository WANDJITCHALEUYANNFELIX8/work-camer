const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Enregistrer un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, password, type, ville, quartier, latitude, longitude } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Un utilisateur existe déjà avec cet email' });
    }

    const lat = latitude ? parseFloat(latitude) : 3.8480;
    const lng = longitude ? parseFloat(longitude) : 11.5021;

    const user = await User.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      type,
      geoloc: {
        ville: ville || 'Yaoundé',
        quartier: quartier || 'Mvan',
        latitude: lat,
        longitude: lng
      }
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        type: user.type,
        cniStatus: user.cniStatus,
        geoloc: user.geoloc
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authentifier un utilisateur & obtenir un token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Veuillez fournir un email et un mot de passe' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        type: user.type,
        cniStatus: user.cniStatus,
        geoloc: user.geoloc
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Simuler la vérification biométrique et OCR de la CNI
// @route   POST /api/auth/verify-cni
// @access  Private
exports.verifyCNI = async (req, res) => {
  try {
    const { cniPhoto, selfiePhoto } = req.body;

    if (!cniPhoto || !selfiePhoto) {
      return res.status(400).json({
        success: false,
        message: 'La photo de la CNI et le selfie sont obligatoires'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    user.cniStatus = 'Pending';
    await user.save();

    // Simulation OCR
    const simulatedCniNumber = 'CNI-CMR-' + Math.floor(100000000 + Math.random() * 900000000);
    // Simulation comparaison faciale (score entre 92% et 99%)
    const simulatedFaceMatchScore = parseFloat((92 + Math.random() * 7).toFixed(2));

    const extractedData = {
      nationality: 'CAMEROUNAISE',
      cniNumber: simulatedCniNumber,
      nomExtrait: user.nom.toUpperCase(),
      prenomExtrait: user.prenom.toUpperCase(),
      faceMatchScore: simulatedFaceMatchScore
    };

    // NOTE : En production, stocker les photos dans un service externe (Cloudinary, S3)
    // et ne conserver ici que les URLs. On ne stocke PAS le base64 en DB.
    user.cniStatus = 'Verified';
    user.biometrics = {
      cniNumber: simulatedCniNumber,
      cniPhotoUrl: null,    // remplacer par l'URL du fichier uploadé
      selfiePhotoUrl: null, // remplacer par l'URL du fichier uploadé
      faceMatchScore: simulatedFaceMatchScore,
      verifiedAt: new Date(),
      rejectionReason: null
    };

    await user.save();

    try {
      const Notification = require('../models/Notification');
      const notification = await Notification.create({
        destinataire: user._id,
        texte: `Félicitations ${user.prenom}, votre identité CNI a été vérifiée avec succès !`,
        type: 'cni_verified',
        lien: '/index.html'
      });
      if (req.io) {
        req.io.to(user._id.toString()).emit('notification', notification);
      }
    } catch (notifError) {
      console.error('Erreur notification CNI:', notifError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Vérification biométrique réussie',
      cniStatus: 'Verified',
      extractedData
    });
  } catch (error) {
    // Sécurisation du bloc catch : biometrics peut ne pas exister encore
    try {
      const user = await User.findById(req.user._id);
      if (user) {
        user.cniStatus = 'Rejected';
        user.biometrics = user.biometrics || {};
        user.biometrics.rejectionReason = error.message;
        await user.save();
      }
    } catch (innerErr) {
      console.error('Erreur dans le bloc catch de verifyCNI:', innerErr.message);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir le profil public d'un autre utilisateur
// @route   GET /api/auth/profile/:userId
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const profile = await User.findById(req.params.userId)
      .select('nom prenom email telephone type cniStatus geoloc');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    res.status(200).json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
