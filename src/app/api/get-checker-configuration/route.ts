import { NextRequest, NextResponse } from 'next/server.js';
import { getConfigurations } from '../../../server/service/checker-configuration-service.ts';
import { isAuthorizedApiRequest } from '../../../server/auth/admin-auth.ts';
import { maskContact, maskEmail } from '../../../server/utils/mail-utils.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (req?.signal?.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    const isActiveOnly = req.nextUrl.searchParams.get('isActiveOnly') === 'true';
    const isAdmin = await isAuthorizedApiRequest(req);
    const configurations = await getConfigurations(isActiveOnly);

    return NextResponse.json(
      {
        success: true,
        configurations: configurations.map((config) => ({
          id: config.id,
          is_active: config.is_active,
          targetDate: config.target_date,
          targetLabel: config.target_label,
          is_mail_alert: !!config.is_mail_alert,
          // Mask customer PII for public dashboard reads; return full details to authenticated admins.
          mail_alert_address: isAdmin
            ? config.mail_alert_address || ''
            : maskEmail(config.mail_alert_address),
          mail_alert_contact: isAdmin
            ? config.mail_alert_contact || ''
            : maskContact(config.mail_alert_contact),
        })),
      },
      {
        headers: {
          // Never cache unmasked admin responses; keep public masked responses
          // strictly in private browser caches.
          'Cache-Control': isAdmin ? 'no-store' : 'private, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch checker configurations' },
      { status: 500 }
    );
  }
}
