import mongoose_client from '../config/mongoose';

const checkerContentSchema = new mongoose_client.Schema({
  id: Number,
  created_at: String,
  http_code: Number,
  full_url: String,
  target_date: String,
  target_label: String,
  price: String,
  response_text: String,
});
const CheckerContentModel = mongoose_client.model('checker_content', checkerContentSchema, 'checker_content');

export async function getCheckList() {
  try {
    const existingData = await CheckerContentModel.find({})
      .select('-response_text')
      .sort({ created_at: -1 });

    console.info(
      existingData && existingData.length > 0
        ? 'Data (CheckerContentModel) fetched from Internal MongoDB'
        : 'No Data (CheckerContentModel) fetched from Internal MongoDB'
    );
    return existingData;
  } catch (error) {
    console.error('Unexpected error fetching check list:', error);
    throw error;
  }
}

export async function getCheckContent(check_id: number) {
  try {
    const existingData = await CheckerContentModel.findOne({ id: check_id });
    console.info(
      existingData
        ? 'Data (CheckerContentModel) fetched from Internal MongoDB'
        : 'No Data (CheckerContentModel) fetched from Internal MongoDB'
    );
    return existingData;
  } catch (error) {
    console.error('Unexpected error fetching check content:', error);
    throw error;
  }
}

export async function saveCheckContent(
  input_http_code: string,
  input_full_url: string,
  input_target_date: string,
  input_target_label: string,
  input_price: string | null,
  input_response_text: string
) {
  try {
    const maxIdDocument = await CheckerContentModel.findOne().sort({ id: -1 }).limit(1);
    const nextId = maxIdDocument ? Number(maxIdDocument.id) + 1 : 1;

    const CheckerContent = new CheckerContentModel({
      id: nextId,
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

export async function deleteCheckContent(checkId: number) {
  try {
    const result = await CheckerContentModel.findOneAndDelete({ id: checkId });

    if (!result) {
      console.info(`No check found with ID: ${checkId} in MongoDB`);
      return null;
    }

    console.info(`Check with ID: ${checkId} deleted from MongoDB`);
    return result;
  } catch (error) {
    console.error('Error deleting check from MongoDB:', error);
    throw error;
  }
}
