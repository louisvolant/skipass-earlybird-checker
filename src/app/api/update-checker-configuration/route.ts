import { NextRequest, NextResponse } from 'next/server.js';
import { updateConfiguration } from '../../../server/service/checker-configuration-service.ts';
import { maskEmail } from '../../../server/utils/mail-utils.ts';
import { isValidEmail, isValidTargetDate, isValidTargetLabel } from '../../../server/utils/validation.ts';

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

    // Validate every provided field before it reaches the database or the
    // mailer: unvalidated values could be used for email header/body injection
    // or to redirect customer alerts to an arbitrary address.
    if ('is_active' in updatedFields && typeof updatedFields.is_active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid is_active: boolean expected' }, { status: 400 });
    }
    if ('is_mail_alert' in updatedFields && typeof updatedFields.is_mail_alert !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid is_mail_alert: boolean expected' }, { status: 400 });
    }
    if ('targetDate' in updatedFields && !isValidTargetDate(updatedFields.targetDate)) {
      return NextResponse.json({ success: false, error: 'Invalid targetDate: YYYY-MM-DD expected' }, { status: 400 });
    }
    if ('targetLabel' in updatedFields && !isValidTargetLabel(updatedFields.targetLabel)) {
      return NextResponse.json(
        { success: false, error: `Invalid targetLabel: non-empty text of 100 characters max expected` },
        { status: 400 }
      );
    }
    if ('mail_alert_contact' in updatedFields && !isValidTargetLabel(updatedFields.mail_alert_contact)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mail_alert_contact: non-empty text of 100 characters max expected' },
        { status: 400 }
      );
    }
    if ('mail_alert_address' in updatedFields) {
      const address = updatedFields.mail_alert_address;
      // An empty address clears the alert recipient; any other value must be a
      // well-formed email address so alerts cannot be silently redirected.
      if (address !== '' && !isValidEmail(address)) {
        return NextResponse.json(
          { success: false, error: 'Invalid mail_alert_address: valid email address expected' },
          { status: 400 }
        );
      }
    }

    const dbFields: Record<string, unknown> = {};
    if ('is_active' in updatedFields) dbFields.is_active = updatedFields.is_active;
    if ('targetDate' in updatedFields) dbFields.target_date = updatedFields.targetDate;
    if ('targetLabel' in updatedFields) dbFields.target_label = updatedFields.targetLabel;
    if ('is_mail_alert' in updatedFields) dbFields.is_mail_alert = updatedFields.is_mail_alert;
    // Normalize an empty address to null so no alert email can be built
    // from a blank recipient.
    if ('mail_alert_address' in updatedFields) {
      dbFields.mail_alert_address = updatedFields.mail_alert_address || null;
    }
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
