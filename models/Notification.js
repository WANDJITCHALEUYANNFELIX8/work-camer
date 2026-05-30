const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  destinataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  texte: {
    type: String,
    required: [true, 'Le texte de la notification est obligatoire']
  },
  type: {
    type: String,
    enum: ['application_status', 'new_application', 'new_message', 'cni_verified'],
    required: true
  },
  lien: {
    type: String,
    default: ''
  },
  lu: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
