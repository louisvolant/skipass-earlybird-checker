import { NextRequest, NextResponse } from 'next/server.js';
import { createConfiguration } from '../../../server/service/checker-configuration-service.ts';
import {
  formatConfigurationResponse,
  validateAndMapConfigurationFields,
  type ConfigurationRequestPayload,
} from '../../../server/utils/configuration-payload.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConfigurationRequestPayload;
    const { error, dbFields } = validateAndMapConfigurationFields(body, {
      requireRequiredFields: true,
    });

    if (error || !dbFields) {
      return NextResponse.json({ success: false, error: error || 'Invalid payload' }, { status: 400 });
    }

    const createdConfig = await createConfiguration({
      is_active: (dbFields.is_active as boolean | undefined) ?? true,
      target_date: dbFields.target_date as string,
      target_label: dbFields.target_label as string,
      target_url: (dbFields.target_url as string | null | undefined) ?? null,
      is_mail_alert: (dbFields.is_mail_alert as boolean | undefined) ?? false,
      mail_alert_address: (dbFields.mail_alert_address as string | null | undefined) ?? null,
      mail_alert_contact: (dbFields.mail_alert_contact as string | null | undefined) ?? null,
    });

    return NextResponse.json(
      {
        success: true,
        configuration: formatConfigurationResponse(createdConfig, true),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create configuration', message: (error as Error).message },
      { status: 500 }
    );
  }
}
