import Link from 'next/link';
import { loadDashboardContent } from '../../lib/actions/content';
import { DatabaseSetupBanner } from '../../components/dashboard/DatabaseSetupBanner';

export default async function DashboardPage() {
  const { items, error } = await loadDashboardContent();

  return (
    <>
      <h1>Dashboard</h1>
      <p className="lede">Create video ideas, review their status, and approve rendered drafts.</p>

      <p className="lede">
        <Link href="/make">Make a video fast</Link> — type a topic and get a
        narrated MP4 in one step.
      </p>

      {error && <DatabaseSetupBanner error={error} />}

      <section className="dashboard-cards">
        <div className="dashboard-card">
          <div className="dashboard-card-stat">{items.length}</div>
          <div className="dashboard-card-label">Total ideas</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-stat">
            {items.filter((i) => i.status === 'AWAITING_APPROVAL').length}
          </div>
          <div className="dashboard-card-label">Awaiting approval</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-stat">
            {items.filter((i) => i.status === 'APPROVED').length}
          </div>
          <div className="dashboard-card-label">Approved</div>
        </div>
      </section>

      <section>
        <h2>Recent content</h2>
        {items.length === 0 ? (
          <p>No content yet. <Link href="/dashboard/content/new">Create your first video idea</Link>.</p>
        ) : (
          <ul className="dashboard-list">
            {items.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link href={`/dashboard/content/${item.id}`}>{item.title}</Link>
                <span className={`dashboard-status dashboard-status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
