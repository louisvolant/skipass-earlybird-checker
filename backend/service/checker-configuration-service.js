// service/checker-configuration-service.js
const supabase = require('../config/supabase');

const TABLE_CHECKER_CONFIGURATION = "checker_configuration";

// Helper function to fetch active configurations
async function getActiveConfigurations() {
  try {
    const { data, error } = await supabase
      .from(TABLE_CHECKER_CONFIGURATION)
      .select('id, target_date, target_label')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching active configurations:', error);
      throw new Error('Failed to fetch configurations');
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching configurations:', error);
    throw error;
  }
}

module.exports = { getActiveConfigurations };