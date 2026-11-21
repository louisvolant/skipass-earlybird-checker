import { NextRequest, NextResponse } from 'next/server.js';
import { updateConfiguration } from '../../../server/service/checker-configuration-service.ts';
import {
  formatConfigurationResponse,
  validateAndMapConfigurationFields,
  type ConfigurationRequestPayload,
} from '../../../server/utils/configuration-payload.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConfigurationRequestPayload;
    const { id, ...updatedFields } = body;

    if (!id || typeof id !== 'number') {
      return NextResponse.json({ success: false, error: 'Configuration ID is required' }, { status: 400 });
    }

    const { error, dbFields } = validateAndMapConfigurationFields(updatedFields, {
      requireRequiredFields: false,
    });
    if (error || !dbFields) {
      return NextResponse.json({ success: false, error: error || 'Invalid payload' }, { status: 400 });
    }

    const updatedConfig = await updateConfiguration(id, dbFields);

    return NextResponse.json({
      success: true,
      configuration: formatConfigurationResponse(updatedConfig, true),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration', message: (error as Error).message },
      { status: 500 }
    );
  }
}
