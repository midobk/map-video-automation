import { notFound } from 'next/navigation';
import { loadContentDetail } from '../../../../lib/actions/content';
import { ApprovalPanel } from '../../../../components/dashboard/ApprovalPanel';
import { DatabaseSetupBanner } from '../../../../components/dashboard/DatabaseSetupBanner';

interface ContentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { id } = await params;
  const { item, revisions, error } = await loadContentDetail(id);

  if (error) {
    return (
      <>
        <h1>Content detail</h1>
        <DatabaseSetupBanner error={error} />
      </>
    );
  }

  if (!item) {
    notFound();
  }

  return (
    <>
      <div className="dashboard-header">
        <h1>{item.title}</h1>
        <span className={`dashboard-status dashboard-status-${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      </div>

      <section className="dashboard-detail-grid">
        <div className="dashboard-detail-main">
          <h2>Topic</h2>
          <p className="dashboard-topic">{item.topic_prompt}</p>

          <h2>Preview</h2>
          <div className="dashboard-preview">
            <div className="dashboard-preview-placeholder">
              <p>Rendered preview will appear here once research and rendering run.</p>
              <p className="dashboard-hint">
                For now, use the Remotion Studio to inspect the neutral fixture.
              </p>
            </div>
          </div>

          <h2>Revisions</h2>
          {revisions && revisions.length > 0 ? (
            <ul className="dashboard-list">
              {revisions.map((r) => (
                <li key={r.revision_number}>
                  Revision {r.revision_number} · {r.language} ·{' '}
                  {new Date(r.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No revisions yet.</p>
          )}
        </div>

        <aside className="dashboard-detail-sidebar">
          <div className="dashboard-panel">
            <h3>Status</h3>
            <dl className="dashboard-dl">
              <div>
                <dt>Risk</dt>
                <dd>{item.risk}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(item.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{new Date(item.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <ApprovalPanel itemId={item.id} status={item.status} />
        </aside>
      </section>
    </>
  );
}
