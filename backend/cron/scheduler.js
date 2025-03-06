// scheduler.js
const cron = require('node-cron');
const { checkSkiPassStation } = require('../service/skipass-resort-call');

module.exports = async (req, res) => {
  console.log('Starting scheduled check...');
  await checkSkiPassStation();
  res.status(200).json({ message: 'Scheduled check completed' });
};

console.log('Application started. Check scheduled every 12 hours.');

