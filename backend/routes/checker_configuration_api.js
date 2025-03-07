// routes/checker_configuration_api.js
const express = require('express');
const router = express.Router();
const { getActiveConfigurations } = require('../service/checker-configuration-service');
const apicache = require('apicache');

// Route to get active checker configurations
router.get('/get-checker-configuration', async (req, res) => {
  try {
    const configurations = await getActiveConfigurations();
    res.json({
      success: true,
      configurations: configurations.map(config => ({
        id: config.id,
        targetDate: config.target_date,
        targetLabel: config.target_label,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch checker configurations',
    });
  }
});

module.exports = router;