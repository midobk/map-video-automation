import { createClient } from '@supabase/supabase-js';
import { readServerEnvironment } from '@mapvideo/shared';
import type { Database } from './database';

/**
 * Server-only Supabase client factory.
 *
 * Credentials are read from the validated server environment. This function must
 * never be called from client components or returned to the browser.
 */
export function createServerClient() {
  const environment = readServerEnvironment();
  const url = environment.SUPABASE_URL;
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase server client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
        'Run supabase start and copy the values into your environment.',
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Convenience predicate for detecting whether the server environment is
 * configured to talk to Supabase. Tests and local dev can skip DB-dependent
 * code paths when this returns false.
 */
export function hasDatabaseConfig(): boolean {
  const environment = readServerEnvironment();
  return Boolean(environment.SUPABASE_URL && environment.SUPABASE_SERVICE_ROLE_KEY);
}
