import { NextRequest, NextResponse } from 'next/server';
import { updateConfiguration } from '../../../server/service/checker-configuration-service';
import { maskEmail } from '../../../server/utils/mail-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id?: number;
      is_active?: boolean;
      targetDate?: string;
      targetLabel?: string;
      is_mail_alert?: boolean;
      mail_alert_address?: string;
      mail_alert_contact?: string;
    };
    const { id, ...updatedFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Configuration ID is required' }, { status: 400 });
    }

    const dbFields: Record<string, unknown> = {};
    if ('is_active' in updatedFields) dbFields.is_active = updatedFields.is_active;
    if ('targetDate' in updatedFields) dbFields.target_date = updatedFields.targetDate;
    if ('targetLabel' in updatedFields) dbFields.target_label = updatedFields.targetLabel;
    if ('is_mail_alert' in updatedFields) dbFields.is_mail_alert = updatedFields.is_mail_alert;
    if ('mail_alert_address' in updatedFields) dbFields.mail_alert_address = updatedFields.mail_alert_address;
    if ('mail_alert_contact' in updatedFields) dbFields.mail_alert_contact = updatedFields.mail_alert_contact;

    const updatedConfig = await updateConfiguration(id, dbFields);

    return NextResponse.json({
      success: true,
      configuration: {
        id: updatedConfig.id,
        is_active: updatedConfig.is_active,
        targetDate: updatedConfig.target_date,
        targetLabel: updatedConfig.target_label,
        is_mail_alert: !!updatedConfig.is_mail_alert,
        mail_alert_address: maskEmail(updatedConfig.mail_alert_address),
        mail_alert_contact: updatedConfig.mail_alert_contact,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration', message: (error as Error).message },
      { status: 500 }
    );
  }
}
