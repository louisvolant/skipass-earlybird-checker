// src/app/api/auth/session/route.ts
// Lightweight session probe used by the dashboard to decide whether to render
// the login card or the protected content. Exposes no customer data.

import { NextRequest, NextResponse } from 'next/server.js';
import { SESSION_COOKIE_NAME, getCookieValue, verifySessionToken } from '../../../../server/auth/admin-auth.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = getCookieValue(req, SESSION_COOKIE_NAME);
    if (await verifySessionToken(token)) {
      return NextResponse.json({ authenticated: true });
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
