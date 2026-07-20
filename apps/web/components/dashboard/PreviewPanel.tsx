'use client';

import { useState } from 'react';
import { generatePreview } from '../../lib/actions/content';
import type { PreviewRevision } from '../../lib/actions/content';
import type { ContentItem } from '@mapvideo/db';
import {
  DEFAULT_DURATION_SECONDS,
  isDurationValid,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from '../../lib/duration';

interface PreviewPanelProps {
  itemId: string;
  status: ContentItem['status'];
  revisions: PreviewRevision[];
}

// Workflow statuses where regenerating a preview is not allowed. These are
// either terminal decisions (APPROVED / REJECTED) or states where the item
// is already past the rendering phase and we'd be invalidating downstream
// workflow state by creating a new revision.
const TERMINAL_STATUSES: ReadonlyArray<ContentItem['status']> = [
  'APPROVED',
  'REJECTED',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'PUBLISH_FAILED',
];

// Mirrors the zod schema in `createContentSchema` so client-side validation
// matches the server-side action. The constants themselves live in
// `lib/duration` so the MVP `/make` page shares them.
function isTerminalStatus(status: ContentItem['status']): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function PreviewPanel({ itemId, status, revisions }: PreviewPanelProps) {
  const [currentRevisions, setCurrentRevisions] = useState(revisions);
  const [pending, setPending] = useState(false);
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_SECONDS);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null,
  );

  const latest = currentRevisions.at(-1);
  const terminal = isTerminalStatus(status);
  const inProgress = status === 'RENDERING';
  const nextRevisionNumber = (currentRevisions.at(-1)?.revision_number ?? 0) + 1;
  const durationInvalid = !isDurationValid(duration);

  const buttonLabel = pending
    ? 'Generating…'
    : inProgress
      ? 'Rendering…'
      : currentRevisions.length > 0
        ? `Regenerate (revision ${nextRevisionNumber})`
        : 'Generate preview';

  async function handleGenerate() {
    if (terminal || inProgress || durationInvalid) return;
    setPending(true);
    setMessage(null);
    const result = await generatePreview(itemId, {
      targetDurationSeconds: duration,
    });
    setPending(false);

    if (!result.success) {
      setMessage({ text: result.error, tone: 'error' });
      return;
    }

    setCurrentRevisions((prev) =>
      prev.some((r) => r.id === result.revision.id)
        ? prev.map((r) => (r.id === result.revision.id ? result.revision : r))
        : [...prev, result.revision],
    );
    setMessage({ text: result.message, tone: 'success' });
  }

  const buttonDisabled = pending || inProgress || terminal || durationInvalid;

  return (
    <div className="dashboard-preview-block">
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

      <div className="dashboard-preview">
        {latest?.render_url ? (
          <video
            src={latest.render_url}
            controls
            preload="metadata"
            style={{ width: '100%', maxHeight: 480, borderRadius: 8 }}
          />
        ) : latest?.video_plan ? (
          <div className="dashboard-preview-placeholder">
            <p>
              <strong>Revision {latest.revision_number}</strong> generated.
            </p>
            {!latest.render_url && (
              <p className="dashboard-hint">
                The rendered MP4 is not available in this environment. Run locally
                with RENDER_MODE=local to produce a downloadable preview.
              </p>
            )}
          </div>
        ) : (
          <div className="dashboard-preview-placeholder">
            <p>Rendered preview will appear here once research and rendering run.</p>
            <p className="dashboard-hint">
              For now, use the Remotion Studio to inspect the neutral fixture.
            </p>
          </div>
        )}
      </div>

      <div className="dashboard-button-row" style={{ marginTop: 16, gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          className="dashboard-button"
          disabled={buttonDisabled}
          onClick={handleGenerate}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </button>
        <label className="dashboard-duration-field">
          <span>Duration</span>
          <input
            type="number"
            min={MIN_DURATION_SECONDS}
            max={MAX_DURATION_SECONDS}
            step={1}
            value={duration}
            disabled={pending || inProgress || terminal}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setDuration(Number.isNaN(next) ? DEFAULT_DURATION_SECONDS : next);
            }}
            aria-invalid={durationInvalid}
            aria-label="Target duration in seconds"
            style={{ width: 64 }}
          />
          <span>s</span>
        </label>
      </div>
      {terminal && (
        <p className="dashboard-hint" role="note">
          Re-rendering is not available for {status.toLowerCase()} items. Create
          a new content item to start a fresh pipeline.
        </p>
      )}
      {!terminal && durationInvalid && (
        <p className="dashboard-hint dashboard-message-warning" role="alert">
          Duration must be an integer between {MIN_DURATION_SECONDS}s and {MAX_DURATION_SECONDS}s.
        </p>
      )}
      {!terminal && !durationInvalid && currentRevisions.length > 0 && !pending && !inProgress && (
        <p className="dashboard-hint">
          Will create revision {nextRevisionNumber} and reset the workflow to
          AWAITING_APPROVAL.
        </p>
      )}
    </div>
  );
}
