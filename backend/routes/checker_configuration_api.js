// routes/checker_configuration_api.js
const express = require('express');
const router = express.Router();
const { getConfigurations, updateConfiguration } = require('../service/checker-configuration-service'); // Renamed getActiveConfigurations to getConfigurations
const { maskEmail } = require('../utils/mail-utils');

const apicache = require('apicache');

// Route to get checker configurations
router.get('/get-checker-configuration', async (req, res) => {
  console.log('GET /api/get-checker-configuration called');
  // Get the isActiveOnly query parameter, default to 'true' if not present
  const isActiveOnly = req.query.isActiveOnly === 'true'; // Convert string to boolean
  console.log('isActiveOnly query param:', isActiveOnly);

  try {
    // Pass the isActiveOnly flag to the service function
    const configurations = await getConfigurations(isActiveOnly);
    console.log('Configurations retrieved:', configurations.length, 'items');
    res.json({
      success: true,
      configurations: configurations.map(config => ({
        id: config.id,
        is_active: config.is_active,
        targetDate: config.target_date,
        targetLabel: config.target_label,
        is_mail_alert: !!config.is_mail_alert,
        mail_alert_address: maskEmail(config.mail_alert_address),
        mail_alert_contact: config.mail_alert_contact
      })),
    });
  } catch (error) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch checker configurations',
    });
  }
});

router.post('/update-checker-configuration', async (req, res) => {
  try {
    const { id, ...updatedFields } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Configuration ID is required'
      });
    }

    const dbFields = {};
    if (updatedFields.hasOwnProperty('is_active')) {
      dbFields.is_active = updatedFields.is_active;
    }
    if (updatedFields.hasOwnProperty('targetDate')) {
      dbFields.target_date = updatedFields.targetDate;
    }
    if (updatedFields.hasOwnProperty('targetLabel')) {
      dbFields.target_label = updatedFields.targetLabel;
    }
    if (updatedFields.hasOwnProperty('is_mail_alert')) {
      dbFields.is_mail_alert = updatedFields.is_mail_alert;
    }
    if (updatedFields.hasOwnProperty('mail_alert_address')) {
      dbFields.mail_alert_address = updatedFields.mail_alert_address;
    }
    if (updatedFields.hasOwnProperty('mail_alert_contact')) {
      dbFields.mail_alert_contact = updatedFields.mail_alert_contact;
    }

    const updatedConfig = await updateConfiguration(id, dbFields);

    apicache.clear('/api/get-checker-configuration');

    res.json({
      success: true,
      configuration: {
        id: updatedConfig.id,
        is_active: updatedConfig.is_active,
        targetDate: updatedConfig.target_date,
        targetLabel: updatedConfig.target_label,
        is_mail_alert: !!updatedConfig.is_mail_alert,
        mail_alert_address: maskEmail(updatedConfig.mail_alert_address),
        mail_alert_contact: updatedConfig.mail_alert_contact
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      message: error.message
    });
  }
});

router.post('/clear-cache', (req, res) => {
  try {
    console.log('Clearing cache for /api/get-checker-configuration');
    apicache.clear('/api/get-checker-configuration');
    res.json({ success: true, message: 'Cache cleared for /api/get-checker-configuration' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

module.exports = router;