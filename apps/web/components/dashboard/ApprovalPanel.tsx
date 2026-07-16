'use client';

import { useState } from 'react';
import { recordApprovalDecision, updateContentStatus } from '../../lib/actions/content';
import type { ContentItem } from '@mapvideo/db';

interface ApprovalPanelProps {
  itemId: string;
  status: ContentItem['status'];
}

export function ApprovalPanel({ itemId, status }: ApprovalPanelProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDecision(decision: 'APPROVED' | 'REJECTED') {
    setPending(true);
    setMessage(null);
    const result = await recordApprovalDecision(itemId, decision);
    setPending(false);
    if (!result.success) {
      setMessage(result.error);
    } else {
      setMessage(`Marked as ${decision.toLowerCase()}.`);
    }
  }

  async function moveToAwaiting() {
    setPending(true);
    setMessage(null);
    const result = await updateContentStatus(itemId, 'AWAITING_APPROVAL');
    setPending(false);
    if (!result.success) {
      setMessage(result.error);
    } else {
      setMessage('Moved to awaiting approval.');
    }
  }

  if (status === 'AWAITING_APPROVAL') {
    return (
      <div className="dashboard-panel">
        <h3>Approval</h3>
        {message && <div className="dashboard-message">{message}</div>}
        <div className="dashboard-button-row">
          <button
            type="button"
            className="dashboard-button dashboard-button-success"
            disabled={pending}
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
      {message && <div className="dashboard-message">{message}</div>}
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
