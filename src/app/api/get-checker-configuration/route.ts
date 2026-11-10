import { NextRequest, NextResponse } from 'next/server.js';
import { getConfigurations } from '../../../server/service/checker-configuration-service.ts';
import { maskEmail } from '../../../server/utils/mail-utils.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (req?.signal?.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    const isActiveOnly = req.nextUrl.searchParams.get('isActiveOnly') === 'true';
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
          mail_alert_address: maskEmail(config.mail_alert_address),
          mail_alert_contact: config.mail_alert_contact,
        })),
      },
      {
        headers: {
          // Cache on Cloudflare edge for 60 seconds to avoid repeating DB queries on dashboard views
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
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
