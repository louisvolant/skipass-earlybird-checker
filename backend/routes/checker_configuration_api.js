// routes/checker_configuration_api.js
const express = require('express');
const router = express.Router();
const { getActiveConfigurations } = require('../service/checker-configuration-service');
const { sendMail } = require('../service/mailer-service');
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
        targetDate: config.target_date,
        targetLabel: config.target_label,
        is_mail_alert: !!config.is_mail_alert,
        mail_alert_address: maskEmail(config.mail_alert_address)
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch checker configurations',
    });
  }
});

router.get('/send-mail', async (req, res) => {
  try {
    const result = await sendMail(getActiveConfigurations());
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send Mail',
      message: error.message
    });
  }
});

module.exports = router;