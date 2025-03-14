// service/checker-configuration-service.js
const mongoose_client = require('../config/mongoose');

const activeConfigurationSchema = new mongoose_client.Schema({
    id: Number,
    created_at: Date,
    is_active: Boolean,
    target_date: String,
    target_label: String,
});
const ActiveConfigurationModel = mongoose_client.model('checker_configuration', activeConfigurationSchema, 'checker_configuration'); //Third parameter forces the collection name.

// Helper function to fetch active configurations
async function getActiveConfigurations() {
  try {
    // Check if data already exists in MongoAtlas
    const existingData = await ActiveConfigurationModel.find({
        is_active: true
    });
    if (existingData) {
        console.info('Data (ActiveConfigurationModel) fetched from Internal MongoDB');
    } else {
        console.info('No Data (ActiveConfigurationModel) fetched from Internal MongoDB');
    }
    return existingData;
  } catch (error) {
    console.error('Unexpected error fetching active configurations:', error);
    throw error;
  }
}

module.exports = { getActiveConfigurations };