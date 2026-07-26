/**
 * Component-level tests for ApprovalPanel.
 *
 * The action layer (recordApprovalDecision) is already covered by
 * test/research-review-actions.test.ts; these tests focus on what the
 * component renders, what buttons show up, and which actions get called
 * with which args. The four-state gating logic (Approve enabled only
 * when research is valid AND reviewed; Reject always enabled; the two
 * terminal states APPROVED / REJECTED) lives entirely in this component
 * and a refactor of any of those branches should be caught here.
 */

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the action module BEFORE importing the component so the component
// picks up the mocked implementation when it destructures the export.
vi.mock('../lib/actions/content', () => ({
  recordApprovalDecision: vi.fn(),
  updateContentStatus: vi.fn(),
}));

import { recordApprovalDecision, updateContentStatus } from '../lib/actions/content';
import { ApprovalPanel } from '../components/dashboard/ApprovalPanel';

const recordApprovalDecisionMock = vi.mocked(recordApprovalDecision);
const updateContentStatusMock = vi.mocked(updateContentStatus);

const baseProps = { itemId: 'item-1' };

beforeEach(() => {
  recordApprovalDecisionMock.mockReset();
  updateContentStatusMock.mockReset();
  // Default mock: a successful decision. Tests that click Approve/Reject
  // configure the return value explicitly when they care.
  recordApprovalDecisionMock.mockResolvedValue({ success: true });
  updateContentStatusMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
});

// 1. AWAITING_APPROVAL + valid + reviewed — Approve enabled, click invokes
//    recordApprovalDecision('APPROVED')
// -----------------------------------------------------------
describe('ApprovalPanel - AWAITING_APPROVAL + valid + reviewed', () => {
  it('enables Approve and clicks invoke recordApprovalDecision with APPROVED', async () => {
    const user = userEvent.setup();
    render(
      <ApprovalPanel
        {...baseProps}
        status="AWAITING_APPROVAL"
        hasValidResearch={true}
        isResearchReviewed={true}
        hasCurrentRevision={true}
      />,
    );

    const approveButton = screen.getByRole('button', { name: /^Approve$/ });
    const rejectButton = screen.getByRole('button', { name: /^Reject$/ });

    // Both buttons are enabled.
    expect(approveButton).not.toBeDisabled();
    expect(rejectButton).not.toBeDisabled();

    // No warnings.
    expect(
      screen.queryByText(/Research review required before approval/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Research data is invalid or missing/),
    ).not.toBeInTheDocument();

    // Click Approve.
    await user.click(approveButton);

    expect(recordApprovalDecisionMock).toHaveBeenCalledTimes(1);
    expect(recordApprovalDecisionMock).toHaveBeenCalledWith('item-1', 'APPROVED');
    // Reject must NOT have been called.
    expect(recordApprovalDecisionMock).not.toHaveBeenCalledWith('item-1', 'REJECTED');

    // After the awaited action resolves, the success message shows.
    await waitFor(() => {
      expect(screen.getByText(/Marked as approved/)).toBeInTheDocument();
    });
  });
});

// 2. AWAITING_APPROVAL + valid + not reviewed — Approve disabled, Reject
//    enabled, warning "Research review required before approval."
// -----------------------------------------------------------
describe('ApprovalPanel - AWAITING_APPROVAL + valid + not reviewed', () => {
  it('disables Approve, keeps Reject enabled, and shows the research-review warning', async () => {
    const user = userEvent.setup();
    render(
      <ApprovalPanel
        {...baseProps}
        status="AWAITING_APPROVAL"
        hasValidResearch={true}
        isResearchReviewed={false}
        hasCurrentRevision={true}
      />,
    );

    const approveButton = screen.getByRole('button', { name: /^Approve$/ });
    const rejectButton = screen.getByRole('button', { name: /^Reject$/ });

    // Approve is disabled (gate: hasValidResearch=true but isResearchReviewed=false).
    expect(approveButton).toBeDisabled();
    // Reject is always available — even before research is reviewed.
    expect(rejectButton).not.toBeDisabled();

    // The "research review required" warning is shown.
    expect(
      screen.getByText(/Research review required before approval\./),
    ).toBeInTheDocument();

    // The "invalid or missing" warning must NOT be shown — the research
    // is valid; it's just not reviewed.
    expect(
      screen.queryByText(/Research data is invalid or missing/),
    ).not.toBeInTheDocument();

    // Clicking the disabled Approve button must not invoke the action.
    // userEvent.click on a disabled button is a no-op, but assert the
    // action was not called to be explicit.
    expect(recordApprovalDecisionMock).not.toHaveBeenCalled();

    // Reject can still be clicked and calls the action with REJECTED.
    await user.click(rejectButton);
    expect(recordApprovalDecisionMock).toHaveBeenCalledTimes(1);
    expect(recordApprovalDecisionMock).toHaveBeenCalledWith('item-1', 'REJECTED');
  });
});

// 3. AWAITING_APPROVAL + invalid research — Approve disabled, warning
//    "Research data is invalid or missing"
// -----------------------------------------------------------
describe('ApprovalPanel - AWAITING_APPROVAL + invalid research', () => {
  it('disables Approve, keeps Reject enabled, and shows the invalid-research warning', () => {
    render(
      <ApprovalPanel
        {...baseProps}
        status="AWAITING_APPROVAL"
        hasValidResearch={false}
        isResearchReviewed={false}
        hasCurrentRevision={true}
      />,
    );

    const approveButton = screen.getByRole('button', { name: /^Approve$/ });
    const rejectButton = screen.getByRole('button', { name: /^Reject$/ });

    // Approve is disabled (gate: hasValidResearch=false).
    expect(approveButton).toBeDisabled();
    // Reject is still available — invalid research is exactly the case
    // where the user needs to reject, not be locked out.
    expect(rejectButton).not.toBeDisabled();

    // The "invalid or missing" warning is shown. The exact wording
    // (including the trailing guidance) is part of the contract — a
    // refactor that drops the "Reject is still available" hint would
    // misdirect reviewers, so we assert the full message.
    expect(
      screen.getByText(/Research data is invalid or missing/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Reject is still available/),
    ).toBeInTheDocument();

    // The "research review required" warning must NOT be shown — the
    // research isn't invalid AND not reviewed, it's just invalid. The
    // component branches on the two cases separately.
    expect(
      screen.queryByText(/Research review required before approval\./),
    ).not.toBeInTheDocument();
  });
});

// 4. APPROVED status — shows "This item is approved" message, no buttons.
// -----------------------------------------------------------
describe('ApprovalPanel - APPROVED status', () => {
  it('shows the approved confirmation and no Approve/Reject buttons', () => {
    render(
      <ApprovalPanel
        {...baseProps}
        status="APPROVED"
        hasValidResearch={true}
        isResearchReviewed={true}
        hasCurrentRevision={true}
      />,
    );

    // The terminal-state message is rendered. The component renders a
    // <strong>approved</strong> within the sentence.
    expect(screen.getByText(/This item is/)).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();

    // No Approve/Reject buttons — the decision has been made.
    expect(screen.queryByRole('button', { name: /^Approve$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reject$/ })).not.toBeInTheDocument();

    // The Move-to-awaiting button must not show either — we're past
    // awaiting.
    expect(
      screen.queryByRole('button', { name: /Move to awaiting approval/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the rejected confirmation for REJECTED status (same shape as APPROVED)', () => {
    render(
      <ApprovalPanel
        {...baseProps}
        status="REJECTED"
        hasValidResearch={true}
        isResearchReviewed={true}
        hasCurrentRevision={true}
      />,
    );

    // Same branch handles both terminal states.
    expect(screen.getByText(/This item is/)).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approve$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reject$/ })).not.toBeInTheDocument();
  });
});

// 5. Click Reject — calls recordApprovalDecision('REJECTED') even when
//    research isn't reviewed (Finding 3 of PR #13 review).
// -----------------------------------------------------------
describe('ApprovalPanel - Reject works even without research review', () => {
  it('invokes recordApprovalDecision with REJECTED when research is invalid', async () => {
    const user = userEvent.setup();
    render(
      <ApprovalPanel
        {...baseProps}
        status="AWAITING_APPROVAL"
        hasValidResearch={false}
        isResearchReviewed={false}
        hasCurrentRevision={true}
      />,
    );

    const rejectButton = screen.getByRole('button', { name: /^Reject$/ });
    expect(rejectButton).not.toBeDisabled();

    await user.click(rejectButton);

    expect(recordApprovalDecisionMock).toHaveBeenCalledTimes(1);
    expect(recordApprovalDecisionMock).toHaveBeenCalledWith('item-1', 'REJECTED');
  });

  it('invokes recordApprovalDecision with REJECTED when research is valid but not reviewed', async () => {
    const user = userEvent.setup();
    render(
      <ApprovalPanel
        {...baseProps}
        status="AWAITING_APPROVAL"
        hasValidResearch={true}
        isResearchReviewed={false}
        hasCurrentRevision={true}
      />,
    );

    const rejectButton = screen.getByRole('button', { name: /^Reject$/ });
    expect(rejectButton).not.toBeDisabled();

    await user.click(rejectButton);

    expect(recordApprovalDecisionMock).toHaveBeenCalledTimes(1);
    expect(recordApprovalDecisionMock).toHaveBeenCalledWith('item-1', 'REJECTED');
  });
});
