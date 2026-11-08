import { NextResponse } from 'next/server.js';
import { getDbUsage } from '../../../server/service/db-usage-service.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const dbUsage = await getDbUsage();
    return NextResponse.json(
      { success: true, dbUsage },
      {
        headers: {
          // Cache on Cloudflare edge for 5 minutes, serve stale while revalidating for 10 minutes
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
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
