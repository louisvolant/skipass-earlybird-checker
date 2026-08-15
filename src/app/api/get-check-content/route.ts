import { NextRequest, NextResponse } from 'next/server';
import { getCheckContent } from '../../../server/service/checker-history-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const check_id = req.nextUrl.searchParams.get('check_id');

    if (!check_id) {
      return NextResponse.json({ error: 'Missing check_id parameter' }, { status: 400 });
    }

    const data = await getCheckContent(Number(check_id));

    if (!data) {
      return NextResponse.json({ error: 'Content not found for the given check_id' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      content: {
        id: data.id,
        timestamp: data.created_at,
        httpCode: data.http_code,
        url: data.full_url,
        targetDate: data.target_date,
        targetLabel: data.target_label,
        price: data.price,
        contentData: data.response_text || null,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
