import { notFound } from 'next/navigation';
import { loadContentDetail } from '../../../../lib/actions/content';
import { ApprovalPanel } from '../../../../components/dashboard/ApprovalPanel';
import { DatabaseSetupBanner } from '../../../../components/dashboard/DatabaseSetupBanner';
import { PreviewPanel } from '../../../../components/dashboard/PreviewPanel';
import { ResearchEvidencePanel } from '../../../../components/dashboard/ResearchEvidencePanel';
import { StoryboardPanel } from '../../../../components/dashboard/StoryboardPanel';

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

  const currentRevision = revisions?.find((r) => r.id === item.current_revision_id);
  // The loader returns the audit event's `created_at` as snake_case to match
  // the rest of the loader's row shape; both the ResearchEvidencePanel and
  // the StoryboardPanel components expect camelCase to match their
  // respective action's response shape. Map once at the seam.
  const researchReviewForPanel = currentRevision?.researchReview
    ? {
        createdAt: currentRevision.researchReview.created_at,
        claimCount: currentRevision.researchReview.claimCount,
        urlCount: currentRevision.researchReview.urlCount,
      }
    : null;
  const storyboardReviewForPanel = currentRevision?.storyboardReview
    ? {
        createdAt: currentRevision.storyboardReview.created_at,
        sceneCount: currentRevision.storyboardReview.sceneCount,
        planSummary: currentRevision.storyboardReview.planSummary,
      }
    : null;

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

          <h2>Research</h2>
          <ResearchEvidencePanel
            itemId={item.id}
            revisionId={currentRevision?.id ?? ''}
            factPack={currentRevision?.factPack ?? null}
            factPackRaw={currentRevision?.factPackRaw ?? null}
            researchReview={researchReviewForPanel}
          />

          <h2>Storyboard</h2>
          <StoryboardPanel
            itemId={item.id}
            revisionId={currentRevision?.id ?? ''}
            videoPlan={currentRevision?.videoPlan ?? null}
            videoPlanRaw={currentRevision?.videoPlanRaw ?? null}
            storyboardReview={storyboardReviewForPanel}
          />

          <h2>Preview</h2>
          <PreviewPanel itemId={item.id} status={item.status} revisions={revisions ?? []} />

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

          <ApprovalPanel
            itemId={item.id}
            status={item.status}
            hasValidResearch={Boolean(currentRevision?.factPack)}
            isResearchReviewed={Boolean(currentRevision?.researchReview)}
            hasValidStoryboard={Boolean(currentRevision?.videoPlan)}
            isStoryboardReviewed={Boolean(currentRevision?.storyboardReview)}
            hasCurrentRevision={Boolean(currentRevision)}
          />
        </aside>
      </section>
    </>
  );
}
