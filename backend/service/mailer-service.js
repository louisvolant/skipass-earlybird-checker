// service/mailer-service.js
const mailjet_client = require('../config/mailjet');

async function sendMail(checkResults) {
  try {
    // Filter configurations where skipass is found AND mail alert is enabled
    const messages = checkResults
      .filter(result => result.found === true && result.is_mail_alert === true)
      .map(result => ({
        From: {
          Email: process.env.MAIL_ORIGIN_ADDRESS,
          Name: "Skipass Earlybird Checker"
        },
        To: [{
          Email: result.mail_alert_address || "default@example.com",
          Name: result.mail_alert_contact || "User"
        }],
        Subject: `Skipass Available for ${result.target_label}`,
        TextPart: `Good news! Skipass is available for ${result.target_label} on ${result.target_date}${result.price ? ` for €${result.price}` : ''}.`,
        HTMLPart: `
          <h3>Skipass Availability Alert</h3>
          <p>Good news! We found available skipasses for:</p>
          <ul>
            <li><strong>Location:</strong> ${result.target_label}</li>
            <li><strong>Date:</strong> ${result.target_date}</li>
            ${result.price ? `<li><strong>Price:</strong> €${result.price}</li>` : ''}
          </ul>
          <p>Book now before they're gone!</p>
          <p>Sent via Skipass Earlybird Checker</p>
        `
      }));

    if (messages.length === 0) {
      console.log('No mail alerts to send (either no skipasses found or no mail alerts enabled)');
      return { status: 'skipped', messagesSent: 0 };
    }

    const result = await mailjet_client
      .post('send', { version: 'v3.1' })
      .request({ Messages: messages });

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