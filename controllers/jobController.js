const Job = require('../models/Job');

// @desc    Créer une nouvelle offre
// @route   POST /api/jobs
// @access  Private + CNI Vérifiée
exports.createJob = async (req, res) => {
  try {
    if (req.user.cniStatus !== 'Verified') {
      return res.status(403).json({
        success: false,
        message: 'Vous devez faire vérifier votre CNI avant de publier une offre.'
      });
    }

    const { titre, description, type, domaine, budget, ville, quartier, latitude, longitude } = req.body;

    // Validation basique des champs obligatoires
    if (!titre || !description || !type || !domaine || !budget || !ville || !quartier) {
      return res.status(400).json({ success: false, message: 'Tous les champs obligatoires doivent être renseignés.' });
    }

    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget < 0) {
      return res.status(400).json({ success: false, message: 'Le budget doit être un nombre positif.' });
    }

    const job = await Job.create({
      titre: titre.trim(),
      description: description.trim(),
      type,
      domaine: domaine.trim(),
      budget: parsedBudget,
      localisation: {
        ville: ville.trim(),
        quartier: quartier.trim(),
        latitude: parseFloat(latitude) || req.user.geoloc.latitude,
        longitude: parseFloat(longitude) || req.user.geoloc.longitude
      },
      auteur: req.user._id
    });

    res.status(201).json({ success: true, message: 'Offre publiée avec succès', job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir toutes les offres avec filtres
// @route   GET /api/jobs
// @access  Public
exports.getJobs = async (req, res) => {
  try {
    const { ville, quartier, type, domaine, budgetMin, budgetMax, search } = req.query;
    let query = {};

    if (ville) query['localisation.ville'] = { $regex: ville, $options: 'i' };
    if (quartier) query['localisation.quartier'] = { $regex: quartier, $options: 'i' };
    if (type) query.type = type;
    if (domaine) query.domaine = { $regex: domaine, $options: 'i' };

    if (budgetMin || budgetMax) {
      query.budget = {};
      if (budgetMin) query.budget.$gte = parseInt(budgetMin);
      if (budgetMax) query.budget.$lte = parseInt(budgetMax);
    }

    if (search) {
      query.$or = [
        { titre: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const jobs = await Job.find(query)
      .populate('auteur', 'nom prenom email telephone cniStatus geoloc')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir une offre par ID
// @route   GET /api/jobs/:id
// @access  Public
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('auteur', 'nom prenom email telephone cniStatus');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Offre introuvable' });
    }
    res.status(200).json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir les offres de l'utilisateur connecté
// @route   GET /api/jobs/my/offers
// @access  Private
exports.getMyOffers = async (req, res) => {
  try {
    const jobs = await Job.find({ auteur: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
