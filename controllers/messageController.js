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

    // CORRECTION : valider l'ID avant la requête MongoDB
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

    // CORRECTION : agrégation MongoDB pour éviter de charger tous les messages en mémoire
    const chatGroups = await Message.aggregate([
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

    // Extraire les IDs de contact uniques
    const contactIds = chatGroups.map(group => {
      const { e, d } = group._id;
      return e.toString() === currentUserId.toString() ? d : e;
    });

    const contacts = await User.find({ _id: { $in: contactIds } })
      .select('nom prenom email telephone type cniStatus geoloc');

    // Assembler la liste chat avec le dernier message
    const chatList = chatGroups.map(group => {
      const { e, d } = group._id;
      const contactId = e.toString() === currentUserId.toString() ? d : e;
      const contact = contacts.find(c => c._id.toString() === contactId.toString());
      return {
        contact,
        lastMessage: group.lastMessage ? {
          texte: group.lastMessage.texte,
          createdAt: group.lastMessage.createdAt
        } : null
      };
    }).filter(c => c.contact); // Filtrer les contacts supprimés

    res.status(200).json({ success: true, count: chatList.length, chats: chatList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
