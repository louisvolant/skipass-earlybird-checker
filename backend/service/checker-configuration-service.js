// service/checker-configuration-service.js
const mongoose_client = require('../config/mongoose');

const activeConfigurationSchema = new mongoose_client.Schema({
    id: Number,
    created_at: Date,
    is_active: Boolean,
    target_date: String,
    target_label: String,
    is_mail_alert: Boolean,
    mail_alert_address: String,
    mail_alert_contact: String
});
const ActiveConfigurationModel = mongoose_client.model('checker_configuration', activeConfigurationSchema, 'checker_configuration'); //Third parameter forces the collection name.

// Helper function to fetch active configurations
async function getActiveConfigurations() {
  try {
    // Check if data already exists in MongoAtlas
    const existingData = await ActiveConfigurationModel.find({}); // Fetch all, regardless of active status
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

async function updateConfiguration(id, updatedFields) {
  try {
    // Use findOneAndUpdate with { new: true } to return the updated document
    const result = await ActiveConfigurationModel.findOneAndUpdate(
      { id },
      { $set: updatedFields },
      { new: true } // Return the updated document
    );

    if (!result) {
      throw new Error('Configuration not found or no changes made');
    }
    console.info(`Configuration ${id} updated successfully`);
    return result; // Return the updated document
  } catch (error) {
    console.error('Error updating configuration:', error);
    throw error;
  }
}

module.exports = { getActiveConfigurations, updateConfiguration };