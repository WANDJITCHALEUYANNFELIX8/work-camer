const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/work-camer');
    console.log(`MongoDB Connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB : ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Astuce : MongoDB n’est pas démarré. Lance "mongod" dans un autre terminal.');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
