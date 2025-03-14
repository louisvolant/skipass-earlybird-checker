// config/mongoose.js
const mongoose_client = require('mongoose');

const MONGO_URI = "mongodb+srv://" +
    process.env.MONGODB_ATLAS_USERNAME+ ":" +
    process.env.MONGODB_ATLAS_PASSWORD + "@" +
    process.env.MONGODB_ATLAS_CLUSTER_URL + "/" +
    process.env.MONGODB_ATLAS_DB_NAME + "?retryWrites=true&w=majority&appName=" +
    process.env.MONGODB_ATLAS_APP_NAME
//console.log('Mongo URI:', MONGO_URI);

// Connect to MongoDB using Mongoose
mongoose_client.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

module.exports = mongoose_client;