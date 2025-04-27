// service/db-usage-service.js
const mongoose_client = require('../config/mongoose');

async function getDbUsage() {
  try {
    if (mongoose_client.connection.readyState !== 1) {
      /**
      mongoose.connection.readyState values:
      0 = disconnected
      1 = connected
      2 = connecting
      3 = disconnecting
      */
      await mongoose_client.connect();
    }

    const db = mongoose_client.connection.db;
    const stats = await db.stats();

    const sizeInMB = (stats.dataSize / (1024 * 1024)).toFixed(2);
    return {
      size: `${sizeInMB} MB`,
      rawSize: stats.dataSize,
      collections: stats.collections,
      objects: stats.objects
    };
  } catch (error) {
    console.error('Error fetching DB usage:', error);
    throw error;
  }
}


module.exports = { getDbUsage };