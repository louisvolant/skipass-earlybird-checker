import mongoose from 'mongoose';

function buildUri(): string {
  return (
    'mongodb+srv://' +
    process.env.MONGODB_ATLAS_USERNAME +
    ':' +
    process.env.MONGODB_ATLAS_PASSWORD +
    '@' +
    process.env.MONGODB_ATLAS_CLUSTER_URL +
    '/' +
    process.env.MONGODB_ATLAS_DB_NAME +
    '?retryWrites=true&w=majority&appName=' +
    process.env.MONGODB_ATLAS_APP_NAME
  );
}

export async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(buildUri());
  }
  return mongoose.connection;
}

connectDB().catch((err) => console.error('MongoDB Connection Error:', err));

export default mongoose;
