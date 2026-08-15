import Mailjet from 'node-mailjet';

let mailjet_client: InstanceType<typeof Mailjet> | null = null;

export function getMailjet() {
  if (!mailjet_client) {
    mailjet_client = new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_SECRET_KEY,
    });
  }
  return mailjet_client;
}
