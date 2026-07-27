# Remote Supabase migrations

The CI `database` job runs `supabase db reset`, which applies every migration in `supabase/migrations/` to a fresh local stack. Your **hosted** Supabase project only receives the initial schema on its own.

Two migrations added in Phase 1 are not auto-applied to remote — they were added after the project was first deployed, and we don't have an automated deploy-to-remote pipeline yet. They are **idempotent** (safe to run more than once) but they are **not optional** if you want the DB-level atomicity guarantees for the review gates.

## Why these two specifically

PRs #13 (research review gate) and #20 (storyboard review gate) introduced `revision.research_reviewed` and `revision.storyboard_reviewed` audit events. The application-layer code reads-then-writes with a `23505` unique-violation fallback, which requires a unique constraint to actually fail. Without these indexes, the application-layer guard degrades to "last write wins" and two concurrent reviewers can both succeed.

The partial unique indexes are scoped to `target_type = 'content_revision'` and `action = 'revision.<kind>_reviewed'`, so they do not interfere with any other audit event writes.

## How to apply

Open your Supabase project's SQL editor and run each statement below once. Order does not matter.

### 1. Research review unique index (PR #13)

```sql
-- Defensive cleanup: collapse any pre-existing duplicates, keeping the
-- earliest row per revision. Safe to run even if no duplicates exist.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY target_id
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.audit_events
  WHERE action = 'revision.research_reviewed'
    AND target_type = 'content_revision'
)
DELETE FROM public.audit_events
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Idempotent: skips if the index already exists.
CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_events_research_review
  ON public.audit_events (target_id)
  WHERE action = 'revision.research_reviewed'
    AND target_type = 'content_revision';
```

### 2. Storyboard review unique index (PR #20)

```sql
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY target_id
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.audit_events
  WHERE action = 'revision.storyboard_reviewed'
    AND target_type = 'content_revision'
)
DELETE FROM public.audit_events
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_events_storyboard_review
  ON public.audit_events (target_id)
  WHERE action = 'revision.storyboard_reviewed'
    AND target_type = 'content_revision';
```

## How to verify

After running both, the strict-concurrency test in the existing test suite should pass without the warn-and-skip fallback:

- `apps/web/test/research-review-actions.test.ts` → `recordResearchReviewIfAbsent - atomic idempotency`
- `apps/web/test/storyboard-review-actions.test.ts` → `recordStoryboardReviewIfAbsent - atomic idempotency`

The fallback was the test printing "expected exactly 1 audit event, found 2. The partial unique index migration is likely not applied to this database." If you see that on hosted, the migration didn't take.

## What the indexes do not do

- They do **not** retroactively add review events. If you have content items that were approved via the previous "no gate" code path, they remain approved.
- They do **not** block writes from other audit-event action types. Only the two specific `revision.<kind>_reviewed` events are constrained.
- They do **not** require an app redeploy. The application code already handles the 23505 fallback path; the indexes just make it actually fire.

## Future migrations

When a new migration is added that needs to land in remote too, it gets added to this doc under its own heading. We don't currently have a script to apply a list of migrations to remote — that would be the right follow-up tooling.
