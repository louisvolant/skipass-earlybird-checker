import { NextRequest, NextResponse } from 'next/server';
import { checkSkiPassStation } from '../../../server/service/skipass-resort-call';
import { sendMail } from '../../../server/service/mailer-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authToken = req.headers.get('Authorization') || '';
  const bearerToken = authToken.replace('Bearer ', '');

  const isCronInvocation = process.env.CRON_SECRET ? bearerToken === process.env.CRON_SECRET : true;

  if (!isCronInvocation) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting scheduled check...');
    const checkResults = await checkSkiPassStation();
    console.log('Check results obtained:', checkResults);
    const mailResult = await sendMail(checkResults);
    console.log('Mail sending completed:', mailResult);

    return NextResponse.json({ message: 'Scheduled check completed', mailResult });
  } catch (error) {
    console.error('Scheduled check failed:', error);
    return NextResponse.json(
      { message: 'Scheduled check failed', error: (error as Error).message },
      { status: 500 }
    );
  }
}
