import Link from 'next/link';
import { loadDashboardContent } from '../../../lib/actions/content';
import { DatabaseSetupBanner } from '../../../components/dashboard/DatabaseSetupBanner';

export default async function ContentListPage() {
  const { items, error } = await loadDashboardContent();

  return (
    <>
      <div className="dashboard-header">
        <h1>Content</h1>
        <Link href="/dashboard/content/new" className="dashboard-button">New video</Link>
      </div>

      {error && <DatabaseSetupBanner error={error} />}

      {items.length === 0 ? (
        <section>
          <p>No content items yet.</p>
          <Link href="/dashboard/content/new">Create a video idea</Link>
        </section>
      ) : (
        <ul className="dashboard-list">
          {items.map((item) => (
            <li key={item.id}>
              <div className="dashboard-list-content">
                <Link href={`/dashboard/content/${item.id}`}>{item.title}</Link>
                <span className={`dashboard-status dashboard-status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </div>
              <div className="dashboard-list-meta">
                Risk: {item.risk} · Updated {new Date(item.updated_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
