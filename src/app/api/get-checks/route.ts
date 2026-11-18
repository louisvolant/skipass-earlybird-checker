import { NextRequest, NextResponse } from 'next/server.js';
import { getCheckList } from '../../../server/service/checker-history-service.ts';

export const dynamic = 'force-dynamic';

export async function GET(req?: NextRequest) {
  try {
    if (req?.signal?.aborted) {
      return new NextResponse(null, { status: 499 });
    }

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
          // Private browser caching only: check history contains customer-related
          // data and must never be stored in shared or Cloudflare edge caches,
          // where authorization would not be re-evaluated on later requests.
          'Cache-Control': 'private, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching checks:', error);
    return NextResponse.json({ error: 'Error fetching check history' }, { status: 500 });
  }
}
