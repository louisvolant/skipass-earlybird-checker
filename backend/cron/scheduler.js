// cron/scheduler.js
const { checkSkiPassStation } = require('../service/skipass-resort-call');
const { sendMail } = require('../service/mailer-service');
const express = require('express');
const router = express.Router();

router.get('/scheduler', async (req, res) => {
  console.log('Starting scheduled check...');
  const checkResults = await checkSkiPassStation();
  console.log('Check results obtained:', checkResults);
  const mailResult = await sendMail(checkResults);
  console.log('Mail sending completed:', mailResult);

  res.status(200).json({ message: 'Scheduled check completed', mailResult });
});

module.exports = router;


