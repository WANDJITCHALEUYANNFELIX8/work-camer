const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  motivation: {
    type: String,
    required: [true, 'Un message de motivation est obligatoire pour postuler']
  },
  statut: {
    type: String,
    enum: ['En attente', 'Accepté', 'Refusé'],
    default: 'En attente'
  }
}, {
  timestamps: true
});

// Empêcher de postuler plusieurs fois au même job
applicationSchema.index({ job: 1, candidat: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
