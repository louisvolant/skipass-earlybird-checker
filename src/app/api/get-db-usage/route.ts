import { NextRequest, NextResponse } from 'next/server.js';
import { getDbUsage } from '../../../server/service/db-usage-service.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req?: NextRequest) {
  try {
    if (req?.signal?.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    const dbUsage = await getDbUsage();
    return NextResponse.json(
      { success: true, dbUsage },
      {
        headers: {
          // Private browser caching for 5 minutes: usage stats must never be
          // stored in shared caches where authorization is not re-evaluated.
          'Cache-Control': 'private, max-age=300',
        },
      }
    );
  } catch (error) {
    console.error('Error in /get-db-usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch database usage', message: (error as Error).message },
      { status: 500 }
    );
  }
}
