import { NextResponse } from 'next/server.js';
import { getCheckList } from '../../../server/service/checker-history-service.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const checkList = await getCheckList();

    const formattedData = checkList.map((check) => ({
      id: check.id,
      timestamp: check.created_at,
      httpCode: check.http_code,
      url: check.full_url,
      targetDate: check.target_date,
      targetLabel: check.target_label,
      price: check.price,
      hasContent: !!check.price,
    }));

    return NextResponse.json(
      { success: true, checks: formattedData },
      {
        headers: {
          // Cache on Cloudflare edge for 60 seconds to avoid repeating DB queries on page refreshes
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching checks:', error);
    return NextResponse.json({ error: 'Error fetching check history' }, { status: 500 });
  }
}
