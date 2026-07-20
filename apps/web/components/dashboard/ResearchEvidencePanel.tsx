'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { markResearchReviewed } from '../../lib/actions/content';
import type { FactPack } from '@mapvideo/pipeline';

interface ResearchEvidencePanelProps {
  itemId: string;
  revisionId: string;
  factPack: FactPack | null;
  factPackRaw: Record<string, unknown> | null;
  researchReview: { createdAt: string; claimCount: number; urlCount: number } | null;
}

type ReviewState = ResearchEvidencePanelProps['researchReview'];

function formatReviewTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const locale =
    typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().locale
      : 'en-US';
  return new Intl.DateTimeFormat(locale || 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ResearchEvidencePanel({
  itemId,
  revisionId,
  factPack,
  factPackRaw,
  researchReview,
}: ResearchEvidencePanelProps) {
  const router = useRouter();
  const [review, setReview] = useState<ReviewState>(researchReview);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null,
  );

  const hasData = factPack !== null;
  const hasRaw = factPackRaw !== null;
  const isMalformed = hasRaw && !hasData;
  const canReview = hasData && review === null;

  async function handleMarkReviewed() {
    setPending(true);
    setMessage(null);
    // Pass `revisionId` so the action can detect a revision change between
    // page load and click. The panel only renders with a stable revision id
    // (it is read from the loaded detail), so this is the natural snapshot.
    const result = await markResearchReviewed(itemId, revisionId);
    setPending(false);
    if (!result.success) {
      setMessage({ text: result.error, tone: 'error' });
      return;
    }
    setReview({
      createdAt: result.review.createdAt,
      claimCount: result.review.claimCount,
      urlCount: result.review.urlCount,
    });
    setMessage({ text: 'Research marked as reviewed.', tone: 'success' });
    router.refresh();
  }

  return (
    <div className="dashboard-panel" data-revision-id={revisionId}>
      <div className="dashboard-research-header">
        <h3>Research</h3>
        {hasData && (
          <span
            className={`dashboard-risk-pill dashboard-risk-pill-${factPack.risk.toLowerCase()}`}
          >
            {factPack.risk}
          </span>
        )}
        {!hasData && <span className="dashboard-risk-pill dashboard-risk-pill-none">No risk</span>}
      </div>

      {message && (
        <div
          className={
            message.tone === 'error'
              ? 'dashboard-message dashboard-message-error'
              : 'dashboard-message'
          }
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      {isMalformed && (
        <div className="dashboard-message dashboard-message-error" role="alert">
          <p>
            Research data is malformed; cannot review or approve. Re-run Generate preview to
            regenerate.
          </p>
          <pre className="dashboard-malformed-pre">
            {JSON.stringify(factPackRaw, null, 2)}
          </pre>
        </div>
      )}

      {!hasData && !hasRaw && (
        <p className="dashboard-research-empty">No research data on this revision.</p>
      )}

      {hasData && (
        <>
          <p className="dashboard-research-summary">{factPack.summary}</p>
          <ol className="dashboard-claim-list">
            {factPack.claims.map((claim, index) => {
              const sourceUrl = claim.source.url;
              return (
                <li key={`${index}-${claim.text}`} className="dashboard-claim-row">
                  <div className="dashboard-claim-text">
                    <span className="dashboard-claim-number">{index + 1}.</span> {claim.text}
                  </div>
                  <div className="dashboard-claim-source">
                    {sourceUrl ? (
                      <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                        Source: {claim.source.name}
                      </a>
                    ) : (
                      <span className="dashboard-claim-source-muted">
                        Source: {claim.source.name} · URL not provided
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {review !== null ? (
        <p className="dashboard-research-confirmation">
          Research reviewed {formatReviewTimestamp(review.createdAt)} ({review.claimCount} claims,{' '}
          {review.urlCount} with URLs).
        </p>
      ) : (
        <div className="dashboard-button-row">
          <button
            type="button"
            className="dashboard-button"
            disabled={pending || !canReview}
            onClick={handleMarkReviewed}
          >
            {pending ? 'Marking…' : 'Mark research reviewed'}
          </button>
        </div>
      )}
    </div>
  );
}
