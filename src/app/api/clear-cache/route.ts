import { NextResponse } from 'next/server.js';
import { clearDbUsageCache } from '../../../server/service/db-usage-service.ts';

export const dynamic = 'force-dynamic';

export async function POST() {
  clearDbUsageCache();
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}
