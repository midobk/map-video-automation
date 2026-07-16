/**
 * Server-safe banner shown when the dashboard cannot reach Supabase.
 *
 * This renders in Server Components and relies only on the error message passed
 * from server actions.
 */
export function DatabaseSetupBanner({ error }: { error: string }) {
  const isMissingConfig =
    error.includes('SUPABASE_URL') || error.includes('SUPABASE_SERVICE_ROLE_KEY');

  return (
    <div className="dashboard-setup-banner" role="alert">
      <h2>Database not connected</h2>
      <p>
        {isMissingConfig
          ? 'The dashboard needs Supabase credentials to save and list content.'
          : error}
      </p>
      {isMissingConfig && (
        <>
          <h3>Local development</h3>
          <ol>
            <li>
              Run <code>supabase start</code> (or <code>supabase status</code> if already running).
            </li>
            <li>
              Copy the <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
              values into a root <code>.env.local</code> file.
            </li>
            <li>Restart the Next.js dev server.</li>
          </ol>
          <h3>Vercel preview / production</h3>
          <ol>
            <li>
              In your Vercel project, go to <strong>Settings → Environment Variables</strong>.
            </li>
            <li>
              Add <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>. Make
              sure they are attached to the <strong>Preview</strong> environment.
            </li>
            <li>Ensure your Supabase project has the migrations applied.</li>
            <li>Redeploy the preview.</li>
          </ol>
        </>
      )}
    </div>
  );
}
