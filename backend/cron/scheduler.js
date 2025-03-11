// cron/scheduler.js
const { checkSkiPassStation } = require('../service/skipass-resort-call');
const express = require('express');
const router = express.Router();

router.get('/scheduler', async (req, res) => {
  console.log('Starting scheduled check...');
  await checkSkiPassStation();
  res.status(200).json({ message: 'Scheduled check completed' });
});

module.exports = router;


