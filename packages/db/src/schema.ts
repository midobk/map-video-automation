/**
 * TypeScript mapping of the Supabase dashboard content schema.
 *
 * These types are kept intentionally close to the migration schema. They are used
 * by server-side repositories and server actions; they are not sent to the
 * browser in raw form.
 */

export type ContentStatus =
  | 'IDEA'
  | 'RESEARCHING'
  | 'RESEARCH_REVIEW'
  | 'SCRIPTING'
  | 'STORYBOARD_REVIEW'
  | 'GENERATING_MEDIA'
  | 'RENDERING'
  | 'QUALITY_REVIEW'
  | 'AWAITING_APPROVAL'
  | 'REJECTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'PUBLISH_FAILED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type ContentItem = {
  id: string;
  project_id: string;
  title: string;
  topic_prompt: string;
  status: ContentStatus;
  risk: RiskLevel;
  current_revision_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentItemInsert = Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>;

export type ContentRevision = {
  id: string;
  content_item_id: string;
  revision_number: number;
  language: string;
  fact_pack: unknown | null;
  script: unknown | null;
  video_plan: unknown | null;
  content_hash: string;
  render_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export type Project = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  default_language: string;
  default_timezone: string;
  brand_config: Record<string, unknown>;
  content_policy: Record<string, unknown>;
  created_at: string;
};

export type WorkflowRun = {
  id: string;
  content_item_id: string | null;
  task_name: string;
  provider_run_id: string | null;
  status: JobStatus;
  input_hash: string | null;
  output_summary: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type AuditEvent = {
  id: number;
  organization_id: string;
  actor_user_id: string | null;
  actor_type: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
