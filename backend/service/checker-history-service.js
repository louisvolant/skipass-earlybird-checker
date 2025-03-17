// service/checker-history-service.js
const mongoose_client = require('../config/mongoose');

const checkerContentSchema = new mongoose_client.Schema({
    id: Number,
    created_at: String,
    http_code: Number,
    full_url: String,
    target_date: String,
    target_label: String,
    price: String,
    response_text: String
});
const CheckerContentModel = mongoose_client.model('checker_content', checkerContentSchema, 'checker_content'); //Third parameter forces the collection name.



// Helper function to fetch active configurations
async function getCheckList() {
  try {
    // Check if data already exists in MongoAtlas
    const existingData = await CheckerContentModel.find({})
      .select('-response_text') // Exclude response_text
      .sort({ created_at: -1 }); // -1 for descending, 1 for ascending

    if (existingData && existingData.length > 0) { // check if existingData is not null and has elements
      console.info('Data (CheckerContentModel) fetched from Internal MongoDB');
    } else {
      console.info('No Data (CheckerContentModel) fetched from Internal MongoDB');
    }
    return existingData;
  } catch (error) {
    console.error('Unexpected error fetching check list:', error);
    throw error;
  }
}

async function getCheckContent(check_id) {
  try {
    // Check if data already exists in MongoAtlas
    const existingData = await CheckerContentModel.findOne({
        id:check_id
    });
    if (existingData) { // Check if existingData is not null
      console.info('Data (CheckerContentModel) fetched from Internal MongoDB');
    } else {
      console.info('No Data (CheckerContentModel) fetched from Internal MongoDB');
    }
    return existingData;
  } catch (error) {
    console.error('Unexpected error fetching check content:', error);
    throw error;
  }
}

async function saveCheckContent(
  input_http_code,
  input_full_url,
  input_target_date,
  input_target_label,
  input_price,
  input_response_text
) {
  try {
    // Find the current maximum 'id' value
    const maxIdDocument = await CheckerContentModel.findOne().sort({ id: -1 }).limit(1);
    const nextId = maxIdDocument ? maxIdDocument.id + 1 : 1; // Start with 1 if no documents exist

    // Save the new data to MongoDB
    const CheckerContent = new CheckerContentModel({
      id: nextId, // Assign the generated ID
      created_at: new Date().toISOString(),
      http_code: input_http_code,
      full_url: input_full_url,
      target_date: input_target_date,
      target_label: input_target_label,
      price: input_price,
      response_text: input_response_text,
    });

    await CheckerContent.save();
    console.log('Data (CheckerContent) with ID:', nextId, 'saved to MongoDB');
  } catch (error) {
    console.error('Unexpected error saving CheckerContent data from internal DB:', error);
    throw error;
  }
}



async function deleteCheckContent(checkId) {
  try {
    // Find and delete the document with the matching 'id'
    const result = await CheckerContentModel.findOneAndDelete({ id: checkId });

    if (!result) {
      console.info(`No check found with ID: ${checkId} in MongoDB`);
      return null; // Return null if no document was found and deleted
    }

    console.info(`Check with ID: ${checkId} deleted from MongoDB`);
    return result; // Return the deleted document if successful
  } catch (error) {
    console.error('Error deleting check from MongoDB:', error);
    throw error; // Throw the error to be handled by the caller
  }
}



module.exports = { getCheckList, getCheckContent, saveCheckContent, deleteCheckContent };