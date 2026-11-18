import { getMailjet } from '../config/mailjet.ts';
import { escapeHtml } from '../utils/html-utils.ts';

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
      .map((result) => {
        // Configuration fields are user controlled and are interpolated into
        // the email body: escape them to prevent HTML injection into alerts.
        const safeLabel = escapeHtml(result.target_label);
        const safeDate = escapeHtml(result.target_date);
        const safePrice = escapeHtml(result.price ?? '');
        const safeContact = escapeHtml(result.mail_alert_contact);
        return {
        From: {
          Email: process.env.MAIL_ORIGIN_ADDRESS,
          Name: 'Skipass Earlybird Checker',
        },
        To: [
          {
            Email: result.mail_alert_address || 'default@example.com',
            Name: safeContact || 'User',
          },
        ],
        Subject: `Skipass Available for ${safeLabel}`,
        TextPart: `Good news! Skipass is available for ${safeLabel} on ${safeDate}${result.price ? ` for €${safePrice}` : ''}.`,
        HTMLPart: `
          <h3>Skipass Availability Alert</h3>
          <p>Good news! We found available skipasses for:</p>
          <ul>
            <li><strong>Location:</strong> ${safeLabel}</li>
            <li><strong>Date:</strong> ${safeDate}</li>
            ${result.price ? `<li><strong>Price:</strong> €${safePrice}</li>` : ''}
          </ul>
          <p>Book now before they're gone!</p>
          <p>Sent via Skipass Earlybird Checker</p>
        `,
        };
      });

    if (messages.length === 0) {
      console.log('No mail alerts to send (either no skipasses found or no mail alerts enabled)');
      return { status: 'skipped', messagesSent: 0 };
    }

    const result = await getMailjet().post('send', { version: 'v3.1' }).request({ Messages: messages });

    // Log only the outcome, never the API payload: recipient addresses are
    // customer PII and Workers observability persists console output.
    console.log(`Mail sending completed successfully: ${messages.length} message(s) sent`);
    return {
      status: 'success',
      messagesSent: messages.length,
    };
  } catch (error) {
    console.error('Error sending mail:', error);
    throw new Error(`Failed to send emails: ${(error as Error).message}`);
  }
}
