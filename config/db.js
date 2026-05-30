const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/work-camer');
    console.log(`MongoDB Connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB : ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
