import { connectDB } from '../config/mongoose';

export async function getDbUsage() {
  try {
    const connection = await connectDB();
    const db = connection.db;

    if (!db) {
      throw new Error('No MongoDB database connection available');
    }

    const stats = await db.stats();
    const sizeInMB = (stats.dataSize / (1024 * 1024)).toFixed(2);

    return {
      size: `${sizeInMB} MB`,
      rawSize: stats.dataSize,
      collections: stats.collections,
      objects: stats.objects,
    };
  } catch (error) {
    console.error('Error fetching DB usage:', error);
    throw error;
  }
}
