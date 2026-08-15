import { NextResponse } from 'next/server';
import { getCheckList } from '../../../server/service/checker-history-service';

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

    return NextResponse.json({ success: true, checks: formattedData });
  } catch (error) {
    console.error('Error fetching checks:', error);
    return NextResponse.json({ error: 'Error fetching check history' }, { status: 500 });
  }
}
