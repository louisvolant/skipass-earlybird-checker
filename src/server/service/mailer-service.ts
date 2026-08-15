import { getMailjet } from '../config/mailjet';

export type CheckResult = {
  configId: number | string;
  target_date: string;
  target_label: string;
  is_mail_alert: boolean;
  mail_alert_address?: string;
  mail_alert_contact?: string;
  found: boolean;
  price?: string | number | null;
};

export async function sendMail(checkResults: CheckResult[]) {
  try {
    const messages = checkResults
      .filter((result) => result.found === true && result.is_mail_alert === true)
      .map((result) => ({
        From: {
          Email: process.env.MAIL_ORIGIN_ADDRESS,
          Name: 'Skipass Earlybird Checker',
        },
        To: [
          {
            Email: result.mail_alert_address || 'default@example.com',
            Name: result.mail_alert_contact || 'User',
          },
        ],
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
        `,
      }));

    if (messages.length === 0) {
      console.log('No mail alerts to send (either no skipasses found or no mail alerts enabled)');
      return { status: 'skipped', messagesSent: 0 };
    }

    const result = await getMailjet().post('send', { version: 'v3.1' }).request({ Messages: messages });

    console.log('Mailjet response:', result.body);
    return {
      status: 'success',
      messagesSent: messages.length,
      response: result.body,
    };
  } catch (error) {
    console.error('Error sending mail:', error);
    throw new Error(`Failed to send emails: ${(error as Error).message}`);
  }
}
