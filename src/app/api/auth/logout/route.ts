// src/app/api/auth/logout/route.ts
// Clears the admin session cookie.

import { NextResponse } from 'next/server.js';
import { SESSION_COOKIE_NAME } from '../../../../server/auth/admin-auth.ts';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Expire immediately
    });
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
