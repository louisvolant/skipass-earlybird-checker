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
const ActiveConfigurationModel = mongoose_client.model('checker_configuration', activeConfigurationSchema, 'checker_configuration');

async function getConfigurations(isActiveOnly = true) { // Default to true if not provided
  try {
    let query = {};
    if (isActiveOnly) {
      query = { is_active: true };
    }

    const existingData = await ActiveConfigurationModel.find(query); // Fetch based on the query
    if (existingData) {
        console.info(`Data (ActiveConfigurationModel) fetched from Internal MongoDB with query: ${JSON.stringify(query)}`);
    } else {
        console.info('No Data (ActiveConfigurationModel) fetched from Internal MongoDB');
    }
    return existingData;
  } catch (error) {
    console.error('Unexpected error fetching configurations:', error);
    throw error;
  }
}

async function updateConfiguration(id, updatedFields) {
  try {
    const result = await ActiveConfigurationModel.findOneAndUpdate(
      { id },
      { $set: updatedFields },
      { new: true }
    );

    if (!result) {
      throw new Error('Configuration not found or no changes made');
    }
    console.info(`Configuration ${id} updated successfully`);
    return result;
  } catch (error) {
    console.error('Error updating configuration:', error);
    throw error;
  }
}

module.exports = { getConfigurations, updateConfiguration };