const Application = require('../models/Application');
const Job = require('../models/Job');
const Notification = require('../models/Notification');

// @desc    Postuler à une offre
// @route   POST /api/applications
// @access  Private + CNI Vérifiée
exports.applyJob = async (req, res) => {
  try {
    if (req.user.cniStatus !== 'Verified') {
      return res.status(403).json({
        success: false,
        message: 'Vous devez faire vérifier votre CNI avant de postuler à une offre.'
      });
    }

    const { jobId, motivation } = req.body;

    if (!jobId || !motivation) {
      return res.status(400).json({ success: false, message: "L'offre et la motivation sont obligatoires." });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Offre d'emploi introuvable" });
    }

    if (job.auteur.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas postuler à votre propre offre' });
    }

    const alreadyApplied = await Application.findOne({ job: jobId, candidat: req.user._id });
    if (alreadyApplied) {
      return res.status(400).json({ success: false, message: 'Vous avez déjà postulé à cette offre' });
    }

    const application = await Application.create({
      job: jobId,
      candidat: req.user._id,
      motivation: motivation.trim()
    });

    try {
      const notification = await Notification.create({
        destinataire: job.auteur,
        texte: `Nouvelle candidature de ${req.user.prenom} ${req.user.nom} pour "${job.titre}"`,
        type: 'new_application',
        lien: '/dashboard.html'
      });
      if (req.io) {
        req.io.to(job.auteur.toString()).emit('notification', notification);
      }
    } catch (notifError) {
      console.error('Erreur notification candidature:', notifError.message);
    }

    res.status(201).json({ success: true, message: 'Votre candidature a été envoyée avec succès', application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir les candidatures d'une offre (pour le recruteur propriétaire)
// @route   GET /api/applications/job/:jobId
// @access  Private
exports.getJobApplications = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Offre d'emploi introuvable" });
    }

    if (job.auteur.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Non autorisé à voir ces candidatures' });
    }

    // Ne pas exposer biometrics — uniquement les données nécessaires au recruteur
    const applications = await Application.find({ job: jobId })
      .populate('candidat', 'nom prenom email telephone cniStatus geoloc')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: applications.length, applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mettre à jour le statut d'une candidature
// @route   PUT /api/applications/:id
// @access  Private
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { statut } = req.body;

    if (!['Accepté', 'Refusé'].includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }

    const application = await Application.findById(req.params.id).populate('job');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Candidature introuvable' });
    }

    if (application.job.auteur.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Non autorisé à modifier cette candidature' });
    }

    application.statut = statut;
    await application.save();

    try {
      const notification = await Notification.create({
        destinataire: application.candidat,
        texte: `Votre candidature pour "${application.job.titre}" a été ${statut.toLowerCase()}`,
        type: 'application_status',
        lien: statut === 'Accepté' ? `/chat.html?contact=${req.user._id}` : '/dashboard.html'
      });
      if (req.io) {
        req.io.to(application.candidat.toString()).emit('notification', notification);
      }
    } catch (notifError) {
      console.error('Erreur notification statut:', notifError.message);
    }

    res.status(200).json({
      success: true,
      message: `Candidature ${statut.toLowerCase()} avec succès`,
      application
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir les candidatures de l'utilisateur connecté
// @route   GET /api/applications/my/submissions
// @access  Private
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Application.find({ candidat: req.user._id })
      .populate({
        path: 'job',
        populate: {
          path: 'auteur',
          select: 'nom prenom email telephone cniStatus'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
