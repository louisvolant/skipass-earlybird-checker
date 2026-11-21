import { NextRequest, NextResponse } from 'next/server.js';
import { deleteConfiguration } from '../../../server/service/checker-configuration-service.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { id?: unknown };
    const id = body.id;

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: 'Valid configuration ID is required' }, { status: 400 });
    }

    const deleted = await deleteConfiguration(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Configuration deleted successfully', id });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete configuration', message: (error as Error).message },
      { status: 500 }
    );
  }
}
