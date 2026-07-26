'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { markStoryboardReviewed } from '../../lib/actions/content';
import type { MapVideoPlan } from '@mapvideo/pipeline';

interface StoryboardPanelProps {
  itemId: string;
  revisionId: string;
  videoPlan: MapVideoPlan | null;
  videoPlanRaw: Record<string, unknown> | null;
  storyboardReview: { createdAt: string; sceneCount: number; planSummary: string } | null;
}

type ReviewState = StoryboardPanelProps['storyboardReview'];

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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function StoryboardPanel({
  itemId,
  revisionId,
  videoPlan,
  videoPlanRaw,
  storyboardReview,
}: StoryboardPanelProps) {
  const router = useRouter();
  const [review, setReview] = useState<ReviewState>(storyboardReview);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null,
  );

  const hasData = videoPlan !== null;
  const hasRaw = videoPlanRaw !== null;
  const isMalformed = hasRaw && !hasData;
  const canReview = hasData && review === null;

  async function handleMarkReviewed() {
    setPending(true);
    setMessage(null);
    // Pass `revisionId` so the action can detect a revision change between
    // page load and click. The panel only renders with a stable revision id
    // (it is read from the loaded detail), so this is the natural snapshot.
    const result = await markStoryboardReviewed(itemId, revisionId);
    setPending(false);
    if (!result.success) {
      setMessage({ text: result.error, tone: 'error' });
      return;
    }
    setReview({
      createdAt: result.review.createdAt,
      sceneCount: result.review.sceneCount,
      planSummary: result.review.planSummary,
    });
    setMessage({ text: 'Storyboard marked as reviewed.', tone: 'success' });
    router.refresh();
  }

  return (
    <div className="dashboard-panel" data-revision-id={revisionId}>
      <div className="dashboard-storyboard-header">
        <h3>Storyboard</h3>
        {hasData && (
          <span className="dashboard-risk-pill dashboard-risk-pill-none">
            {videoPlan.scenes.length} scenes
          </span>
        )}
        {!hasData && (
          <span className="dashboard-risk-pill dashboard-risk-pill-none">No storyboard</span>
        )}
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
            Storyboard data is malformed; cannot review or approve. Re-run Generate preview to
            regenerate.
          </p>
          <pre className="dashboard-malformed-pre">
            {JSON.stringify(videoPlanRaw, null, 2)}
          </pre>
        </div>
      )}

      {!hasData && !hasRaw && (
        <p className="dashboard-storyboard-empty">No storyboard on this revision.</p>
      )}

      {hasData && (
        <ol className="dashboard-scene-list">
          {videoPlan.scenes.map((scene, index) => (
            <li
              key={`${index}-${scene.id}`}
              className="dashboard-scene-row"
              data-scene-kind={scene.kind}
            >
              <div className="dashboard-scene-header">
                <span className="dashboard-scene-index">{index + 1}.</span>
                <span className="dashboard-scene-id">{scene.id}</span>
                <span className="dashboard-scene-kind-pill">{scene.kind}</span>
                <span className="dashboard-scene-duration">
                  {scene.durationSeconds.toFixed(1)}s
                </span>
              </div>
              {scene.caption && (
                <p className="dashboard-scene-caption">{truncate(scene.caption, 160)}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      {review !== null ? (
        <p className="dashboard-storyboard-confirmation">
          Storyboard reviewed {formatReviewTimestamp(review.createdAt)} ({review.sceneCount}{' '}
          scenes). Summary: {review.planSummary}
        </p>
      ) : (
        <div className="dashboard-button-row">
          <button
            type="button"
            className="dashboard-button"
            disabled={pending || !canReview}
            onClick={handleMarkReviewed}
          >
            {pending ? 'Marking…' : 'Mark storyboard reviewed'}
          </button>
        </div>
      )}
    </div>
  );
}
