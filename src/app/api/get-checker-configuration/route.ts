import { NextRequest, NextResponse } from 'next/server';
import { getConfigurations } from '../../../server/service/checker-configuration-service';
import { maskEmail } from '../../../server/utils/mail-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isActiveOnly = req.nextUrl.searchParams.get('isActiveOnly') === 'true';
    const configurations = await getConfigurations(isActiveOnly);

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch checker configurations' },
      { status: 500 }
    );
  }
}
