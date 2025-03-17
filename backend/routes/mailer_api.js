// routes/mailer_api.js
const express = require('express');
const router = express.Router();
const { getActiveConfigurations } = require('../service/checker-configuration-service');
const { sendMail } = require('../service/mailer-service');
const { maskEmail } = require('../utils/mail-utils');

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