-- Enforce one research-review audit event per content revision.
--
-- The application layer (packages/db/repositories/content-repository.ts) records
-- a `revision.research_reviewed` audit event when a human reviewer marks the
-- current revision's research as reviewed. Before this index, idempotency was
-- implemented as a read-then-insert, which has a race: two concurrent requests
-- can both observe "no existing event" and both insert, leaving duplicate rows.
-- Duplicates would let the approval gate's "exists?" check pass for a revision
-- that has not actually been reviewed, weakening the server-side safety check
-- that PR 1G is built around.
--
-- A partial unique index on (target_id) scoped to the
-- `revision.research_reviewed` action and `content_revision` target_type gives
-- us atomic idempotency at the database level without constraining the
-- (action, target_type, target_id) space for any other audit action.
--
-- Existing duplicates (none expected, but the migration is defensive) would
-- block the index creation; the cleanup query at the bottom removes any pre-
-- existing duplicates by keeping the earliest event for each (target_id).

-- Step 1: collapse any existing duplicates (keep the earliest row per target_id).
with ranked as (
  select id,
         row_number() over (
           partition by target_id
           order by created_at asc, id asc
         ) as rn
  from public.audit_events
  where action = 'revision.research_reviewed'
    and target_type = 'content_revision'
)
delete from public.audit_events
where id in (select id from ranked where rn > 1);

-- Step 2: create the partial unique index. Scoped to the action + target_type
-- so it does not collide with any other audit write.
create unique index if not exists uq_audit_events_research_review
  on public.audit_events (target_id)
  where action = 'revision.research_reviewed'
    and target_type = 'content_revision';
