import mongoose_client from '../config/mongoose';

const activeConfigurationSchema = new mongoose_client.Schema({
  id: Number,
  created_at: Date,
  is_active: Boolean,
  target_date: String,
  target_label: String,
  is_mail_alert: Boolean,
  mail_alert_address: String,
  mail_alert_contact: String,
});
const ActiveConfigurationModel = mongoose_client.model(
  'checker_configuration',
  activeConfigurationSchema,
  'checker_configuration'
);

export async function getConfigurations(isActiveOnly = true) {
  try {
    const query: Record<string, unknown> = {};
    if (isActiveOnly) {
      query.is_active = true;
    }

    const existingData = await ActiveConfigurationModel.find(query);
    console.info(
      `Data (ActiveConfigurationModel) fetched from Internal MongoDB with query: ${JSON.stringify(query)}`
    );
    return existingData;
  } catch (error) {
    console.error('Unexpected error fetching configurations:', error);
    throw error;
  }
}

export async function updateConfiguration(id: number, updatedFields: Record<string, unknown>) {
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
