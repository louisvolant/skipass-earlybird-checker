// routes/checker_history_api.js
const supabase = require('../config/supabase');
const { checkSkiPassStation } = require('../service/skipass-resort-call');

const TABLE_CHECKER_CONTENT = "checker_content";

// Helper function to fetch active configurations
async function getCheckList() {
  try {
    const { data, error } = await supabase
      .from(TABLE_CHECKER_CONTENT)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching check list:', error);
      throw new Error('Failed to fetch check list');
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching check list:', error);
    throw error;
  }
}

async function getCheckContent(check_id) {
  try {
    const { data, error } = await supabase
      .from(TABLE_CHECKER_CONTENT)
      .select('*')
      .eq('id', check_id)
      .single();

    if (error) {
      console.error('Error fetching check content:', error);
      throw new Error('Error retrieving check content');
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching check content:', error);
    throw error;
  }
}

module.exports = { getCheckList, getCheckContent };