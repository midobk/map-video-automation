import { hasDatabaseConfig } from '@mapvideo/db';
import { readServerEnvironment } from '../../../../lib/environment.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env = readServerEnvironment();
  return Response.json({
    hasDatabaseConfig: hasDatabaseConfig(),
    urlPresent: Boolean(env.SUPABASE_URL),
    keyPresent: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    urlPrefix: env.SUPABASE_URL?.slice(0, 20),
  });
}
