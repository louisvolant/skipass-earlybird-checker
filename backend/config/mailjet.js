// config/mailjet.js
const Mailjet = require('node-mailjet');

const mailjet_client = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY,
  apiSecret: process.env.MAILJET_SECRET_KEY
});

module.exports = mailjet_client;