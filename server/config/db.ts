import mongoose from 'mongoose';

export const dbInit = async () => {
  try {
    const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/agripulse';
    
    // In preview environments, DATABASE_URL might be a postgres string. 
    // If we detect postgres, we will warn and skip mongoose connection.
    if (mongoUri.startsWith('postgres')) {
       console.warn("DATABASE_URL is a Postgres string. Please provide a MongoDB connection string in DATABASE_URL.");
       return;
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB (Mongoose) successfully.");
  } catch (e) {
    console.error("Failed to connect to MongoDB:", e);
  }
};

export default mongoose;
