import { NextResponse } from 'next/server';
import { getDbUsage } from '../../../server/service/db-usage-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const dbUsage = await getDbUsage();
    return NextResponse.json({ success: true, dbUsage });
  } catch (error) {
    console.error('Error in /get-db-usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch database usage', message: (error as Error).message },
      { status: 500 }
    );
  }
}
