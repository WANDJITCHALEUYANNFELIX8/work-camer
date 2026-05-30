const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: [true, "Le titre de l'offre est obligatoire"],
    trim: true
  },
  description: {
    type: String,
    required: [true, "La description de l'offre est obligatoire"]
  },
  type: {
    type: String,
    enum: ['Micro-mission', 'Court terme', 'Long terme'],
    required: [true, 'Le type de tâche est obligatoire']
  },
  domaine: {
    type: String,
    required: [true, "Le domaine d'activité est obligatoire"],
    trim: true
  },
  budget: {
    type: Number,
    required: [true, 'Le budget (XAF) est obligatoire'],
    min: [0, 'Le budget ne peut pas être négatif']
  },
  localisation: {
    ville:     { type: String, required: [true, 'La ville est obligatoire'] },
    quartier:  { type: String, required: [true, 'Le quartier est obligatoire'] },
    latitude:  { type: Number, required: [true, 'La latitude GPS est obligatoire'] },
    longitude: { type: Number, required: [true, 'La longitude GPS est obligatoire'] }
  },
  statut: {
    type: String,
    enum: ['Ouvert', 'En cours', 'Clôturé'],
    default: 'Ouvert'
  },
  auteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour la recherche géographique et les filtres
jobSchema.index({ 'localisation.ville': 1, 'localisation.quartier': 1 });
jobSchema.index({ type: 1, domaine: 1, budget: 1 });
// AJOUT : index pour les filtres fréquents par statut et date
jobSchema.index({ statut: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
