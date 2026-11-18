// src/app/api/auth/login/route.ts
// Issues a signed HttpOnly session cookie after verifying the admin password.
// This route is exempt from the Worker admin gate (it IS the gate's entry point).

import { NextRequest, NextResponse } from 'next/server.js';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifyAdminPassword,
} from '../../../../server/auth/admin-auth.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { password?: unknown } | null;

    if (typeof body?.password !== 'string' || !(await verifyAdminPassword(body.password))) {
      // Generic error: never disclose whether the failure comes from a wrong
      // password or from missing configuration.
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createSessionToken();
    if (!token) {
      // Fail closed when ADMIN_PASSWORD is not configured: no session is issued.
      return NextResponse.json(
        { success: false, error: 'Authentication is not configured' },
        { status: 503 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true, // Not readable from JavaScript: mitigates token theft via XSS
      secure: true, // Only transmitted over HTTPS
      sameSite: 'strict', // CSRF mitigation for cookie-based sessions
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
