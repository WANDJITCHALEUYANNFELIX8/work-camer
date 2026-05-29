const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire']
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire']
  },
  email: {
    type: String,
    required: [true, "L'adresse email est obligatoire"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez entrer un email valide'
    ]
  },
  telephone: {
    type: String,
    required: [true, 'Le numéro de téléphone est obligatoire']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: 6,
    select: false
  },
  type: {
    type: String,
    enum: ['Candidat', 'Recruteur', 'Particulier'],
    required: [true, "Le type d'utilisateur est obligatoire"]
  },
  cniStatus: {
    type: String,
    enum: ['Not_Submitted', 'Pending', 'Verified', 'Rejected'],
    default: 'Not_Submitted'
  },
  biometrics: {
    cniNumber: { type: String, default: null },
    // Stockage d'URL vers fichier externe (ne pas stocker base64 en DB)
    cniPhotoUrl: { type: String, default: null },
    selfiePhotoUrl: { type: String, default: null },
    faceMatchScore: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null }
  },
  geoloc: {
    ville: {
      type: String,
      required: [true, 'La ville est obligatoire']
    },
    quartier: {
      type: String,
      required: [true, 'Le quartier est obligatoire']
    },
    latitude: {
      type: Number,
      required: [true, 'La latitude GPS est obligatoire']
    },
    longitude: {
      type: Number,
      required: [true, 'La longitude GPS est obligatoire']
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
