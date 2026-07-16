'use client';

import { useState } from 'react';
import { generatePreview } from '../../lib/actions/content';
import type { PreviewRevision } from '../../lib/actions/content';
import type { ContentItem } from '@mapvideo/db';

interface PreviewPanelProps {
  itemId: string;
  status: ContentItem['status'];
  revisions: PreviewRevision[];
}

export function PreviewPanel({ itemId, status, revisions }: PreviewPanelProps) {
  const [currentRevisions, setCurrentRevisions] = useState(revisions);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const latest = currentRevisions.at(-1);

  async function handleGenerate() {
    setPending(true);
    setMessage(null);
    const result = await generatePreview(itemId);
    setPending(false);

    if (!result.success) {
      setMessage(result.error);
      return;
    }

    setCurrentRevisions((prev) =>
      prev.some((r) => r.id === result.revision.id)
        ? prev.map((r) => (r.id === result.revision.id ? result.revision : r))
        : [...prev, result.revision],
    );
    setMessage(result.message);
  }

  return (
    <div className="dashboard-preview">
      {message && <div className="dashboard-message">{message}</div>}

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

      <div className="dashboard-button-row" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="dashboard-button"
          disabled={pending || status === 'RENDERING'}
          onClick={handleGenerate}
        >
          {pending || status === 'RENDERING' ? 'Generating…' : 'Generate preview'}
        </button>
      </div>
    </div>
  );
}
