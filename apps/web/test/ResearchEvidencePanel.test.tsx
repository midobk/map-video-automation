/**
 * Component-level tests for ResearchEvidencePanel.
 *
 * The action layer (markResearchReviewed) is already covered by
 * test/research-review-actions.test.ts; these tests focus on what the
 * component renders, what buttons show up, and which actions get called
 * with which args. A future refactor of the four-state pattern (parsed /
 * malformed / empty / reviewed) should be caught by this file.
 */

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FactPack } from '@mapvideo/pipeline';

// Mock the action module BEFORE importing the component so the component
// picks up the mocked implementation when it destructures the export.
// The factory uses a hoisted vi.fn so that the same mock instance is
// shared with the imported binding below.
vi.mock('../lib/actions/content', () => ({
  markResearchReviewed: vi.fn(),
}));

import { markResearchReviewed } from '../lib/actions/content';
import { ResearchEvidencePanel } from '../components/dashboard/ResearchEvidencePanel';

// vi.mocked() returns the same reference with a Mock type so .mockReset
// and assertion helpers (toHaveBeenCalledWith, etc.) are available.
const markResearchReviewedMock = vi.mocked(markResearchReviewed);

// Test fixtures ----------------------------------------------------------------

// A minimal valid fact pack: just enough to satisfy the schema and give the
// panel a non-empty claim list + summary to render.
const validFactPack: FactPack = {
  topic: 'A research topic for testing',
  summary: 'A summary that meets the schema minimum length requirement.',
  claims: [
    {
      text: 'A sourced claim with a URL.',
      source: { name: 'Example Source A', url: 'https://example.com/a' },
    },
    {
      text: 'A sourced claim without a URL.',
      source: { name: 'Example Source B' },
    },
    {
      text: 'Another claim, this one also has a URL.',
      source: { name: 'Example Source C', url: 'https://example.com/c' },
    },
  ],
  entities: ['Entity 1', 'Entity 2'],
  risk: 'LOW',
};

// The default props the test fixtures wrap. The four-state test matrix
// overrides only the fields relevant to the state under test.
const baseProps = {
  itemId: 'item-1',
  revisionId: 'rev-1',
};

beforeEach(() => {
  markResearchReviewedMock.mockReset();
  // Default mock: a successful review. Tests that don't care about the
  // click behaviour can leave it in place; tests that click the button
  // configure the return value explicitly.
  markResearchReviewedMock.mockResolvedValue({
    success: true,
    review: {
      createdAt: '2026-01-15T10:00:00Z',
      claimCount: 3,
      urlCount: 2,
      revisionId: 'rev-1',
    },
  });
});

afterEach(() => {
  cleanup();
});

// 1. parsed state — valid fact pack, no prior review
// -----------------------------------------------------------
describe('ResearchEvidencePanel - parsed state', () => {
  it('renders the claim bullets, summary, and the Mark research reviewed button', () => {
    render(
      <ResearchEvidencePanel
        {...baseProps}
        factPack={validFactPack}
        factPackRaw={validFactPack as unknown as Record<string, unknown>}
        researchReview={null}
      />,
    );

    // Risk pill reflects the fact pack risk.
    expect(screen.getByText('LOW')).toBeInTheDocument();

    // Summary is rendered.
    expect(screen.getByText(validFactPack.summary)).toBeInTheDocument();

    // Each claim's text is rendered as a numbered bullet.
    for (const claim of validFactPack.claims) {
      expect(screen.getByText(claim.text)).toBeInTheDocument();
    }

    // Sources are rendered (with or without the link).
    expect(screen.getByText(/Source: Example Source A/)).toBeInTheDocument();
    expect(screen.getByText(/Source: Example Source B/)).toBeInTheDocument();
    expect(screen.getByText(/Source: Example Source C/)).toBeInTheDocument();

    // The "no research data" hint must NOT show up — we have data.
    expect(screen.queryByText(/No research data on this revision/)).not.toBeInTheDocument();

    // The malformed warning must NOT show up — factPack is parsed.
    expect(screen.queryByText(/Research data is malformed/)).not.toBeInTheDocument();

    // The button is rendered and enabled.
    const button = screen.getByRole('button', { name: /Mark research reviewed/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });
});

// 2. button click invokes the action
// -----------------------------------------------------------
describe('ResearchEvidencePanel - button click', () => {
  it('calls markResearchReviewed with the right itemId and revisionId', async () => {
    const user = userEvent.setup();
    render(
      <ResearchEvidencePanel
        {...baseProps}
        itemId="item-42"
        revisionId="rev-99"
        factPack={validFactPack}
        factPackRaw={validFactPack as unknown as Record<string, unknown>}
        researchReview={null}
      />,
    );

    const button = screen.getByRole('button', { name: /Mark research reviewed/i });
    await user.click(button);

    // The action should have been invoked exactly once with the props
    // we passed in.
    expect(markResearchReviewedMock).toHaveBeenCalledTimes(1);
    expect(markResearchReviewedMock).toHaveBeenCalledWith('item-42', 'rev-99');

    // After the awaited action resolves, the panel should show the
    // success message (and hide the button — the reviewed state takes over).
    await waitFor(() => {
      expect(screen.getByText(/Research marked as reviewed/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Mark research reviewed/i })).not.toBeInTheDocument();
  });
});

// 3. malformed state — raw blob is present, but parsing failed
// -----------------------------------------------------------
describe('ResearchEvidencePanel - malformed state', () => {
  it('shows the warning, the raw JSON, and disables the button', () => {
    // factPack=null, factPackRaw=<malformed json> — the action would refuse
    // to mark this reviewed, and the panel must surface the diagnostic.
    const malformed = { topic: 'broken', claims: [] };

    render(
      <ResearchEvidencePanel
        {...baseProps}
        factPack={null}
        factPackRaw={malformed}
        researchReview={null}
      />,
    );

    // The warning must be visible.
    expect(
      screen.getByText(/Research data is malformed; cannot review or approve/),
    ).toBeInTheDocument();

    // The raw JSON is rendered in a <pre> for diagnostic purposes.
    expect(screen.getByText(/"claims":/)).toBeInTheDocument();

    // The button is rendered (so the user understands the affordance is
    // present) but disabled — the user can still see the button row, but
    // cannot click through.
    const button = screen.getByRole('button', { name: /Mark research reviewed/i });
    expect(button).toBeDisabled();

    // The parsed-state summary and claim list must NOT render.
    expect(screen.queryByText(validFactPack.summary)).not.toBeInTheDocument();
    for (const claim of validFactPack.claims) {
      expect(screen.queryByText(claim.text)).not.toBeInTheDocument();
    }

    // The "no research data" empty hint must NOT show up — there IS raw
    // data, it's just unparseable. The malformed warning is the right hint.
    expect(screen.queryByText(/No research data on this revision/)).not.toBeInTheDocument();

    // The action must not have been called (the button is disabled).
    expect(markResearchReviewedMock).not.toHaveBeenCalled();
  });
});

// 4. empty state — no fact pack, no raw blob
// -----------------------------------------------------------
describe('ResearchEvidencePanel - empty state', () => {
  it('shows the empty hint and renders a disabled button (canReview is false)', () => {
    render(
      <ResearchEvidencePanel
        {...baseProps}
        factPack={null}
        factPackRaw={null}
        researchReview={null}
      />,
    );

    // The empty hint is visible.
    expect(screen.getByText(/No research data on this revision/)).toBeInTheDocument();

    // The malformed warning must NOT show up — there is no raw blob.
    expect(screen.queryByText(/Research data is malformed/)).not.toBeInTheDocument();

    // The button is rendered (so the affordance is discoverable) but
    // disabled — canReview is false because hasData is false.
    const button = screen.getByRole('button', { name: /Mark research reviewed/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();

    // The "No risk" pill is shown because there is no parsed fact pack.
    expect(screen.getByText('No risk')).toBeInTheDocument();

    // The action must not have been called (the button is disabled).
    expect(markResearchReviewedMock).not.toHaveBeenCalled();
  });
});

// 5. reviewed state — researchReview is set
// -----------------------------------------------------------
describe('ResearchEvidencePanel - reviewed state', () => {
  it('hides the button and shows the read-only confirmation with the counts', () => {
    render(
      <ResearchEvidencePanel
        {...baseProps}
        factPack={validFactPack}
        factPackRaw={validFactPack as unknown as Record<string, unknown>}
        researchReview={{
          createdAt: '2026-01-15T10:00:00Z',
          claimCount: 3,
          urlCount: 2,
        }}
      />,
    );

    // No "Mark research reviewed" button — the review is already recorded.
    expect(
      screen.queryByRole('button', { name: /Mark research reviewed/i }),
    ).not.toBeInTheDocument();

    // The read-only confirmation line is shown, with the counts.
    expect(screen.getByText(/Research reviewed/)).toBeInTheDocument();
    expect(screen.getByText(/3 claims/)).toBeInTheDocument();
    expect(screen.getByText(/2 with URLs/)).toBeInTheDocument();

    // The claims and risk pill are still rendered — the panel is read-only
    // for the review action, not for the research data display.
    expect(screen.getByText(validFactPack.summary)).toBeInTheDocument();
    for (const claim of validFactPack.claims) {
      expect(screen.getByText(claim.text)).toBeInTheDocument();
    }
  });
});
