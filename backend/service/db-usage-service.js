// service/db-usage-service.js
const mongoose_client = require('../config/mongoose');

async function getDbUsage() {
  try {
    const db = mongoose_client.connection.db;
    const stats = await db.stats();

    // Convert bytes to human-readable format (e.g., MB)
    const sizeInMB = (stats.dataSize / (1024 * 1024)).toFixed(2);
    return {
      size: `${sizeInMB} MB`,
      rawSize: stats.dataSize, // in bytes
      collections: stats.collections,
      objects: stats.objects
    };
  } catch (error) {
    console.error('Error fetching DB usage:', error);
    throw error;
  }
}

module.exports = { getDbUsage };