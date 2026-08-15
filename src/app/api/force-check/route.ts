import { NextResponse } from 'next/server';
import { checkSkiPassStation } from '../../../server/service/skipass-resort-call';
import { sendMail } from '../../../server/service/mailer-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    console.log('Manual check requested...');
    const checkResults = await checkSkiPassStation();
    console.log('Check results obtained:', checkResults);

    const mailResult = await sendMail(checkResults);
    console.log('Mail sending completed:', mailResult);

    return NextResponse.json({
      success: true,
      message: 'Check completed and stored',
      mailResult,
    });
  } catch (error) {
    console.error('Error during manual check:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
