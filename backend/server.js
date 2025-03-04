// server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const apicache = require('apicache');
const apiRoutes = require('./routes/api');

const app = express();

// Initialize apicache with a 1 hour cache duration
const cache = apicache.middleware('1 hour');

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_DEV_FRONTEND_URL_AND_PORT,
  credentials: true
}));


const apiRoutes = require('./routes/api');
const scheduler = require('./scheduler');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});