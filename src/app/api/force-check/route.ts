import { NextRequest, NextResponse } from 'next/server.js';
import { checkSkiPassStation } from '../../../server/service/skipass-resort-call.ts';
import { sendMail } from '../../../server/service/mailer-service.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req?: NextRequest) {
  try {
    if (req?.signal?.aborted) {
      return new NextResponse(null, { status: 499 });
    }

    console.log('Manual check requested...');
    const checkResults = await checkSkiPassStation(req?.signal);
    console.log('Check results obtained:', checkResults);

    const mailResult = await sendMail(checkResults);
    console.log('Mail sending completed:', mailResult);

    return NextResponse.json({
      success: true,
      message: 'Check completed and stored',
      mailResult,
    });
  } catch (error) {
    if (req?.signal?.aborted) {
      return new NextResponse(null, { status: 499 });
    }
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
