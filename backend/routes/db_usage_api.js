// routes/db_usage_api.js
const express = require('express');
const router = express.Router();
const { getDbUsage } = require('../service/db-usage-service');

router.get('/get-db-usage', async (req, res) => {
  try {
    const dbUsage = await getDbUsage();
    res.json({
      success: true,
      dbUsage,
    });
  } catch (error) {
    console.error('Error in /get-db-usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database usage',
      message: error.message,
    });
  }
});

module.exports = router;