import { NextRequest, NextResponse } from 'next/server';
import { deleteCheckContent } from '../../../server/service/checker-history-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { check_id?: number };
    const { check_id } = body;

    if (!check_id) {
      return NextResponse.json({ success: false, error: 'Missing check_id parameter' }, { status: 400 });
    }

    const deleted = await deleteCheckContent(check_id);

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Check not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Check deleted successfully', check_id });
  } catch (error) {
    console.error('Error deleting check:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
