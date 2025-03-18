// routes/checker_configuration_api.js
const express = require('express');
const router = express.Router();
const { getActiveConfigurations, updateConfiguration } = require('../service/checker-configuration-service');
const { maskEmail } = require('../utils/mail-utils');

const apicache = require('apicache');

// Route to get active checker configurations
router.get('/get-checker-configuration', async (req, res) => {
  try {
    const configurations = await getActiveConfigurations();
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch checker configurations',
    });
  }
});

router.post('/update-checker-configuration', async (req, res) => {
  try {
    const { id, is_active, targetDate, targetLabel, is_mail_alert, mail_alert_address, mail_alert_contact } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Configuration ID is required'
      });
    }

    const updatedConfig = await updateConfiguration(id, {
      is_active,
      target_date: targetDate,
      target_label: targetLabel,
      is_mail_alert,
      mail_alert_address,
      mail_alert_contact,
    });

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


module.exports = router;