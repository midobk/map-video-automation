/**
 * Minimal Supabase database type definitions for the dashboard content schema.
 *
 * These types mirror the migration schema and are consumed by the server-only
 * Supabase client. They are intentionally narrow for the first dashboard PR.
 */

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      projects: {
        Row: {
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
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          default_language?: string;
          default_timezone?: string;
          brand_config?: Record<string, unknown>;
          content_policy?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          default_language?: string;
          default_timezone?: string;
          brand_config?: Record<string, unknown>;
          content_policy?: Record<string, unknown>;
          created_at?: string;
        };
      };
      content_items: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          topic_prompt: string;
          status: string;
          risk: string;
          current_revision_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          topic_prompt: string;
          status?: string;
          risk?: string;
          current_revision_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          topic_prompt?: string;
          status?: string;
          risk?: string;
          current_revision_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_revisions: {
        Row: {
          id: string;
          content_item_id: string;
          revision_number: number;
          language: string;
          fact_pack: unknown | null;
          script: unknown | null;
          video_plan: unknown | null;
          content_hash: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_item_id: string;
          revision_number: number;
          language: string;
          fact_pack?: unknown | null;
          script?: unknown | null;
          video_plan?: unknown | null;
          content_hash?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          content_item_id?: string;
          revision_number?: number;
          language?: string;
          fact_pack?: unknown | null;
          script?: unknown | null;
          video_plan?: unknown | null;
          content_hash?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      workflow_runs: {
        Row: {
          id: string;
          content_item_id: string | null;
          task_name: string;
          provider_run_id: string | null;
          status: string;
          input_hash: string | null;
          output_summary: Record<string, unknown> | null;
          error: Record<string, unknown> | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_item_id?: string | null;
          task_name: string;
          provider_run_id?: string | null;
          status?: string;
          input_hash?: string | null;
          output_summary?: Record<string, unknown> | null;
          error?: Record<string, unknown> | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          content_item_id?: string | null;
          task_name?: string;
          provider_run_id?: string | null;
          status?: string;
          input_hash?: string | null;
          output_summary?: Record<string, unknown> | null;
          error?: Record<string, unknown> | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      audit_events: {
        Row: {
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
        Insert: {
          id?: number;
          organization_id: string;
          actor_user_id?: string | null;
          actor_type: string;
          action: string;
          target_type: string;
          target_id: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: number;
          organization_id?: string;
          actor_user_id?: string | null;
          actor_type?: string;
          action?: string;
          target_type?: string;
          target_id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
      };
    };
  };
};
