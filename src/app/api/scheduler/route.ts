import { NextRequest, NextResponse } from 'next/server.js';
import { checkSkiPassStation } from '../../../server/service/skipass-resort-call.ts';
import { sendMail } from '../../../server/service/mailer-service.ts';
import { timingSafeEqualString } from '../../../server/utils/crypto-utils.ts';

export const dynamic = 'force-dynamic';
// Hobby plan caps serverless maxDuration at 60s.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Fail closed: without a configured CRON_SECRET the scheduler must never run,
  // otherwise anyone could trigger crawler checks and email sending.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured: refusing to run the scheduler (fail closed)');
    return NextResponse.json(
      { error: 'Unauthorized: scheduler is disabled until CRON_SECRET is configured' },
      { status: 401 }
    );
  }

  // Strict "Bearer <token>" parsing (avoids replace() that could mangle values).
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  // Constant-time comparison prevents leaking the secret through response timing.
  if (!(await timingSafeEqualString(bearerToken, cronSecret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (req.signal?.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    console.log('Starting scheduled check...');
    const checkResults = await checkSkiPassStation(req.signal);
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
