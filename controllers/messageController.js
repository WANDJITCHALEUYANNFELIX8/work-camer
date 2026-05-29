const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Obtenir l'historique de chat entre deux utilisateurs
// @route   GET /api/messages/:userId
// @access  Private
exports.getConversationHistory = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Validation de l'ID avant la requête MongoDB
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'ID utilisateur invalide' });
    }

    const messages = await Message.find({
      $or: [
        { expediteur: currentUserId, destinataire: targetUserId },
        { expediteur: targetUserId, destinataire: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtenir la liste des discussions actives
// @route   GET /api/messages/active/chats
// @access  Private
exports.getActiveChats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Agrégation MongoDB : récupère uniquement le dernier message par paire de conversation
    // Bien plus efficace que charger tous les messages en mémoire
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { expediteur: currentUserId },
            { destinataire: currentUserId }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ['$expediteur', '$destinataire'] },
              { e: '$expediteur', d: '$destinataire' },
              { e: '$destinataire', d: '$expediteur' }
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    // Extraire les IDs des contacts
    const contactIds = conversations.map(conv => {
      const lm = conv.lastMessage;
      return lm.expediteur.toString() === currentUserId.toString()
        ? lm.destinataire
        : lm.expediteur;
    });

    // Charger les profils des contacts
    const contacts = await User.find({ _id: { $in: contactIds } })
      .select('nom prenom email telephone type cniStatus geoloc');

    const contactMap = {};
    contacts.forEach(c => { contactMap[c._id.toString()] = c; });

    const chatList = conversations.map(conv => {
      const lm = conv.lastMessage;
      const contactId = lm.expediteur.toString() === currentUserId.toString()
        ? lm.destinataire.toString()
        : lm.expediteur.toString();

      return {
        contact: contactMap[contactId],
        lastMessage: lm ? { texte: lm.texte, createdAt: lm.createdAt } : null
      };
    }).filter(c => c.contact); // Filtrer les contacts supprimés

    res.status(200).json({ success: true, count: chatList.length, chats: chatList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
