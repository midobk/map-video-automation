'use client';

import { useState } from 'react';
import { recordApprovalDecision, updateContentStatus } from '../../lib/actions/content';
import type { ContentItem } from '@mapvideo/db';

type MessageTone = 'success' | 'error' | 'warning';
interface MessageState {
  text: string;
  tone: MessageTone;
}

interface ApprovalPanelProps {
  itemId: string;
  status: ContentItem['status'];
  /** Parsed fact pack is present for the current revision. */
  hasValidResearch?: boolean;
  /** A `revision.research_reviewed` audit event exists for the current revision. */
  isResearchReviewed?: boolean;
  /** Parsed video plan is present for the current revision. */
  hasValidStoryboard?: boolean;
  /** A `revision.storyboard_reviewed` audit event exists for the current revision. */
  isStoryboardReviewed?: boolean;
  /** The item has a `current_revision_id` that resolves to a real revision row. */
  hasCurrentRevision?: boolean;
}

function messageClass(tone: MessageTone): string {
  if (tone === 'error') return 'dashboard-message dashboard-message-error';
  if (tone === 'warning') return 'dashboard-message dashboard-message-warning';
  return 'dashboard-message';
}

export function ApprovalPanel({
  itemId,
  status,
  hasValidResearch,
  isResearchReviewed,
  hasValidStoryboard,
  isStoryboardReviewed,
  hasCurrentRevision,
}: ApprovalPanelProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  async function handleDecision(decision: 'APPROVED' | 'REJECTED') {
    setPending(true);
    setMessage(null);
    const result = await recordApprovalDecision(itemId, decision);
    setPending(false);
    if (!result.success) {
      setMessage({ text: result.error, tone: 'error' });
    } else {
      setMessage({ text: `Marked as ${decision.toLowerCase()}.`, tone: 'success' });
    }
  }

  async function moveToAwaiting() {
    setPending(true);
    setMessage(null);
    const result = await updateContentStatus(itemId, 'AWAITING_APPROVAL');
    setPending(false);
    if (!result.success) {
      setMessage({ text: result.error, tone: 'error' });
    } else {
      setMessage({ text: 'Moved to awaiting approval.', tone: 'success' });
    }
  }

  if (status === 'AWAITING_APPROVAL') {
    if (hasCurrentRevision === false) {
      return (
        <div className="dashboard-panel">
          <h3>Approval</h3>
          <p>No current revision.</p>
        </div>
      );
    }

    const researchInvalid = hasValidResearch === false;
    const researchNotReviewed =
      hasValidResearch === true && isResearchReviewed === false;
    const storyboardInvalid = hasValidStoryboard === false;
    const storyboardNotReviewed =
      hasValidStoryboard === true && isStoryboardReviewed === false;

    // Approve is gated on (a) having a valid fact pack + a matching research
    // review AND (b) having a valid video plan + a matching storyboard review.
    // Reject is intentionally always available — if either artifact is
    // invalid or missing, the right action is usually to reject, not to be
    // locked out. The server-side gate in `recordApprovalDecision` is the
    // source of truth.
    let reviewWarning: string | null = null;
    if (researchInvalid || storyboardInvalid) {
      reviewWarning =
        'Research or storyboard data is invalid or missing; approval is disabled. Reject is still available, or re-run Generate preview.';
    } else if (researchNotReviewed && storyboardNotReviewed) {
      reviewWarning = 'Research and storyboard reviews required before approval.';
    } else if (researchNotReviewed) {
      reviewWarning = 'Research review required before approval.';
    } else if (storyboardNotReviewed) {
      reviewWarning = 'Storyboard review required before approval.';
    }
    const approveDisabled =
      pending || researchInvalid || researchNotReviewed || storyboardInvalid || storyboardNotReviewed;

    return (
      <div className="dashboard-panel">
        <h3>Approval</h3>
        {message && <div className={messageClass(message.tone)}>{message.text}</div>}
        {reviewWarning && (
          <div className={messageClass('warning')}>{reviewWarning}</div>
        )}
        <div className="dashboard-button-row">
          <button
            type="button"
            className="dashboard-button dashboard-button-success"
            disabled={approveDisabled}
            onClick={() => handleDecision('APPROVED')}
          >
            Approve
          </button>
          <button
            type="button"
            className="dashboard-button dashboard-button-danger"
            disabled={pending}
            onClick={() => handleDecision('REJECTED')}
          >
            Reject
          </button>
        </div>
        <p className="dashboard-hint">
          Approval is recorded locally. Publishing is disabled while the kill
          switch is enabled.
        </p>
      </div>
    );
  }

  if (status === 'APPROVED' || status === 'REJECTED') {
    return (
      <div className="dashboard-panel">
        <h3>Decision</h3>
        <p>
          This item is <strong>{status.toLowerCase()}</strong>. No further
          approval action is needed for this revision.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-panel">
      <h3>Approval</h3>
      {message && <div className={messageClass(message.tone)}>{message.text}</div>}
      <p>Current status: <strong>{status}</strong>.</p>
      <button
        type="button"
        className="dashboard-button"
        disabled={pending}
        onClick={moveToAwaiting}
      >
        Move to awaiting approval
      </button>
    </div>
  );
}
