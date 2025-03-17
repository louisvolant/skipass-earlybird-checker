const mailjet_client = require('../config/mailjet');

async function sendMail(configurations) {
  try {
    // Filter configurations where mail alert is enabled and build messages array
    const messages = configurations
      .filter(config => config.is_mail_alert === true)
      .map(config => ({
        From: {
          Email: process.env.MAIL_ORIGIN_ADDRESS,
          Name: "Skipass Earlybird Checker"
        },
        To: [{
          Email: config.mail_alert_address || "default@example.com",
          Name: config.mail_alert_contact || "User"
        }],
        Subject: `Skipass Available for ${config.target_label}`,
        TextPart: `Good news! Skipass is available for ${config.target_label} on ${config.target_date}.`,
        HTMLPart: `
          <h3>Skipass Availability Alert</h3>
          <p>Good news! We found available skipasses for:</p>
          <ul>
            <li><strong>Location:</strong> ${config.target_label}</li>
            <li><strong>Date:</strong> ${config.target_date}</li>
          </ul>
          <p>Book now before they're gone!</p>
          <p>Sent via Skipass Earlybird Checker</p>
        `
      }));

    // If no messages to send, return early
    if (messages.length === 0) {
      console.log('No mail alerts to send based on configurations');
      return { status: 'skipped', messagesSent: 0 };
    }

    // Send emails using Mailjet
    const result = await mailjet_client
      .post('send', { version: 'v3.1' })
      .request({
        Messages: messages
      });

    console.log('Mailjet response:', result.body);
    return {
      status: 'success',
      messagesSent: messages.length,
      response: result.body
    };
  } catch (error) {
    console.error('Error sending mail:', error.statusCode || error.message);
    throw new Error(`Failed to send emails: ${error.message}`);
  }
}

module.exports = { sendMail };