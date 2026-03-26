drop extension if exists "pg_net";

create sequence "public"."module_unlocks_id_seq";

create sequence "public"."series_id_seq";

create sequence "public"."subscription_credit_ledger_id_seq";


  create table "public"."age_ranges" (
    "id" uuid not null default gen_random_uuid(),
    "age_range" character varying(20) not null,
    "display_name" character varying(100) not null,
    "language_guidelines" text not null,
    "developmental_stage" text not null,
    "cognitive_abilities" text,
    "emotional_capacity" text,
    "attention_span" text,
    "vocabulary_level" text,
    "sentence_complexity" text,
    "abstract_thinking" text,
    "neurodivergent_adaptations" text,
    "trauma_sensitive_notes" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "piaget_stage" text,
    "erikson_stage" text,
    "language_register" text,
    "duration_minutes" text
      );


alter table "public"."age_ranges" enable row level security;


  create table "public"."ai_generation_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "status" text not null default 'pending'::text,
    "content_brief" text not null,
    "result" jsonb,
    "error" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "content_brief_metadata" jsonb,
    "generation_metadata" jsonb,
    "attempt_number" integer default 1,
    "parent_job_id" uuid,
    "module_id" uuid,
    "failed_at_pass" text
      );


alter table "public"."ai_generation_jobs" enable row level security;


  create table "public"."ai_module_config" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "config_type" text not null,
    "content" text not null,
    "version" integer default 1,
    "is_active" boolean default true,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp without time zone default now()
      );


alter table "public"."ai_module_config" enable row level security;


  create table "public"."assessment_questions" (
    "id" uuid not null default gen_random_uuid(),
    "pathway_category" text not null,
    "question_key" text not null,
    "question_text" text not null,
    "question_type" text not null default 'frequency'::text,
    "options" jsonb not null default '[]'::jsonb,
    "reverse_score" boolean not null default false,
    "score_category" text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."assessment_questions" enable row level security;


  create table "public"."audit_criteria" (
    "id" uuid not null default gen_random_uuid(),
    "section_number" integer not null,
    "section_name" character varying(50) not null,
    "check_name" character varying(100) not null,
    "check_type" character varying(20) not null default 'AUTOMATIC'::character varying,
    "check_logic" text,
    "weight" numeric default 1.0,
    "fail_severity" character varying(10) default 'WARNING'::character varying,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."audit_criteria" enable row level security;


  create table "public"."audit_rules" (
    "id" uuid not null default gen_random_uuid(),
    "section_id" uuid not null,
    "rule_number" text not null,
    "rule_name" text not null,
    "check_type" text not null,
    "check_params" jsonb default '{}'::jsonb,
    "ai_instruction" text not null,
    "failure_message" text,
    "is_active" boolean default true,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."audit_rules" enable row level security;


  create table "public"."audit_sections" (
    "id" uuid not null default gen_random_uuid(),
    "section_number" integer not null,
    "section_name" text not null,
    "severity" text not null,
    "weight" integer not null default 10,
    "description" text,
    "ai_instruction" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."audit_sections" enable row level security;


  create table "public"."badges" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "icon" text,
    "image_url" text,
    "super_skill_id" uuid,
    "cycle_number" integer,
    "badge_type" text default 'cycle_completion'::text,
    "rarity" text default 'common'::text,
    "xp_bonus" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."badges" enable row level security;


  create table "public"."brain_town_vocabulary" (
    "id" uuid not null default gen_random_uuid(),
    "vocab_type" character varying(20) not null,
    "real_concept" text,
    "brain_town_term" text,
    "correct_usage" text,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."brain_town_vocabulary" enable row level security;


  create table "public"."category_colors" (
    "id" uuid not null default gen_random_uuid(),
    "category" text not null,
    "color" text not null default '#4c6c96'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "short_description" text
      );


alter table "public"."category_colors" enable row level security;


  create table "public"."characters" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(100) not null,
    "species" character varying(100),
    "personality_nd" text,
    "image_url" text,
    "super_skill_id" uuid,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."characters" enable row level security;


  create table "public"."checkin_challenges" (
    "id" uuid not null default gen_random_uuid(),
    "label" text not null,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."checkin_challenges" enable row level security;


  create table "public"."checkin_goals" (
    "id" uuid not null default gen_random_uuid(),
    "label" text not null,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."checkin_goals" enable row level security;


  create table "public"."checkin_triggers" (
    "id" uuid not null default gen_random_uuid(),
    "label" text not null,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."checkin_triggers" enable row level security;


  create table "public"."child_badges" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "badge_id" uuid not null,
    "earned_at" timestamp with time zone default now()
      );


alter table "public"."child_badges" enable row level security;


  create table "public"."child_cycle_progress" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "cycle_id" uuid not null,
    "status" text default 'not_started'::text,
    "completed_weeks" integer default 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone
      );


alter table "public"."child_cycle_progress" enable row level security;


  create table "public"."child_focus_plan" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "target_category_ids" uuid[] not null,
    "default_pathway_id" uuid,
    "goal_key" text,
    "goal_text" text,
    "frequency" text,
    "intensity" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "comments" text,
    "category" uuid,
    "assessment_enabled" boolean default true,
    "super_skill_id" uuid
      );


alter table "public"."child_focus_plan" enable row level security;


  create table "public"."child_modules" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "child_id" uuid not null default gen_random_uuid(),
    "module_id" uuid not null default gen_random_uuid(),
    "status" text default 'active'::text,
    "is_completed" boolean not null default false,
    "completed_at" timestamp with time zone,
    "is_active" boolean default true,
    "module_title" text,
    "child_name" text,
    "xp_awarded" integer default 0,
    "stars_awarded" integer default 0,
    "level_at_completion" integer,
    "locked" boolean default true
      );


alter table "public"."child_modules" enable row level security;


  create table "public"."child_mood_checkins" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "parent_user_id" uuid not null,
    "mood_score" integer not null,
    "mood_label" text,
    "mood_emoji" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."child_mood_checkins" enable row level security;


  create table "public"."child_roadblock_completions" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "roadblock_id" uuid not null,
    "completed_at" timestamp with time zone default now()
      );


alter table "public"."child_roadblock_completions" enable row level security;


  create table "public"."child_roadblocks" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "roadblock_id" uuid not null,
    "status" text default 'spawned'::text,
    "spawned_at" timestamp with time zone default now(),
    "cleared_at" timestamp with time zone,
    "triggered_by_module_id" uuid,
    "super_skill_id" uuid
      );


alter table "public"."child_roadblocks" enable row level security;


  create table "public"."child_super_skill_progress" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "super_skill_id" uuid not null,
    "status" text default 'locked'::text,
    "current_cycle_id" uuid,
    "current_week" integer default 0,
    "total_xp_in_skill" integer default 0,
    "started_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone
      );


alter table "public"."child_super_skill_progress" enable row level security;


  create table "public"."children" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "parent_user_id" uuid default gen_random_uuid(),
    "name" text default ''::text,
    "date_of_birth" date,
    "stars" numeric,
    "password" text,
    "avatar" text,
    "spendable_stars" integer default 0,
    "spent_stars" smallint default '0'::smallint,
    "total_xp" integer default 0,
    "level" integer default 1
      );


alter table "public"."children" enable row level security;


  create table "public"."core_theories" (
    "id" uuid not null default gen_random_uuid(),
    "theory_name" character varying(200) not null,
    "theory_code" character varying(50) not null,
    "description" text not null,
    "key_mechanism" text,
    "how_to_apply" text,
    "age_adaptations" text,
    "allowed_claims" text,
    "avoid_claims" text,
    "contraindications" text,
    "suggested_activities" text,
    "suggested_measures" text,
    "example_scenarios" text,
    "category" character varying(100),
    "related_theories" text,
    "primary_researchers" text,
    "key_references" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "key_theorists" text,
    "cycle_number" integer,
    "super_skill_id" uuid,
    "citation" text,
    "brain_town_application" text,
    "status" character varying(20) default 'review'::character varying,
    "cycle_theme" character varying(30)
      );


alter table "public"."core_theories" enable row level security;


  create table "public"."cycles" (
    "id" uuid not null default gen_random_uuid(),
    "super_skill_id" uuid not null,
    "cycle_number" integer not null,
    "name" text not null,
    "description" text,
    "total_weeks" integer default 12,
    "badge_id" uuid,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."cycles" enable row level security;


  create table "public"."daily_quest_completions" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "quest_id" character varying(50) not null,
    "completed_date" date not null default CURRENT_DATE,
    "completed_at" timestamp with time zone default now(),
    "response_data" jsonb,
    "stars_awarded" integer default 1,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."daily_quest_completions" enable row level security;


  create table "public"."diagnosis_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "code" character varying(10) not null,
    "name" character varying(100) not null,
    "tier" character varying(20) not null default 'core'::character varying,
    "adjustment_principles" text not null,
    "brain_town_note" text,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."diagnosis_profiles" enable row level security;


  create table "public"."dss_sedi_categories" (
    "id" uuid not null default gen_random_uuid(),
    "sedi_code" character varying not null,
    "sedi_name" character varying not null,
    "description" text,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."dss_sedi_categories" enable row level security;


  create table "public"."emotions" (
    "id" text not null,
    "label" text not null
      );


alter table "public"."emotions" enable row level security;


  create table "public"."fasd_domains" (
    "id" uuid not null default gen_random_uuid(),
    "domain_number" integer not null,
    "domain_name" character varying not null,
    "description" text,
    "adaptation_notes" text,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."fasd_domains" enable row level security;


  create table "public"."focus_plan_categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "icon" text not null default '📚'::text,
    "short_description" text not null default ''::text,
    "super_skill_id" uuid,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."focus_plan_categories" enable row level security;


  create table "public"."focus_plan_frequencies" (
    "id" uuid not null default gen_random_uuid(),
    "value" text not null,
    "label" text not null,
    "description" text not null default ''::text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."focus_plan_frequencies" enable row level security;


  create table "public"."focus_plan_goals" (
    "id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "label" text not null,
    "icon" text not null default '🎯'::text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."focus_plan_goals" enable row level security;


  create table "public"."focus_plan_intensities" (
    "id" uuid not null default gen_random_uuid(),
    "value" text not null,
    "label" text not null,
    "description" text not null default ''::text,
    "icon" text not null default '🌱'::text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."focus_plan_intensities" enable row level security;


  create table "public"."forbidden_terms" (
    "id" uuid not null default gen_random_uuid(),
    "term" text not null,
    "term_type" text not null,
    "reason" text,
    "brain_town_alternative" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."forbidden_terms" enable row level security;


  create table "public"."levels" (
    "id" integer generated always as identity not null,
    "level" integer not null,
    "xp_required" integer not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "level_name" character varying(30),
    "cognitive_stage" text,
    "approved_verbs" text,
    "independence_indicator" text,
    "weeks" integer[],
    "default_xp" integer,
    "default_stars" integer
      );


alter table "public"."levels" enable row level security;


  create table "public"."login_streaks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "current_streak" integer default 0,
    "longest_streak" integer default 0,
    "last_login_date" date,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "child_id" uuid
      );


alter table "public"."login_streaks" enable row level security;


  create table "public"."module_responses" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid,
    "module_id" uuid,
    "parent_user_id" uuid,
    "question_text" text not null,
    "response_type" character varying(50) not null,
    "response_value" text,
    "response_options" text[],
    "selected_option" integer,
    "page_number" integer default 1,
    "question_order" integer default 1,
    "response_time_ms" integer,
    "is_correct" boolean,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "question_id" text
      );


alter table "public"."module_responses" enable row level security;


  create table "public"."module_secondary_theories" (
    "id" uuid not null default gen_random_uuid(),
    "module_id" uuid not null,
    "theory_id" uuid not null,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."module_secondary_theories" enable row level security;


  create table "public"."module_unlocks" (
    "id" bigint not null default nextval('public.module_unlocks_id_seq'::regclass),
    "parent_id" uuid not null,
    "module_id" uuid not null,
    "unlock_source" text not null default 'subscription_credit'::text,
    "credits_spent" integer not null default 1,
    "period_start" date,
    "period_end" date,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."module_unlocks" enable row level security;


  create table "public"."module_variants" (
    "id" uuid not null default gen_random_uuid(),
    "module_id" uuid not null,
    "age_band" character varying(10) not null,
    "html_content" text not null,
    "generated_at" timestamp with time zone default now(),
    "generation_spec" jsonb,
    "token_usage" integer default 0
      );


alter table "public"."module_variants" enable row level security;


  create table "public"."modules" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "code" text default ''::text,
    "title" text not null,
    "is_active" boolean not null default true,
    "age_range" uuid,
    "short_description" text,
    "category" text default ''::text,
    "stripe_payment_link" text,
    "series" text,
    "card_color" text default '#4caf50'::text,
    "price" smallint,
    "html_content" text,
    "description" text,
    "pathway" uuid,
    "pathway_order" integer,
    "super_skill_id" uuid,
    "sub_skill_id" uuid,
    "cycle_id" uuid,
    "week_number" integer,
    "xp_reward" integer default 100,
    "stars_reward" integer default 10,
    "character_name" text,
    "primary_theory_id" uuid,
    "ndis_domain_id" uuid,
    "dss_sedi_id" uuid,
    "neuroscience_concept" character varying,
    "brain_town_metaphor" text,
    "module_objective" text,
    "facilitator_tip" text,
    "reflection_prompt" text,
    "reward_text" text,
    "bridge_from_module_id" uuid,
    "module_summary" text,
    "diagnosis_profiles" text[],
    "module_id_code" character varying(30),
    "dx_adjustments" jsonb,
    "audit_score" integer,
    "audit_report" jsonb,
    "level_name" character varying(30),
    "generated_at" timestamp with time zone,
    "audited_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "generated_by" character varying(50),
    "is_multi_age" boolean default false
      );


alter table "public"."modules" enable row level security;


  create table "public"."modules_to_generate" (
    "id" uuid not null default gen_random_uuid(),
    "module_title" text not null,
    "cycle" text,
    "week_number" integer,
    "level" text,
    "age_range" text,
    "core_theory" text,
    "brain_town_analogy" text,
    "main_activity" text,
    "measure_type" text,
    "builds_on" text,
    "progress_percentage" integer default 0,
    "ai_content_prompt" text,
    "super_skill_id" uuid,
    "sub_skill_id" uuid,
    "has_been_generated" boolean default false,
    "generated_module_id" uuid,
    "generated_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "primary_theory_id" uuid,
    "secondary_theory_ids" uuid[] default '{}'::uuid[],
    "ndis_domain_id" uuid,
    "dss_sedi_id" uuid,
    "neuroscience_concept" character varying,
    "brain_town_metaphor" text,
    "diagnosis_pathways" text[] default '{}'::text[],
    "fasd_domain_ids" integer[] default '{}'::integer[],
    "fasd_strategies" text,
    "module_objective" text,
    "facilitator_tip" text,
    "reflection_prompt" text,
    "reward_text" text,
    "bridge_from_module_id" uuid,
    "module_id_code" character varying(30),
    "level_name" character varying(30)
      );


alter table "public"."modules_to_generate" enable row level security;


  create table "public"."ndis_domains" (
    "id" uuid not null default gen_random_uuid(),
    "domain_name" character varying not null,
    "description" text,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ndis_domains" enable row level security;


  create table "public"."needs_based_pathways" (
    "id" uuid not null default gen_random_uuid(),
    "presenting_pattern" text not null,
    "recommended_path" character varying(40) not null,
    "rationale" text not null,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."needs_based_pathways" enable row level security;


  create table "public"."parent_modules" (
    "id" uuid not null default gen_random_uuid(),
    "parent_id" uuid not null,
    "module_id" uuid not null,
    "purchased_at" timestamp with time zone default now(),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."parent_modules" enable row level security;


  create table "public"."parent_profiles" (
    "id" uuid not null,
    "username" text,
    "is_admin" boolean default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."parent_profiles" enable row level security;


  create table "public"."parent_scripts" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "context" text not null,
    "script" text not null,
    "feelings" text[] default '{}'::text[],
    "tools" text[] default '{}'::text[],
    "created_at" timestamp with time zone default now()
      );


alter table "public"."parent_scripts" enable row level security;


  create table "public"."parent_subscriptions" (
    "parent_id" uuid not null,
    "tier" text,
    "status" text not null default 'inactive'::text,
    "current_period_start" date,
    "current_period_end" date,
    "cancel_at_period_end" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "stripe_price_id" text,
    "stripe_current_period_start" timestamp with time zone,
    "stripe_current_period_end" timestamp with time zone
      );


alter table "public"."parent_subscriptions" enable row level security;


  create table "public"."pathway_assessments" (
    "id" uuid not null default gen_random_uuid(),
    "child_id" uuid not null,
    "pathway_category" text not null,
    "assessment_type" text not null,
    "total_score" integer not null,
    "max_score" integer not null default 24,
    "efficacy_score" numeric(3,2),
    "question_scores" jsonb not null default '{}'::jsonb,
    "responses" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "module_id" uuid,
    "week_number" integer,
    "cycle_number" text
      );


alter table "public"."pathway_assessments" enable row level security;


  create table "public"."pathways" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone default now(),
    "category" text
      );


alter table "public"."pathways" enable row level security;


  create table "public"."reward_purchases" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "child_id" uuid not null,
    "reward_id" uuid,
    "reward_title" text not null,
    "reward_description" text,
    "star_cost" integer not null,
    "status" text default 'pending'::text,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "notes" text
      );


alter table "public"."reward_purchases" enable row level security;


  create table "public"."rewards" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "parent_user_id" uuid,
    "title" text not null,
    "description" text,
    "star_cost" integer not null,
    "icon" text default '🎁'::text,
    "is_baseline" boolean default false,
    "is_active" boolean default true,
    "category" text default 'other'::text,
    "child_id" uuid
      );


alter table "public"."rewards" enable row level security;


  create table "public"."roadblock_config" (
    "id" uuid not null default gen_random_uuid(),
    "spawn_chance" numeric(3,2) default 0.20,
    "force_spawn_after_modules" integer default 4,
    "cooldown_modules" integer default 2,
    "is_active" boolean default true
      );


alter table "public"."roadblock_config" enable row level security;


  create table "public"."roadblocks" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "roadblock_type" text not null,
    "difficulty" integer default 1,
    "content_json" jsonb not null default '{}'::jsonb,
    "tagged_super_skill_ids" uuid[] default '{}'::uuid[],
    "tagged_sub_skill_ids" uuid[] default '{}'::uuid[],
    "xp_reward" integer default 25,
    "stars_reward" integer default 5,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."roadblocks" enable row level security;


  create table "public"."sequencing_rules" (
    "id" uuid not null default gen_random_uuid(),
    "tier" character varying(30) not null,
    "skill_codes" text[] not null,
    "rule_description" text not null,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."sequencing_rules" enable row level security;


  create table "public"."series" (
    "id" bigint not null default nextval('public.series_id_seq'::regclass),
    "label" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "character_type" text default 'Dog'::text,
    "emoji" text
      );


alter table "public"."series" enable row level security;


  create table "public"."settings" (
    "id" uuid not null default gen_random_uuid(),
    "weekly_checkin_enabled" boolean default true,
    "challenges" text[] default ARRAY['Morning routine'::text, 'Bedtime routine'::text, 'Homework time'::text, 'Sibling conflict'::text, 'Screen time limits'::text, 'Transitions'::text, 'Mealtime'::text],
    "goals" text[] default ARRAY['Use a calm-down tool once'::text, 'Name the feeling before reacting'::text, 'Take 3 deep breaths when upset'::text, 'Use kind words during conflict'::text, 'Ask for help when needed'::text],
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "claude_api_key" text,
    "ai_prompt_template" text
      );


alter table "public"."settings" enable row level security;


  create table "public"."skills" (
    "id" text not null,
    "label" text not null
      );


alter table "public"."skills" enable row level security;


  create table "public"."sub_skills" (
    "id" uuid not null default gen_random_uuid(),
    "super_skill_id" uuid not null,
    "name" text not null,
    "slug" text not null,
    "description" text,
    "icon" text,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "code" character varying(10),
    "brain_town_description" text
      );


alter table "public"."sub_skills" enable row level security;


  create table "public"."subscription_credit_ledger" (
    "id" bigint not null default nextval('public.subscription_credit_ledger_id_seq'::regclass),
    "parent_id" uuid not null,
    "period_start" date not null,
    "period_end" date not null,
    "entry_type" text not null,
    "credits_delta" integer not null,
    "module_id" uuid,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "source_invoice_id" text,
    "stripe_event_id" text
      );


alter table "public"."subscription_credit_ledger" enable row level security;


  create table "public"."subscription_tiers" (
    "tier" text not null,
    "modules_per_month" integer not null,
    "monthly_price_cents" integer,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "description" text,
    "includes_behavioural_support" boolean default false,
    "includes_parent_insights" boolean default false,
    "display_name" text,
    "discount_3_month" integer,
    "discount_6_month" integer,
    "discount_12_month" integer
      );


alter table "public"."subscription_tiers" enable row level security;


  create table "public"."super_skills" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "theme_color" text default '#405878'::text,
    "icon" text,
    "emoji" text,
    "character_name" text,
    "character_image_url" text,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "relevant_theories" text,
    "code" character varying(4),
    "domain" text,
    "species" text,
    "personality" text,
    "nd_affirmation" text,
    "character_id" uuid
      );


alter table "public"."super_skills" enable row level security;


  create table "public"."theory_connections" (
    "id" uuid not null default gen_random_uuid(),
    "super_skill_id" uuid not null,
    "cycle_id" uuid not null,
    "primary_theory_id" uuid not null,
    "citation" text,
    "brain_town_application" text,
    "is_active" boolean default true,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."theory_connections" enable row level security;


  create table "public"."tools" (
    "id" text not null,
    "label" text not null,
    "description" text,
    "skills" text[] default '{}'::text[],
    "emotions" text[] default '{}'::text[]
      );


alter table "public"."tools" enable row level security;


  create table "public"."weekly_checkins" (
    "id" uuid not null default gen_random_uuid(),
    "parent_user_id" uuid not null,
    "child_id" uuid not null,
    "intensity" integer not null,
    "challenge" text not null,
    "triggers" text[] default '{}'::text[],
    "goal" text,
    "notes" text,
    "generated_plan" jsonb,
    "created_at" timestamp with time zone default now(),
    "sub_skill_id" uuid,
    "week_number" integer,
    "module_id" uuid
      );


alter table "public"."weekly_checkins" enable row level security;

alter sequence "public"."module_unlocks_id_seq" owned by "public"."module_unlocks"."id";

alter sequence "public"."series_id_seq" owned by "public"."series"."id";

alter sequence "public"."subscription_credit_ledger_id_seq" owned by "public"."subscription_credit_ledger"."id";

CREATE UNIQUE INDEX "Children_pkey" ON public.children USING btree (id);

CREATE UNIQUE INDEX "Modules_pkey" ON public.modules USING btree (id);

CREATE UNIQUE INDEX age_ranges_age_range_key ON public.age_ranges USING btree (age_range);

CREATE UNIQUE INDEX age_ranges_pkey ON public.age_ranges USING btree (id);

CREATE UNIQUE INDEX ai_generation_jobs_pkey ON public.ai_generation_jobs USING btree (id);

CREATE UNIQUE INDEX ai_module_config_config_type_key ON public.ai_module_config USING btree (config_type);

CREATE UNIQUE INDEX ai_module_config_pkey ON public.ai_module_config USING btree (id);

CREATE UNIQUE INDEX assessment_questions_pkey ON public.assessment_questions USING btree (id);

CREATE UNIQUE INDEX assessment_questions_question_key_key ON public.assessment_questions USING btree (question_key);

CREATE UNIQUE INDEX audit_criteria_pkey ON public.audit_criteria USING btree (id);

CREATE UNIQUE INDEX audit_rules_pkey ON public.audit_rules USING btree (id);

CREATE UNIQUE INDEX audit_rules_section_id_rule_number_key ON public.audit_rules USING btree (section_id, rule_number);

CREATE UNIQUE INDEX audit_sections_pkey ON public.audit_sections USING btree (id);

CREATE UNIQUE INDEX audit_sections_section_number_key ON public.audit_sections USING btree (section_number);

CREATE UNIQUE INDEX badges_pkey ON public.badges USING btree (id);

CREATE UNIQUE INDEX badges_slug_key ON public.badges USING btree (slug);

CREATE UNIQUE INDEX brain_town_vocabulary_pkey ON public.brain_town_vocabulary USING btree (id);

CREATE UNIQUE INDEX category_colors_category_key ON public.category_colors USING btree (category);

CREATE UNIQUE INDEX category_colors_pkey ON public.category_colors USING btree (id);

CREATE UNIQUE INDEX characters_pkey ON public.characters USING btree (id);

CREATE UNIQUE INDEX characters_super_skill_id_key ON public.characters USING btree (super_skill_id);

CREATE UNIQUE INDEX checkin_challenges_label_key ON public.checkin_challenges USING btree (label);

CREATE UNIQUE INDEX checkin_challenges_pkey ON public.checkin_challenges USING btree (id);

CREATE UNIQUE INDEX checkin_goals_label_key ON public.checkin_goals USING btree (label);

CREATE UNIQUE INDEX checkin_goals_pkey ON public.checkin_goals USING btree (id);

CREATE UNIQUE INDEX checkin_triggers_label_key ON public.checkin_triggers USING btree (label);

CREATE UNIQUE INDEX checkin_triggers_pkey ON public.checkin_triggers USING btree (id);

CREATE UNIQUE INDEX child_badges_child_id_badge_id_key ON public.child_badges USING btree (child_id, badge_id);

CREATE UNIQUE INDEX child_badges_pkey ON public.child_badges USING btree (id);

CREATE UNIQUE INDEX child_cycle_progress_child_id_cycle_id_key ON public.child_cycle_progress USING btree (child_id, cycle_id);

CREATE UNIQUE INDEX child_cycle_progress_pkey ON public.child_cycle_progress USING btree (id);

CREATE UNIQUE INDEX child_focus_plan_pkey ON public.child_focus_plan USING btree (id);

CREATE UNIQUE INDEX child_modules_child_id_module_id_key ON public.child_modules USING btree (child_id, module_id);

CREATE UNIQUE INDEX child_modules_pkey ON public.child_modules USING btree (id);

CREATE INDEX child_mood_checkins_child_created_at_idx ON public.child_mood_checkins USING btree (child_id, created_at DESC);

CREATE UNIQUE INDEX child_mood_checkins_pkey ON public.child_mood_checkins USING btree (id);

CREATE UNIQUE INDEX child_roadblock_completions_pkey ON public.child_roadblock_completions USING btree (id);

CREATE UNIQUE INDEX child_roadblocks_pkey ON public.child_roadblocks USING btree (id);

CREATE UNIQUE INDEX child_super_skill_progress_child_id_super_skill_id_key ON public.child_super_skill_progress USING btree (child_id, super_skill_id);

CREATE UNIQUE INDEX child_super_skill_progress_pkey ON public.child_super_skill_progress USING btree (id);

CREATE UNIQUE INDEX core_theories_pkey ON public.core_theories USING btree (id);

CREATE UNIQUE INDEX core_theories_theory_code_key ON public.core_theories USING btree (theory_code);

CREATE UNIQUE INDEX core_theories_theory_name_key ON public.core_theories USING btree (theory_name);

CREATE UNIQUE INDEX cycles_pkey ON public.cycles USING btree (id);

CREATE UNIQUE INDEX cycles_super_skill_id_cycle_number_key ON public.cycles USING btree (super_skill_id, cycle_number);

CREATE UNIQUE INDEX daily_quest_completions_child_id_completed_date_key ON public.daily_quest_completions USING btree (child_id, completed_date);

CREATE UNIQUE INDEX daily_quest_completions_pkey ON public.daily_quest_completions USING btree (id);

CREATE UNIQUE INDEX diagnosis_profiles_code_key ON public.diagnosis_profiles USING btree (code);

CREATE UNIQUE INDEX diagnosis_profiles_pkey ON public.diagnosis_profiles USING btree (id);

CREATE UNIQUE INDEX dss_sedi_categories_pkey ON public.dss_sedi_categories USING btree (id);

CREATE UNIQUE INDEX dss_sedi_categories_sedi_code_key ON public.dss_sedi_categories USING btree (sedi_code);

CREATE UNIQUE INDEX emotions_pkey ON public.emotions USING btree (id);

CREATE UNIQUE INDEX fasd_domains_domain_number_key ON public.fasd_domains USING btree (domain_number);

CREATE UNIQUE INDEX fasd_domains_pkey ON public.fasd_domains USING btree (id);

CREATE UNIQUE INDEX focus_plan_categories_name_key ON public.focus_plan_categories USING btree (name);

CREATE UNIQUE INDEX focus_plan_categories_pkey ON public.focus_plan_categories USING btree (id);

CREATE UNIQUE INDEX focus_plan_frequencies_pkey ON public.focus_plan_frequencies USING btree (id);

CREATE UNIQUE INDEX focus_plan_frequencies_value_key ON public.focus_plan_frequencies USING btree (value);

CREATE UNIQUE INDEX focus_plan_goals_key_key ON public.focus_plan_goals USING btree (key);

CREATE UNIQUE INDEX focus_plan_goals_pkey ON public.focus_plan_goals USING btree (id);

CREATE UNIQUE INDEX focus_plan_intensities_pkey ON public.focus_plan_intensities USING btree (id);

CREATE UNIQUE INDEX focus_plan_intensities_value_key ON public.focus_plan_intensities USING btree (value);

CREATE UNIQUE INDEX forbidden_terms_pkey ON public.forbidden_terms USING btree (id);

CREATE INDEX idx_age_ranges_active ON public.age_ranges USING btree (is_active);

CREATE INDEX idx_age_ranges_range ON public.age_ranges USING btree (age_range);

CREATE INDEX idx_ai_generation_jobs_created_at ON public.ai_generation_jobs USING btree (created_at);

CREATE INDEX idx_ai_generation_jobs_status ON public.ai_generation_jobs USING btree (status);

CREATE INDEX idx_ai_jobs_created ON public.ai_generation_jobs USING btree (created_at DESC);

CREATE INDEX idx_ai_jobs_status ON public.ai_generation_jobs USING btree (status);

CREATE INDEX idx_ai_module_config_type ON public.ai_module_config USING btree (config_type);

CREATE INDEX idx_audit_rules_active ON public.audit_rules USING btree (is_active);

CREATE INDEX idx_audit_rules_section ON public.audit_rules USING btree (section_id);

CREATE INDEX idx_audit_sections_active ON public.audit_sections USING btree (is_active);

CREATE INDEX idx_audit_sections_number ON public.audit_sections USING btree (section_number);

CREATE INDEX idx_badges_super_skill ON public.badges USING btree (super_skill_id);

CREATE UNIQUE INDEX idx_checkin_child_subskill_week ON public.weekly_checkins USING btree (child_id, sub_skill_id, week_number) WHERE ((sub_skill_id IS NOT NULL) AND (week_number IS NOT NULL));

CREATE INDEX idx_child_badges_child ON public.child_badges USING btree (child_id);

CREATE INDEX idx_child_cycle_progress_child ON public.child_cycle_progress USING btree (child_id);

CREATE INDEX idx_child_focus_plan_child_active ON public.child_focus_plan USING btree (child_id, is_active, created_at DESC);

CREATE INDEX idx_child_focus_plan_super_skill ON public.child_focus_plan USING btree (super_skill_id);

CREATE INDEX idx_child_roadblock_completions_child ON public.child_roadblock_completions USING btree (child_id);

CREATE INDEX idx_child_roadblock_completions_roadblock ON public.child_roadblock_completions USING btree (roadblock_id);

CREATE INDEX idx_child_roadblocks_child ON public.child_roadblocks USING btree (child_id);

CREATE INDEX idx_child_roadblocks_status ON public.child_roadblocks USING btree (status);

CREATE INDEX idx_child_super_skill_progress_child ON public.child_super_skill_progress USING btree (child_id);

CREATE INDEX idx_children_level ON public.children USING btree (level);

CREATE INDEX idx_children_total_xp ON public.children USING btree (total_xp);

CREATE INDEX idx_core_theories_active ON public.core_theories USING btree (is_active);

CREATE INDEX idx_core_theories_category ON public.core_theories USING btree (category);

CREATE INDEX idx_core_theories_code ON public.core_theories USING btree (theory_code);

CREATE INDEX idx_cycles_super_skill ON public.cycles USING btree (super_skill_id);

CREATE INDEX idx_daily_quest_child_date ON public.daily_quest_completions USING btree (child_id, completed_date);

CREATE INDEX idx_daily_quest_date ON public.daily_quest_completions USING btree (completed_date);

CREATE INDEX idx_emotions_label ON public.emotions USING btree (label);

CREATE INDEX idx_forbidden_terms_active ON public.forbidden_terms USING btree (is_active);

CREATE INDEX idx_forbidden_terms_type ON public.forbidden_terms USING btree (term_type);

CREATE UNIQUE INDEX idx_forbidden_terms_unique ON public.forbidden_terms USING btree (lower(term), term_type);

CREATE INDEX idx_levels_level ON public.levels USING btree (level);

CREATE INDEX idx_module_responses_child_id ON public.module_responses USING btree (child_id);

CREATE INDEX idx_module_responses_child_module ON public.module_responses USING btree (child_id, module_id);

CREATE INDEX idx_module_responses_created_at ON public.module_responses USING btree (created_at);

CREATE INDEX idx_module_responses_module ON public.module_responses USING btree (module_id);

CREATE INDEX idx_module_responses_module_id ON public.module_responses USING btree (module_id);

CREATE INDEX idx_module_responses_parent_user_id ON public.module_responses USING btree (parent_user_id);

CREATE INDEX idx_module_responses_question ON public.module_responses USING btree (question_id);

CREATE INDEX idx_module_secondary_theories_module_id ON public.module_secondary_theories USING btree (module_id);

CREATE INDEX idx_module_secondary_theories_theory_id ON public.module_secondary_theories USING btree (theory_id);

CREATE INDEX idx_module_unlocks_parent_active ON public.module_unlocks USING btree (parent_id, is_active, period_end);

CREATE INDEX idx_module_variants_module_id ON public.module_variants USING btree (module_id);

CREATE INDEX idx_modules_cycle ON public.modules USING btree (cycle_id);

CREATE INDEX idx_modules_dss_sedi_id ON public.modules USING btree (dss_sedi_id) WHERE (dss_sedi_id IS NOT NULL);

CREATE INDEX idx_modules_ndis_domain_id ON public.modules USING btree (ndis_domain_id) WHERE (ndis_domain_id IS NOT NULL);

CREATE INDEX idx_modules_primary_theory_id ON public.modules USING btree (primary_theory_id) WHERE (primary_theory_id IS NOT NULL);

CREATE INDEX idx_modules_sub_skill ON public.modules USING btree (sub_skill_id);

CREATE INDEX idx_modules_super_skill ON public.modules USING btree (super_skill_id);

CREATE INDEX idx_modules_to_generate_cycle_week ON public.modules_to_generate USING btree (cycle, week_number);

CREATE INDEX idx_modules_to_generate_has_been_generated ON public.modules_to_generate USING btree (has_been_generated);

CREATE INDEX idx_modules_to_generate_super_skill ON public.modules_to_generate USING btree (super_skill_id);

CREATE INDEX idx_parent_modules_module ON public.parent_modules USING btree (module_id);

CREATE INDEX idx_parent_modules_parent ON public.parent_modules USING btree (parent_id);

CREATE INDEX idx_parent_profiles_is_admin ON public.parent_profiles USING btree (is_admin);

CREATE INDEX idx_pathway_assessments_child_id ON public.pathway_assessments USING btree (child_id);

CREATE INDEX idx_pathway_assessments_child_module_type ON public.pathway_assessments USING btree (child_id, module_id, assessment_type);

CREATE INDEX idx_pathway_assessments_child_pathway ON public.pathway_assessments USING btree (child_id, pathway_category);

CREATE INDEX idx_pathway_assessments_child_week_cycle ON public.pathway_assessments USING btree (child_id, pathway_category, week_number, cycle_number, assessment_type);

CREATE INDEX idx_pathway_assessments_module_id ON public.pathway_assessments USING btree (module_id);

CREATE INDEX idx_pathway_assessments_pathway_category ON public.pathway_assessments USING btree (pathway_category);

CREATE INDEX idx_pathway_assessments_type ON public.pathway_assessments USING btree (assessment_type);

CREATE INDEX idx_reward_purchases_child ON public.reward_purchases USING btree (child_id);

CREATE INDEX idx_reward_purchases_created ON public.reward_purchases USING btree (created_at DESC);

CREATE INDEX idx_reward_purchases_status ON public.reward_purchases USING btree (status);

CREATE INDEX idx_rewards_active ON public.rewards USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_rewards_child_id ON public.rewards USING btree (child_id);

CREATE INDEX idx_rewards_parent_user ON public.rewards USING btree (parent_user_id);

CREATE INDEX idx_roadblocks_type ON public.roadblocks USING btree (roadblock_type);

CREATE INDEX idx_series_label ON public.series USING btree (label);

CREATE INDEX idx_skills_label ON public.skills USING btree (label);

CREATE INDEX idx_sub_skills_super_skill ON public.sub_skills USING btree (super_skill_id);

CREATE INDEX idx_subscription_credit_ledger_parent_period ON public.subscription_credit_ledger USING btree (parent_id, period_start, period_end);

CREATE INDEX idx_theory_connections_cycle_id ON public.theory_connections USING btree (cycle_id);

CREATE INDEX idx_theory_connections_primary_theory_id ON public.theory_connections USING btree (primary_theory_id);

CREATE INDEX idx_theory_connections_sort_order ON public.theory_connections USING btree (sort_order);

CREATE INDEX idx_theory_connections_super_skill_id ON public.theory_connections USING btree (super_skill_id);

CREATE UNIQUE INDEX levels_level_key ON public.levels USING btree (level);

CREATE UNIQUE INDEX levels_pkey ON public.levels USING btree (id);

CREATE INDEX login_streaks_child_id_idx ON public.login_streaks USING btree (child_id);

CREATE UNIQUE INDEX login_streaks_pkey ON public.login_streaks USING btree (id);

CREATE UNIQUE INDEX login_streaks_user_child_unique ON public.login_streaks USING btree (user_id, child_id);

CREATE UNIQUE INDEX module_responses_child_module_question_unique ON public.module_responses USING btree (child_id, module_id, question_id);

CREATE UNIQUE INDEX module_responses_child_module_unique ON public.module_responses USING btree (child_id, module_id);

CREATE UNIQUE INDEX module_responses_pkey ON public.module_responses USING btree (id);

CREATE UNIQUE INDEX module_secondary_theories_pkey ON public.module_secondary_theories USING btree (id);

CREATE UNIQUE INDEX module_secondary_theories_unique ON public.module_secondary_theories USING btree (module_id, theory_id);

CREATE UNIQUE INDEX module_unlocks_parent_id_module_id_period_start_period_end_key ON public.module_unlocks USING btree (parent_id, module_id, period_start, period_end);

CREATE UNIQUE INDEX module_unlocks_pkey ON public.module_unlocks USING btree (id);

CREATE UNIQUE INDEX module_variants_module_id_age_band_key ON public.module_variants USING btree (module_id, age_band);

CREATE UNIQUE INDEX module_variants_pkey ON public.module_variants USING btree (id);

CREATE UNIQUE INDEX modules_to_generate_pkey ON public.modules_to_generate USING btree (id);

CREATE UNIQUE INDEX ndis_domains_domain_name_key ON public.ndis_domains USING btree (domain_name);

CREATE UNIQUE INDEX ndis_domains_pkey ON public.ndis_domains USING btree (id);

CREATE UNIQUE INDEX needs_based_pathways_pkey ON public.needs_based_pathways USING btree (id);

CREATE UNIQUE INDEX parent_modules_parent_id_module_id_key ON public.parent_modules USING btree (parent_id, module_id);

CREATE UNIQUE INDEX parent_modules_pkey ON public.parent_modules USING btree (id);

CREATE UNIQUE INDEX parent_profiles_pkey ON public.parent_profiles USING btree (id);

CREATE UNIQUE INDEX parent_scripts_pkey ON public.parent_scripts USING btree (id);

CREATE UNIQUE INDEX parent_subscriptions_pkey ON public.parent_subscriptions USING btree (parent_id);

CREATE UNIQUE INDEX parent_subscriptions_stripe_customer_uidx ON public.parent_subscriptions USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);

CREATE UNIQUE INDEX parent_subscriptions_stripe_subscription_uidx ON public.parent_subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);

CREATE INDEX pathway_assessments_child_id_idx ON public.pathway_assessments USING btree (child_id);

CREATE INDEX pathway_assessments_child_pathway_created_idx ON public.pathway_assessments USING btree (child_id, pathway_category, created_at);

CREATE INDEX pathway_assessments_child_pathway_type_created_idx ON public.pathway_assessments USING btree (child_id, pathway_category, assessment_type, created_at);

CREATE UNIQUE INDEX pathway_assessments_pkey ON public.pathway_assessments USING btree (id);

CREATE UNIQUE INDEX pathways_name_key ON public.pathways USING btree (name);

CREATE UNIQUE INDEX pathways_pkey ON public.pathways USING btree (id);

CREATE UNIQUE INDEX reward_purchases_pkey ON public.reward_purchases USING btree (id);

CREATE UNIQUE INDEX rewards_pkey ON public.rewards USING btree (id);

CREATE UNIQUE INDEX roadblock_config_pkey ON public.roadblock_config USING btree (id);

CREATE UNIQUE INDEX roadblocks_pkey ON public.roadblocks USING btree (id);

CREATE UNIQUE INDEX sequencing_rules_pkey ON public.sequencing_rules USING btree (id);

CREATE UNIQUE INDEX series_label_key ON public.series USING btree (label);

CREATE UNIQUE INDEX series_pkey ON public.series USING btree (id);

CREATE UNIQUE INDEX settings_pkey ON public.settings USING btree (id);

CREATE UNIQUE INDEX skills_pkey ON public.skills USING btree (id);

CREATE UNIQUE INDEX sub_skills_pkey ON public.sub_skills USING btree (id);

CREATE UNIQUE INDEX sub_skills_super_skill_id_slug_key ON public.sub_skills USING btree (super_skill_id, slug);

CREATE UNIQUE INDEX subscription_credit_ledger_pkey ON public.subscription_credit_ledger USING btree (id);

CREATE UNIQUE INDEX subscription_credit_ledger_source_invoice_uidx ON public.subscription_credit_ledger USING btree (source_invoice_id) WHERE (source_invoice_id IS NOT NULL);

CREATE UNIQUE INDEX subscription_credit_ledger_stripe_event_uidx ON public.subscription_credit_ledger USING btree (stripe_event_id) WHERE (stripe_event_id IS NOT NULL);

CREATE UNIQUE INDEX subscription_tiers_pkey ON public.subscription_tiers USING btree (tier);

CREATE UNIQUE INDEX super_skills_name_key ON public.super_skills USING btree (name);

CREATE UNIQUE INDEX super_skills_pkey ON public.super_skills USING btree (id);

CREATE UNIQUE INDEX super_skills_slug_key ON public.super_skills USING btree (slug);

CREATE UNIQUE INDEX theory_connections_pkey ON public.theory_connections USING btree (id);

CREATE UNIQUE INDEX theory_connections_unique ON public.theory_connections USING btree (super_skill_id, cycle_id, primary_theory_id);

CREATE UNIQUE INDEX tools_pkey ON public.tools USING btree (id);

CREATE UNIQUE INDEX unique_baseline_title ON public.rewards USING btree (title, parent_user_id, is_baseline) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX unique_child_roadblock ON public.child_roadblock_completions USING btree (child_id, roadblock_id);

CREATE UNIQUE INDEX uq_child_focus_plan_one_active_per_child ON public.child_focus_plan USING btree (child_id) WHERE (is_active = true);

CREATE INDEX weekly_checkins_parent_child_idx ON public.weekly_checkins USING btree (parent_user_id, child_id, created_at DESC);

CREATE UNIQUE INDEX weekly_checkins_pkey ON public.weekly_checkins USING btree (id);

alter table "public"."age_ranges" add constraint "age_ranges_pkey" PRIMARY KEY using index "age_ranges_pkey";

alter table "public"."ai_generation_jobs" add constraint "ai_generation_jobs_pkey" PRIMARY KEY using index "ai_generation_jobs_pkey";

alter table "public"."ai_module_config" add constraint "ai_module_config_pkey" PRIMARY KEY using index "ai_module_config_pkey";

alter table "public"."assessment_questions" add constraint "assessment_questions_pkey" PRIMARY KEY using index "assessment_questions_pkey";

alter table "public"."audit_criteria" add constraint "audit_criteria_pkey" PRIMARY KEY using index "audit_criteria_pkey";

alter table "public"."audit_rules" add constraint "audit_rules_pkey" PRIMARY KEY using index "audit_rules_pkey";

alter table "public"."audit_sections" add constraint "audit_sections_pkey" PRIMARY KEY using index "audit_sections_pkey";

alter table "public"."badges" add constraint "badges_pkey" PRIMARY KEY using index "badges_pkey";

alter table "public"."brain_town_vocabulary" add constraint "brain_town_vocabulary_pkey" PRIMARY KEY using index "brain_town_vocabulary_pkey";

alter table "public"."category_colors" add constraint "category_colors_pkey" PRIMARY KEY using index "category_colors_pkey";

alter table "public"."characters" add constraint "characters_pkey" PRIMARY KEY using index "characters_pkey";

alter table "public"."checkin_challenges" add constraint "checkin_challenges_pkey" PRIMARY KEY using index "checkin_challenges_pkey";

alter table "public"."checkin_goals" add constraint "checkin_goals_pkey" PRIMARY KEY using index "checkin_goals_pkey";

alter table "public"."checkin_triggers" add constraint "checkin_triggers_pkey" PRIMARY KEY using index "checkin_triggers_pkey";

alter table "public"."child_badges" add constraint "child_badges_pkey" PRIMARY KEY using index "child_badges_pkey";

alter table "public"."child_cycle_progress" add constraint "child_cycle_progress_pkey" PRIMARY KEY using index "child_cycle_progress_pkey";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_pkey" PRIMARY KEY using index "child_focus_plan_pkey";

alter table "public"."child_modules" add constraint "child_modules_pkey" PRIMARY KEY using index "child_modules_pkey";

alter table "public"."child_mood_checkins" add constraint "child_mood_checkins_pkey" PRIMARY KEY using index "child_mood_checkins_pkey";

alter table "public"."child_roadblock_completions" add constraint "child_roadblock_completions_pkey" PRIMARY KEY using index "child_roadblock_completions_pkey";

alter table "public"."child_roadblocks" add constraint "child_roadblocks_pkey" PRIMARY KEY using index "child_roadblocks_pkey";

alter table "public"."child_super_skill_progress" add constraint "child_super_skill_progress_pkey" PRIMARY KEY using index "child_super_skill_progress_pkey";

alter table "public"."children" add constraint "Children_pkey" PRIMARY KEY using index "Children_pkey";

alter table "public"."core_theories" add constraint "core_theories_pkey" PRIMARY KEY using index "core_theories_pkey";

alter table "public"."cycles" add constraint "cycles_pkey" PRIMARY KEY using index "cycles_pkey";

alter table "public"."daily_quest_completions" add constraint "daily_quest_completions_pkey" PRIMARY KEY using index "daily_quest_completions_pkey";

alter table "public"."diagnosis_profiles" add constraint "diagnosis_profiles_pkey" PRIMARY KEY using index "diagnosis_profiles_pkey";

alter table "public"."dss_sedi_categories" add constraint "dss_sedi_categories_pkey" PRIMARY KEY using index "dss_sedi_categories_pkey";

alter table "public"."emotions" add constraint "emotions_pkey" PRIMARY KEY using index "emotions_pkey";

alter table "public"."fasd_domains" add constraint "fasd_domains_pkey" PRIMARY KEY using index "fasd_domains_pkey";

alter table "public"."focus_plan_categories" add constraint "focus_plan_categories_pkey" PRIMARY KEY using index "focus_plan_categories_pkey";

alter table "public"."focus_plan_frequencies" add constraint "focus_plan_frequencies_pkey" PRIMARY KEY using index "focus_plan_frequencies_pkey";

alter table "public"."focus_plan_goals" add constraint "focus_plan_goals_pkey" PRIMARY KEY using index "focus_plan_goals_pkey";

alter table "public"."focus_plan_intensities" add constraint "focus_plan_intensities_pkey" PRIMARY KEY using index "focus_plan_intensities_pkey";

alter table "public"."forbidden_terms" add constraint "forbidden_terms_pkey" PRIMARY KEY using index "forbidden_terms_pkey";

alter table "public"."levels" add constraint "levels_pkey" PRIMARY KEY using index "levels_pkey";

alter table "public"."login_streaks" add constraint "login_streaks_pkey" PRIMARY KEY using index "login_streaks_pkey";

alter table "public"."module_responses" add constraint "module_responses_pkey" PRIMARY KEY using index "module_responses_pkey";

alter table "public"."module_secondary_theories" add constraint "module_secondary_theories_pkey" PRIMARY KEY using index "module_secondary_theories_pkey";

alter table "public"."module_unlocks" add constraint "module_unlocks_pkey" PRIMARY KEY using index "module_unlocks_pkey";

alter table "public"."module_variants" add constraint "module_variants_pkey" PRIMARY KEY using index "module_variants_pkey";

alter table "public"."modules" add constraint "Modules_pkey" PRIMARY KEY using index "Modules_pkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_pkey" PRIMARY KEY using index "modules_to_generate_pkey";

alter table "public"."ndis_domains" add constraint "ndis_domains_pkey" PRIMARY KEY using index "ndis_domains_pkey";

alter table "public"."needs_based_pathways" add constraint "needs_based_pathways_pkey" PRIMARY KEY using index "needs_based_pathways_pkey";

alter table "public"."parent_modules" add constraint "parent_modules_pkey" PRIMARY KEY using index "parent_modules_pkey";

alter table "public"."parent_profiles" add constraint "parent_profiles_pkey" PRIMARY KEY using index "parent_profiles_pkey";

alter table "public"."parent_scripts" add constraint "parent_scripts_pkey" PRIMARY KEY using index "parent_scripts_pkey";

alter table "public"."parent_subscriptions" add constraint "parent_subscriptions_pkey" PRIMARY KEY using index "parent_subscriptions_pkey";

alter table "public"."pathway_assessments" add constraint "pathway_assessments_pkey" PRIMARY KEY using index "pathway_assessments_pkey";

alter table "public"."pathways" add constraint "pathways_pkey" PRIMARY KEY using index "pathways_pkey";

alter table "public"."reward_purchases" add constraint "reward_purchases_pkey" PRIMARY KEY using index "reward_purchases_pkey";

alter table "public"."rewards" add constraint "rewards_pkey" PRIMARY KEY using index "rewards_pkey";

alter table "public"."roadblock_config" add constraint "roadblock_config_pkey" PRIMARY KEY using index "roadblock_config_pkey";

alter table "public"."roadblocks" add constraint "roadblocks_pkey" PRIMARY KEY using index "roadblocks_pkey";

alter table "public"."sequencing_rules" add constraint "sequencing_rules_pkey" PRIMARY KEY using index "sequencing_rules_pkey";

alter table "public"."series" add constraint "series_pkey" PRIMARY KEY using index "series_pkey";

alter table "public"."settings" add constraint "settings_pkey" PRIMARY KEY using index "settings_pkey";

alter table "public"."skills" add constraint "skills_pkey" PRIMARY KEY using index "skills_pkey";

alter table "public"."sub_skills" add constraint "sub_skills_pkey" PRIMARY KEY using index "sub_skills_pkey";

alter table "public"."subscription_credit_ledger" add constraint "subscription_credit_ledger_pkey" PRIMARY KEY using index "subscription_credit_ledger_pkey";

alter table "public"."subscription_tiers" add constraint "subscription_tiers_pkey" PRIMARY KEY using index "subscription_tiers_pkey";

alter table "public"."super_skills" add constraint "super_skills_pkey" PRIMARY KEY using index "super_skills_pkey";

alter table "public"."theory_connections" add constraint "theory_connections_pkey" PRIMARY KEY using index "theory_connections_pkey";

alter table "public"."tools" add constraint "tools_pkey" PRIMARY KEY using index "tools_pkey";

alter table "public"."weekly_checkins" add constraint "weekly_checkins_pkey" PRIMARY KEY using index "weekly_checkins_pkey";

alter table "public"."age_ranges" add constraint "age_ranges_age_range_key" UNIQUE using index "age_ranges_age_range_key";

alter table "public"."ai_generation_jobs" add constraint "ai_generation_jobs_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) not valid;

alter table "public"."ai_generation_jobs" validate constraint "ai_generation_jobs_module_id_fkey";

alter table "public"."ai_generation_jobs" add constraint "ai_generation_jobs_parent_job_id_fkey" FOREIGN KEY (parent_job_id) REFERENCES public.ai_generation_jobs(id) not valid;

alter table "public"."ai_generation_jobs" validate constraint "ai_generation_jobs_parent_job_id_fkey";

alter table "public"."ai_generation_jobs" add constraint "ai_generation_jobs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."ai_generation_jobs" validate constraint "ai_generation_jobs_status_check";

alter table "public"."ai_module_config" add constraint "ai_module_config_config_type_key" UNIQUE using index "ai_module_config_config_type_key";

alter table "public"."assessment_questions" add constraint "assessment_questions_question_key_key" UNIQUE using index "assessment_questions_question_key_key";

alter table "public"."audit_criteria" add constraint "audit_criteria_check_type_check" CHECK (((check_type)::text = ANY (ARRAY[('AUTOMATIC'::character varying)::text, ('MANUAL'::character varying)::text]))) not valid;

alter table "public"."audit_criteria" validate constraint "audit_criteria_check_type_check";

alter table "public"."audit_criteria" add constraint "audit_criteria_fail_severity_check" CHECK (((fail_severity)::text = ANY (ARRAY[('CRITICAL'::character varying)::text, ('WARNING'::character varying)::text]))) not valid;

alter table "public"."audit_criteria" validate constraint "audit_criteria_fail_severity_check";

alter table "public"."audit_rules" add constraint "audit_rules_check_type_check" CHECK ((check_type = ANY (ARRAY['contains_text'::text, 'not_contains_text'::text, 'contains_any'::text, 'not_contains_any'::text, 'min_count'::text, 'regex_match'::text, 'manual_review'::text]))) not valid;

alter table "public"."audit_rules" validate constraint "audit_rules_check_type_check";

alter table "public"."audit_rules" add constraint "audit_rules_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.audit_sections(id) ON DELETE CASCADE not valid;

alter table "public"."audit_rules" validate constraint "audit_rules_section_id_fkey";

alter table "public"."audit_rules" add constraint "audit_rules_section_id_rule_number_key" UNIQUE using index "audit_rules_section_id_rule_number_key";

alter table "public"."audit_sections" add constraint "audit_sections_section_number_key" UNIQUE using index "audit_sections_section_number_key";

alter table "public"."audit_sections" add constraint "audit_sections_severity_check" CHECK ((severity = ANY (ARRAY['CRITICAL'::text, 'IMPORTANT'::text, 'ADVISORY'::text]))) not valid;

alter table "public"."audit_sections" validate constraint "audit_sections_severity_check";

alter table "public"."audit_sections" add constraint "audit_sections_weight_check" CHECK (((weight >= 0) AND (weight <= 100))) not valid;

alter table "public"."audit_sections" validate constraint "audit_sections_weight_check";

alter table "public"."badges" add constraint "badges_slug_key" UNIQUE using index "badges_slug_key";

alter table "public"."badges" add constraint "badges_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."badges" validate constraint "badges_super_skill_id_fkey";

alter table "public"."brain_town_vocabulary" add constraint "brain_town_vocabulary_vocab_type_check" CHECK (((vocab_type)::text = ANY (ARRAY[('approved'::character varying)::text, ('forbidden_word'::character varying)::text, ('forbidden_metaphor'::character varying)::text]))) not valid;

alter table "public"."brain_town_vocabulary" validate constraint "brain_town_vocabulary_vocab_type_check";

alter table "public"."category_colors" add constraint "category_colors_category_key" UNIQUE using index "category_colors_category_key";

alter table "public"."characters" add constraint "characters_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."characters" validate constraint "characters_super_skill_id_fkey";

alter table "public"."characters" add constraint "characters_super_skill_id_key" UNIQUE using index "characters_super_skill_id_key";

alter table "public"."checkin_challenges" add constraint "checkin_challenges_label_key" UNIQUE using index "checkin_challenges_label_key";

alter table "public"."checkin_goals" add constraint "checkin_goals_label_key" UNIQUE using index "checkin_goals_label_key";

alter table "public"."checkin_triggers" add constraint "checkin_triggers_label_key" UNIQUE using index "checkin_triggers_label_key";

alter table "public"."child_badges" add constraint "child_badges_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE not valid;

alter table "public"."child_badges" validate constraint "child_badges_badge_id_fkey";

alter table "public"."child_badges" add constraint "child_badges_child_id_badge_id_key" UNIQUE using index "child_badges_child_id_badge_id_key";

alter table "public"."child_badges" add constraint "child_badges_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_badges" validate constraint "child_badges_child_id_fkey";

alter table "public"."child_cycle_progress" add constraint "child_cycle_progress_child_id_cycle_id_key" UNIQUE using index "child_cycle_progress_child_id_cycle_id_key";

alter table "public"."child_cycle_progress" add constraint "child_cycle_progress_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_cycle_progress" validate constraint "child_cycle_progress_child_id_fkey";

alter table "public"."child_cycle_progress" add constraint "child_cycle_progress_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE CASCADE not valid;

alter table "public"."child_cycle_progress" validate constraint "child_cycle_progress_cycle_id_fkey";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_category_fkey" FOREIGN KEY (category) REFERENCES public.category_colors(id) ON DELETE SET NULL not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_category_fkey";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_child_id_fkey";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_default_pathway_id_fkey" FOREIGN KEY (default_pathway_id) REFERENCES public.pathways(id) ON DELETE SET NULL not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_default_pathway_id_fkey";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_frequency_chk" CHECK (((frequency IS NULL) OR (frequency = ANY (ARRAY['daily'::text, 'few_per_week'::text, 'weekly'::text, 'rare'::text])))) not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_frequency_chk";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_goal_text_len_chk" CHECK (((goal_text IS NULL) OR (char_length(goal_text) <= 120))) not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_goal_text_len_chk";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_intensity_chk" CHECK (((intensity IS NULL) OR (intensity = ANY (ARRAY['mild'::text, 'medium'::text, 'big'::text])))) not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_intensity_chk";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_super_skill_id_fkey";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_target_count_chk" CHECK (((array_length(target_category_ids, 1) >= 1) AND (array_length(target_category_ids, 1) <= 3))) not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_target_count_chk";

alter table "public"."child_modules" add constraint "child_modules_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_modules" validate constraint "child_modules_child_id_fkey";

alter table "public"."child_modules" add constraint "child_modules_child_id_module_id_key" UNIQUE using index "child_modules_child_id_module_id_key";

alter table "public"."child_modules" add constraint "child_modules_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) not valid;

alter table "public"."child_modules" validate constraint "child_modules_module_id_fkey";

alter table "public"."child_mood_checkins" add constraint "child_mood_checkins_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_mood_checkins" validate constraint "child_mood_checkins_child_id_fkey";

alter table "public"."child_mood_checkins" add constraint "child_mood_checkins_mood_score_check" CHECK (((mood_score >= 1) AND (mood_score <= 5))) not valid;

alter table "public"."child_mood_checkins" validate constraint "child_mood_checkins_mood_score_check";

alter table "public"."child_mood_checkins" add constraint "child_mood_checkins_parent_user_id_fkey" FOREIGN KEY (parent_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."child_mood_checkins" validate constraint "child_mood_checkins_parent_user_id_fkey";

alter table "public"."child_roadblock_completions" add constraint "child_roadblock_completions_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_roadblock_completions" validate constraint "child_roadblock_completions_child_id_fkey";

alter table "public"."child_roadblock_completions" add constraint "child_roadblock_completions_roadblock_id_fkey" FOREIGN KEY (roadblock_id) REFERENCES public.roadblocks(id) ON DELETE CASCADE not valid;

alter table "public"."child_roadblock_completions" validate constraint "child_roadblock_completions_roadblock_id_fkey";

alter table "public"."child_roadblock_completions" add constraint "unique_child_roadblock" UNIQUE using index "unique_child_roadblock";

alter table "public"."child_roadblocks" add constraint "child_roadblocks_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_roadblocks" validate constraint "child_roadblocks_child_id_fkey";

alter table "public"."child_roadblocks" add constraint "child_roadblocks_roadblock_id_fkey" FOREIGN KEY (roadblock_id) REFERENCES public.roadblocks(id) ON DELETE CASCADE not valid;

alter table "public"."child_roadblocks" validate constraint "child_roadblocks_roadblock_id_fkey";

alter table "public"."child_roadblocks" add constraint "child_roadblocks_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."child_roadblocks" validate constraint "child_roadblocks_super_skill_id_fkey";

alter table "public"."child_roadblocks" add constraint "child_roadblocks_triggered_by_module_id_fkey" FOREIGN KEY (triggered_by_module_id) REFERENCES public.modules(id) ON DELETE SET NULL not valid;

alter table "public"."child_roadblocks" validate constraint "child_roadblocks_triggered_by_module_id_fkey";

alter table "public"."child_super_skill_progress" add constraint "child_super_skill_progress_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_super_skill_progress" validate constraint "child_super_skill_progress_child_id_fkey";

alter table "public"."child_super_skill_progress" add constraint "child_super_skill_progress_child_id_super_skill_id_key" UNIQUE using index "child_super_skill_progress_child_id_super_skill_id_key";

alter table "public"."child_super_skill_progress" add constraint "child_super_skill_progress_current_cycle_id_fkey" FOREIGN KEY (current_cycle_id) REFERENCES public.cycles(id) ON DELETE SET NULL not valid;

alter table "public"."child_super_skill_progress" validate constraint "child_super_skill_progress_current_cycle_id_fkey";

alter table "public"."child_super_skill_progress" add constraint "child_super_skill_progress_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE CASCADE not valid;

alter table "public"."child_super_skill_progress" validate constraint "child_super_skill_progress_super_skill_id_fkey";

alter table "public"."children" add constraint "check_level_positive" CHECK ((level >= 1)) not valid;

alter table "public"."children" validate constraint "check_level_positive";

alter table "public"."children" add constraint "check_total_xp_non_negative" CHECK ((total_xp >= 0)) not valid;

alter table "public"."children" validate constraint "check_total_xp_non_negative";

alter table "public"."children" add constraint "children_password_check" CHECK ((length(password) > 6)) not valid;

alter table "public"."children" validate constraint "children_password_check";

alter table "public"."children" add constraint "children_spendable_stars_check" CHECK ((spendable_stars >= 0)) not valid;

alter table "public"."children" validate constraint "children_spendable_stars_check";

alter table "public"."core_theories" add constraint "core_theories_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) not valid;

alter table "public"."core_theories" validate constraint "core_theories_super_skill_id_fkey";

alter table "public"."core_theories" add constraint "core_theories_theory_code_key" UNIQUE using index "core_theories_theory_code_key";

alter table "public"."core_theories" add constraint "core_theories_theory_name_key" UNIQUE using index "core_theories_theory_name_key";

alter table "public"."cycles" add constraint "cycles_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE SET NULL not valid;

alter table "public"."cycles" validate constraint "cycles_badge_id_fkey";

alter table "public"."cycles" add constraint "cycles_super_skill_id_cycle_number_key" UNIQUE using index "cycles_super_skill_id_cycle_number_key";

alter table "public"."cycles" add constraint "cycles_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE CASCADE not valid;

alter table "public"."cycles" validate constraint "cycles_super_skill_id_fkey";

alter table "public"."daily_quest_completions" add constraint "daily_quest_completions_child_id_completed_date_key" UNIQUE using index "daily_quest_completions_child_id_completed_date_key";

alter table "public"."daily_quest_completions" add constraint "daily_quest_completions_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."daily_quest_completions" validate constraint "daily_quest_completions_child_id_fkey";

alter table "public"."diagnosis_profiles" add constraint "diagnosis_profiles_code_key" UNIQUE using index "diagnosis_profiles_code_key";

alter table "public"."diagnosis_profiles" add constraint "diagnosis_profiles_tier_check" CHECK (((tier)::text = ANY (ARRAY[('core'::character varying)::text, ('extended'::character varying)::text]))) not valid;

alter table "public"."diagnosis_profiles" validate constraint "diagnosis_profiles_tier_check";

alter table "public"."dss_sedi_categories" add constraint "dss_sedi_categories_sedi_code_key" UNIQUE using index "dss_sedi_categories_sedi_code_key";

alter table "public"."fasd_domains" add constraint "fasd_domains_domain_number_key" UNIQUE using index "fasd_domains_domain_number_key";

alter table "public"."focus_plan_categories" add constraint "focus_plan_categories_name_key" UNIQUE using index "focus_plan_categories_name_key";

alter table "public"."focus_plan_categories" add constraint "focus_plan_categories_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."focus_plan_categories" validate constraint "focus_plan_categories_super_skill_id_fkey";

alter table "public"."focus_plan_frequencies" add constraint "focus_plan_frequencies_value_key" UNIQUE using index "focus_plan_frequencies_value_key";

alter table "public"."focus_plan_goals" add constraint "focus_plan_goals_key_key" UNIQUE using index "focus_plan_goals_key_key";

alter table "public"."focus_plan_intensities" add constraint "focus_plan_intensities_value_key" UNIQUE using index "focus_plan_intensities_value_key";

alter table "public"."forbidden_terms" add constraint "forbidden_terms_term_type_check" CHECK ((term_type = ANY (ARRAY['word'::text, 'metaphor'::text]))) not valid;

alter table "public"."forbidden_terms" validate constraint "forbidden_terms_term_type_check";

alter table "public"."levels" add constraint "levels_level_key" UNIQUE using index "levels_level_key";

alter table "public"."login_streaks" add constraint "login_streaks_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."login_streaks" validate constraint "login_streaks_child_id_fkey";

alter table "public"."module_responses" add constraint "module_responses_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."module_responses" validate constraint "module_responses_child_id_fkey";

alter table "public"."module_responses" add constraint "module_responses_child_module_question_unique" UNIQUE using index "module_responses_child_module_question_unique";

alter table "public"."module_responses" add constraint "module_responses_child_module_unique" UNIQUE using index "module_responses_child_module_unique";

alter table "public"."module_responses" add constraint "module_responses_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."module_responses" validate constraint "module_responses_module_id_fkey";

alter table "public"."module_responses" add constraint "module_responses_parent_user_id_fkey" FOREIGN KEY (parent_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."module_responses" validate constraint "module_responses_parent_user_id_fkey";

alter table "public"."module_secondary_theories" add constraint "module_secondary_theories_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."module_secondary_theories" validate constraint "module_secondary_theories_module_id_fkey";

alter table "public"."module_secondary_theories" add constraint "module_secondary_theories_theory_id_fkey" FOREIGN KEY (theory_id) REFERENCES public.core_theories(id) ON DELETE CASCADE not valid;

alter table "public"."module_secondary_theories" validate constraint "module_secondary_theories_theory_id_fkey";

alter table "public"."module_secondary_theories" add constraint "module_secondary_theories_unique" UNIQUE using index "module_secondary_theories_unique";

alter table "public"."module_unlocks" add constraint "module_unlocks_credits_spent_check" CHECK ((credits_spent >= 0)) not valid;

alter table "public"."module_unlocks" validate constraint "module_unlocks_credits_spent_check";

alter table "public"."module_unlocks" add constraint "module_unlocks_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."module_unlocks" validate constraint "module_unlocks_module_id_fkey";

alter table "public"."module_unlocks" add constraint "module_unlocks_parent_id_module_id_period_start_period_end_key" UNIQUE using index "module_unlocks_parent_id_module_id_period_start_period_end_key";

alter table "public"."module_unlocks" add constraint "module_unlocks_unlock_source_check" CHECK ((unlock_source = ANY (ARRAY['subscription_credit'::text, 'manual_admin'::text, 'legacy_purchase'::text]))) not valid;

alter table "public"."module_unlocks" validate constraint "module_unlocks_unlock_source_check";

alter table "public"."module_variants" add constraint "module_variants_module_id_age_band_key" UNIQUE using index "module_variants_module_id_age_band_key";

alter table "public"."module_variants" add constraint "module_variants_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."module_variants" validate constraint "module_variants_module_id_fkey";

alter table "public"."modules" add constraint "modules_age_range_fkey" FOREIGN KEY (age_range) REFERENCES public.age_ranges(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."modules" validate constraint "modules_age_range_fkey";

alter table "public"."modules" add constraint "modules_bridge_from_module_id_fkey" FOREIGN KEY (bridge_from_module_id) REFERENCES public.modules(id) not valid;

alter table "public"."modules" validate constraint "modules_bridge_from_module_id_fkey";

alter table "public"."modules" add constraint "modules_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE SET NULL not valid;

alter table "public"."modules" validate constraint "modules_cycle_id_fkey";

alter table "public"."modules" add constraint "modules_dss_sedi_id_fkey" FOREIGN KEY (dss_sedi_id) REFERENCES public.dss_sedi_categories(id) not valid;

alter table "public"."modules" validate constraint "modules_dss_sedi_id_fkey";

alter table "public"."modules" add constraint "modules_ndis_domain_id_fkey" FOREIGN KEY (ndis_domain_id) REFERENCES public.ndis_domains(id) not valid;

alter table "public"."modules" validate constraint "modules_ndis_domain_id_fkey";

alter table "public"."modules" add constraint "modules_pathway_fkey" FOREIGN KEY (pathway) REFERENCES public.pathways(id) not valid;

alter table "public"."modules" validate constraint "modules_pathway_fkey";

alter table "public"."modules" add constraint "modules_primary_theory_id_fkey" FOREIGN KEY (primary_theory_id) REFERENCES public.core_theories(id) not valid;

alter table "public"."modules" validate constraint "modules_primary_theory_id_fkey";

alter table "public"."modules" add constraint "modules_sub_skill_id_fkey" FOREIGN KEY (sub_skill_id) REFERENCES public.sub_skills(id) ON DELETE SET NULL not valid;

alter table "public"."modules" validate constraint "modules_sub_skill_id_fkey";

alter table "public"."modules" add constraint "modules_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."modules" validate constraint "modules_super_skill_id_fkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_bridge_from_module_id_fkey" FOREIGN KEY (bridge_from_module_id) REFERENCES public.modules(id) not valid;

alter table "public"."modules_to_generate" validate constraint "modules_to_generate_bridge_from_module_id_fkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."modules_to_generate" validate constraint "modules_to_generate_created_by_fkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_dss_sedi_id_fkey" FOREIGN KEY (dss_sedi_id) REFERENCES public.dss_sedi_categories(id) not valid;

alter table "public"."modules_to_generate" validate constraint "modules_to_generate_dss_sedi_id_fkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_generated_module_id_fkey" FOREIGN KEY (generated_module_id) REFERENCES public.modules(id) not valid;

alter table "public"."modules_to_generate" validate constraint "modules_to_generate_generated_module_id_fkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_ndis_domain_id_fkey" FOREIGN KEY (ndis_domain_id) REFERENCES public.ndis_domains(id) not valid;

alter table "public"."modules_to_generate" validate constraint "modules_to_generate_ndis_domain_id_fkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_primary_theory_id_fkey" FOREIGN KEY (primary_theory_id) REFERENCES public.core_theories(id) not valid;

alter table "public"."modules_to_generate" validate constraint "modules_to_generate_primary_theory_id_fkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_sub_skill_id_fkey" FOREIGN KEY (sub_skill_id) REFERENCES public.sub_skills(id) not valid;

alter table "public"."modules_to_generate" validate constraint "modules_to_generate_sub_skill_id_fkey";

alter table "public"."modules_to_generate" add constraint "modules_to_generate_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) not valid;

alter table "public"."modules_to_generate" validate constraint "modules_to_generate_super_skill_id_fkey";

alter table "public"."ndis_domains" add constraint "ndis_domains_domain_name_key" UNIQUE using index "ndis_domains_domain_name_key";

alter table "public"."parent_modules" add constraint "parent_modules_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."parent_modules" validate constraint "parent_modules_module_id_fkey";

alter table "public"."parent_modules" add constraint "parent_modules_parent_id_module_id_key" UNIQUE using index "parent_modules_parent_id_module_id_key";

alter table "public"."parent_subscriptions" add constraint "parent_subscriptions_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."parent_subscriptions" validate constraint "parent_subscriptions_parent_id_fkey";

alter table "public"."parent_subscriptions" add constraint "parent_subscriptions_status_check" CHECK ((status = ANY (ARRAY['inactive'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'paused'::text, 'trialing'::text]))) not valid;

alter table "public"."parent_subscriptions" validate constraint "parent_subscriptions_status_check";

alter table "public"."parent_subscriptions" add constraint "parent_subscriptions_tier_fkey" FOREIGN KEY (tier) REFERENCES public.subscription_tiers(tier) not valid;

alter table "public"."parent_subscriptions" validate constraint "parent_subscriptions_tier_fkey";

alter table "public"."pathway_assessments" add constraint "pathway_assessments_assessment_type_check" CHECK ((assessment_type = ANY (ARRAY['baseline'::text, 'midpoint'::text, 'endpoint'::text, 'checkin'::text, 'check_in'::text]))) not valid;

alter table "public"."pathway_assessments" validate constraint "pathway_assessments_assessment_type_check";

alter table "public"."pathway_assessments" add constraint "pathway_assessments_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."pathway_assessments" validate constraint "pathway_assessments_child_id_fkey";

alter table "public"."pathway_assessments" add constraint "pathway_assessments_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE SET NULL not valid;

alter table "public"."pathway_assessments" validate constraint "pathway_assessments_module_id_fkey";

alter table "public"."pathways" add constraint "pathways_category_fkey" FOREIGN KEY (category) REFERENCES public.category_colors(category) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."pathways" validate constraint "pathways_category_fkey";

alter table "public"."pathways" add constraint "pathways_name_key" UNIQUE using index "pathways_name_key";

alter table "public"."reward_purchases" add constraint "reward_purchases_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) not valid;

alter table "public"."reward_purchases" validate constraint "reward_purchases_approved_by_fkey";

alter table "public"."reward_purchases" add constraint "reward_purchases_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."reward_purchases" validate constraint "reward_purchases_child_id_fkey";

alter table "public"."reward_purchases" add constraint "reward_purchases_reward_id_fkey" FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE SET NULL not valid;

alter table "public"."reward_purchases" validate constraint "reward_purchases_reward_id_fkey";

alter table "public"."rewards" add constraint "rewards_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."rewards" validate constraint "rewards_child_id_fkey";

alter table "public"."rewards" add constraint "rewards_star_cost_check" CHECK ((star_cost > 0)) not valid;

alter table "public"."rewards" validate constraint "rewards_star_cost_check";

alter table "public"."rewards" add constraint "unique_baseline_title" UNIQUE using index "unique_baseline_title";

alter table "public"."series" add constraint "series_label_key" UNIQUE using index "series_label_key";

alter table "public"."sub_skills" add constraint "sub_skills_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE CASCADE not valid;

alter table "public"."sub_skills" validate constraint "sub_skills_super_skill_id_fkey";

alter table "public"."sub_skills" add constraint "sub_skills_super_skill_id_slug_key" UNIQUE using index "sub_skills_super_skill_id_slug_key";

alter table "public"."subscription_credit_ledger" add constraint "subscription_credit_ledger_check" CHECK ((period_end >= period_start)) not valid;

alter table "public"."subscription_credit_ledger" validate constraint "subscription_credit_ledger_check";

alter table "public"."subscription_credit_ledger" add constraint "subscription_credit_ledger_entry_type_check" CHECK ((entry_type = ANY (ARRAY['grant'::text, 'adjustment'::text, 'spend'::text, 'refund'::text, 'expire'::text]))) not valid;

alter table "public"."subscription_credit_ledger" validate constraint "subscription_credit_ledger_entry_type_check";

alter table "public"."subscription_credit_ledger" add constraint "subscription_credit_ledger_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE SET NULL not valid;

alter table "public"."subscription_credit_ledger" validate constraint "subscription_credit_ledger_module_id_fkey";

alter table "public"."subscription_tiers" add constraint "subscription_tiers_modules_per_month_check" CHECK ((modules_per_month > 0)) not valid;

alter table "public"."subscription_tiers" validate constraint "subscription_tiers_modules_per_month_check";

alter table "public"."subscription_tiers" add constraint "subscription_tiers_tier_check" CHECK ((tier = ANY (ARRAY['low'::text, 'mid'::text, 'top'::text]))) not valid;

alter table "public"."subscription_tiers" validate constraint "subscription_tiers_tier_check";

alter table "public"."super_skills" add constraint "super_skills_character_id_fkey" FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE SET NULL not valid;

alter table "public"."super_skills" validate constraint "super_skills_character_id_fkey";

alter table "public"."super_skills" add constraint "super_skills_name_key" UNIQUE using index "super_skills_name_key";

alter table "public"."super_skills" add constraint "super_skills_slug_key" UNIQUE using index "super_skills_slug_key";

alter table "public"."theory_connections" add constraint "theory_connections_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE CASCADE not valid;

alter table "public"."theory_connections" validate constraint "theory_connections_cycle_id_fkey";

alter table "public"."theory_connections" add constraint "theory_connections_primary_theory_id_fkey" FOREIGN KEY (primary_theory_id) REFERENCES public.core_theories(id) ON DELETE CASCADE not valid;

alter table "public"."theory_connections" validate constraint "theory_connections_primary_theory_id_fkey";

alter table "public"."theory_connections" add constraint "theory_connections_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE CASCADE not valid;

alter table "public"."theory_connections" validate constraint "theory_connections_super_skill_id_fkey";

alter table "public"."theory_connections" add constraint "theory_connections_unique" UNIQUE using index "theory_connections_unique";

alter table "public"."weekly_checkins" add constraint "weekly_checkins_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."weekly_checkins" validate constraint "weekly_checkins_child_id_fkey";

alter table "public"."weekly_checkins" add constraint "weekly_checkins_intensity_check" CHECK (((intensity >= 1) AND (intensity <= 5))) not valid;

alter table "public"."weekly_checkins" validate constraint "weekly_checkins_intensity_check";

alter table "public"."weekly_checkins" add constraint "weekly_checkins_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE SET NULL not valid;

alter table "public"."weekly_checkins" validate constraint "weekly_checkins_module_id_fkey";

alter table "public"."weekly_checkins" add constraint "weekly_checkins_sub_skill_id_fkey" FOREIGN KEY (sub_skill_id) REFERENCES public.sub_skills(id) ON DELETE SET NULL not valid;

alter table "public"."weekly_checkins" validate constraint "weekly_checkins_sub_skill_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.activate_super_skill_for_child(p_child_id uuid, p_super_skill_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE child_super_skill_progress
    SET status = 'active',
        started_at = COALESCE(started_at, NOW()),
        current_cycle_id = COALESCE(current_cycle_id, 
            (SELECT id FROM cycles WHERE super_skill_id = p_super_skill_id AND cycle_number = 1))
    WHERE child_id = p_child_id
    AND super_skill_id = p_super_skill_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_module_to_all_parents()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert the new module for all existing parents
  INSERT INTO public.parent_modules (parent_id, module_id, is_active)
  SELECT id, NEW.id, false
  FROM public.parent_profiles
  ON CONFLICT (parent_id, module_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_modules_to_new_parent()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  insert into parent_modules (parent_id, module_id, is_active, purchased_at, created_at)
  select new.id, m.id, false, null, now()
  from modules m;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.award_stars_with_spendable(p_child_id uuid, p_stars integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_new_total INTEGER;
    v_new_spendable INTEGER;
BEGIN
    -- Update both stars and spendable_stars
    UPDATE children 
    SET 
        stars = stars + p_stars,
        spendable_stars = spendable_stars + p_stars
    WHERE id = p_child_id
    RETURNING stars, spendable_stars INTO v_new_total, v_new_spendable;

    RETURN json_build_object(
        'success', true,
        'total_stars', v_new_total,
        'spendable_stars', v_new_spendable
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.award_xp_to_child(p_child_id uuid, p_xp_amount integer)
 RETURNS TABLE(new_total_xp integer, new_level integer, leveled_up boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
    old_level INTEGER;
    new_lvl INTEGER;
    new_xp INTEGER;
BEGIN
    -- Get current level
    SELECT COALESCE(level, 1) INTO old_level FROM children WHERE id = p_child_id;
    
    -- Update XP
    UPDATE children 
    SET total_xp = COALESCE(total_xp, 0) + p_xp_amount
    WHERE id = p_child_id
    RETURNING total_xp INTO new_xp;
    
    -- Calculate new level
    new_lvl := calculate_level(new_xp);
    
    -- Update level
    UPDATE children
    SET level = new_lvl
    WHERE id = p_child_id;
    
    RETURN QUERY SELECT new_xp, new_lvl, (new_lvl > old_level);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_level(xp integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    k INTEGER := 100;
BEGIN
    RETURN GREATEST(1, FLOOR((SQRT(1 + 8.0 * xp / k) - 1) / 2)::INTEGER);
END;
$function$
;

create or replace view "public"."child_modules_with_names" as  SELECT cm.id,
    cm.created_at,
    cm.child_id,
    cm.module_id,
    cm.status,
    cm.is_completed,
    cm.completed_at,
    cm.is_active,
    c.name AS child_name,
    m.title AS module_name,
    m.code AS module_code,
    m.category AS module_category,
    m.series AS module_series
   FROM ((public.child_modules cm
     LEFT JOIN public.children c ON ((cm.child_id = c.id)))
     LEFT JOIN public.modules m ON ((cm.module_id = m.id)))
  ORDER BY cm.created_at DESC;


CREATE OR REPLACE FUNCTION public.create_parent_profile(user_id uuid, user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.parent_profiles (id, username)
  VALUES (user_id, user_email)
  ON CONFLICT (id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_parent_profile_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.parent_profiles (id, username, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, '')::text,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$function$
;

create or replace view "public"."daily_quest_status" as  SELECT c.id AS child_id,
    c.name AS child_name,
    dqc.quest_id,
    dqc.completed_at,
        CASE
            WHEN (dqc.id IS NOT NULL) THEN true
            ELSE false
        END AS completed_today
   FROM (public.children c
     LEFT JOIN public.daily_quest_completions dqc ON (((c.id = dqc.child_id) AND (dqc.completed_date = CURRENT_DATE))));


CREATE OR REPLACE FUNCTION public.ensure_admin_exists()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if any admin exists, if not, you can manually set one here
  -- For example, to set a specific user as admin:
  -- UPDATE parent_profiles SET is_admin = true WHERE id = 'your-user-id-here';
  
  -- For now, just ensure the table structure is correct
  NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_module_theories(p_module_id uuid)
 RETURNS TABLE(theory_type text, theory_name text, theory_code text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    -- Primary theory
    SELECT 
        'primary'::text as theory_type,
        ct.theory_name,
        ct.theory_code
    FROM public.modules m
    JOIN public.core_theories ct ON m.primary_theory_id = ct.id
    WHERE m.id = p_module_id
    
    UNION ALL
    
    -- Secondary theories
    SELECT 
        'secondary'::text as theory_type,
        ct.theory_name,
        ct.theory_code
    FROM public.module_secondary_theories mst
    JOIN public.core_theories ct ON mst.theory_id = ct.id
    WHERE mst.module_id = p_module_id
    ORDER BY theory_type DESC, sort_order;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_quest_stats(child_id_param uuid)
 RETURNS TABLE(total_completions bigint, current_streak integer, last_completion date)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_completions,
        (
            SELECT COUNT(*)::INTEGER
            FROM (
                SELECT completed_date
                FROM daily_quest_completions
                WHERE child_id = child_id_param
                AND completed_date >= CURRENT_DATE - INTERVAL '30 days'
                ORDER BY completed_date DESC
            ) AS recent
            WHERE completed_date >= CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY completed_date DESC) - 1)::INTEGER
        ) AS current_streak,
        MAX(completed_date) AS last_completion
    FROM daily_quest_completions
    WHERE child_id = child_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.parent_profiles (
    id,
    username,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    now(),
    now()
  )
  on conflict (id) do update
  set username = excluded.username,
      updated_at = now();

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_child_rewards(p_child_id uuid, p_stars integer DEFAULT 0, p_xp integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
  v_new_stars integer;
  v_new_xp integer;
BEGIN
  -- Update the child's stars and XP
  UPDATE public.children
  SET 
    total_stars = COALESCE(total_stars, 0) + p_stars,
    total_xp = COALESCE(total_xp, 0) + p_xp,
    updated_at = now()
  WHERE id = p_child_id
  RETURNING total_stars, total_xp INTO v_new_stars, v_new_xp;
  
  -- Return the new totals
  v_result := json_build_object(
    'success', true,
    'total_stars', v_new_stars,
    'total_xp', v_new_xp,
    'stars_added', p_stars,
    'xp_added', p_xp
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_child_stars(child_id_param uuid, amount integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE children 
    SET total_stars = COALESCE(total_stars, 0) + amount,
        updated_at = NOW()
    WHERE id = child_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.initialize_child_super_skills(p_child_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insert progress records for all super skills (default to locked)
    INSERT INTO child_super_skill_progress (child_id, super_skill_id, status)
    SELECT p_child_id, id, 'locked'
    FROM super_skills
    WHERE is_active = true
    ON CONFLICT (child_id, super_skill_id) DO NOTHING;
    
    -- Activate the first super skill by default
    UPDATE child_super_skill_progress
    SET status = 'active', started_at = NOW()
    WHERE child_id = p_child_id
    AND super_skill_id = (SELECT id FROM super_skills WHERE sort_order = 1 LIMIT 1)
    AND status = 'locked';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_sub_skill(p_name text, p_super_skill_id uuid, p_description text DEFAULT ''::text, p_is_active boolean DEFAULT true)
 RETURNS public.sub_skills
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_result sub_skills;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM parent_profiles
  WHERE id = v_user_id;
  
  -- Only allow admins to insert
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can insert sub-skills';
  END IF;
  
  -- Insert the sub-skill
  INSERT INTO sub_skills (name, super_skill_id, description, is_active, slug)
  VALUES (p_name, p_super_skill_id, p_description, p_is_active, LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]+', '-', 'g')))
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_sys_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select p.is_admin from public.parent_profiles p where p.id = auth.uid()),
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_admin_check(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (SELECT is_admin FROM parent_profiles WHERE id = user_id LIMIT 1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_admin_module_check()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (SELECT is_admin FROM parent_profiles WHERE id = auth.uid() LIMIT 1) = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.maybe_spawn_roadblock(p_child_id uuid, p_super_skill_id uuid, p_triggered_by_module_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    config RECORD;
    should_spawn BOOLEAN := false;
    selected_roadblock_id UUID;
BEGIN
    -- Get config
    SELECT * INTO config FROM roadblock_config WHERE is_active = true LIMIT 1;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Check if already has an active roadblock
    IF EXISTS (
        SELECT 1 FROM child_roadblocks
        WHERE child_id = p_child_id
        AND status = 'spawned'
    ) THEN
        RETURN NULL;
    END IF;
    
    -- Random chance to spawn
    IF random() < config.spawn_chance THEN
        should_spawn := true;
    END IF;
    
    IF should_spawn THEN
        -- Select a random roadblock
        SELECT id INTO selected_roadblock_id
        FROM roadblocks
        WHERE is_active = true
        AND (p_super_skill_id = ANY(tagged_super_skill_ids) OR array_length(tagged_super_skill_ids, 1) IS NULL)
        ORDER BY random()
        LIMIT 1;
        
        IF selected_roadblock_id IS NOT NULL THEN
            INSERT INTO child_roadblocks (child_id, roadblock_id, status, triggered_by_module_id, super_skill_id)
            VALUES (p_child_id, selected_roadblock_id, 'spawned', p_triggered_by_module_id, p_super_skill_id);
            
            RETURN selected_roadblock_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$function$
;

create or replace view "public"."module_response_analytics" as  SELECT mr.id,
    mr.child_id,
    c.name AS child_name,
    mr.module_id,
    m.code AS module_code,
    m.title AS module_title,
    mr.question_id,
    mr.question_text,
    mr.response_type,
    mr.response_value,
    mr.response_options,
    mr.selected_option,
    mr.page_number,
    mr.question_order,
    mr.response_time_ms,
    mr.is_correct,
    mr.created_at,
    mr.updated_at,
    count(*) OVER (PARTITION BY mr.child_id, mr.module_id) AS total_responses,
    count(
        CASE
            WHEN (mr.is_correct = true) THEN 1
            ELSE NULL::integer
        END) OVER (PARTITION BY mr.child_id, mr.module_id) AS correct_count
   FROM ((public.module_responses mr
     LEFT JOIN public.children c ON ((c.id = mr.child_id)))
     LEFT JOIN public.modules m ON ((m.id = mr.module_id)))
  ORDER BY mr.created_at DESC;


create or replace view "public"."module_theory_view" as  SELECT m.id,
    m.code,
    m.title,
    pt.theory_name AS primary_theory_name,
    pt.theory_code AS primary_theory_code,
    array_agg(st.theory_name ORDER BY mst.sort_order) FILTER (WHERE (st.id IS NOT NULL)) AS secondary_theories,
    nd.domain_name AS ndis_domain,
    ds.sedi_name AS dss_sedi,
    m.neuroscience_concept,
    m.brain_town_metaphor
   FROM (((((public.modules m
     LEFT JOIN public.core_theories pt ON ((m.primary_theory_id = pt.id)))
     LEFT JOIN public.module_secondary_theories mst ON ((m.id = mst.module_id)))
     LEFT JOIN public.core_theories st ON ((mst.theory_id = st.id)))
     LEFT JOIN public.ndis_domains nd ON ((m.ndis_domain_id = nd.id)))
     LEFT JOIN public.dss_sedi_categories ds ON ((m.dss_sedi_id = ds.id)))
  GROUP BY m.id, pt.theory_name, pt.theory_code, nd.domain_name, ds.sedi_name;


CREATE OR REPLACE FUNCTION public.owns_child(p_child_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.children c
    where c.id = p_child_id
      and c.parent_user_id = auth.uid()
  );
$function$
;

create or replace view "public"."pathway_progress_summary" as  SELECT child_id,
    pathway_category,
    max(
        CASE
            WHEN (assessment_type = 'baseline'::text) THEN total_score
            ELSE NULL::integer
        END) AS baseline_score,
    max(
        CASE
            WHEN (assessment_type = 'baseline'::text) THEN efficacy_score
            ELSE NULL::numeric
        END) AS baseline_efficacy,
    max(
        CASE
            WHEN (assessment_type = 'baseline'::text) THEN created_at
            ELSE NULL::timestamp with time zone
        END) AS baseline_date,
    max(
        CASE
            WHEN (assessment_type = 'midpoint'::text) THEN total_score
            ELSE NULL::integer
        END) AS midpoint_score,
    max(
        CASE
            WHEN (assessment_type = 'midpoint'::text) THEN efficacy_score
            ELSE NULL::numeric
        END) AS midpoint_efficacy,
    max(
        CASE
            WHEN (assessment_type = 'midpoint'::text) THEN created_at
            ELSE NULL::timestamp with time zone
        END) AS midpoint_date,
    max(
        CASE
            WHEN (assessment_type = 'endpoint'::text) THEN total_score
            ELSE NULL::integer
        END) AS endpoint_score,
    max(
        CASE
            WHEN (assessment_type = 'endpoint'::text) THEN efficacy_score
            ELSE NULL::numeric
        END) AS endpoint_efficacy,
    max(
        CASE
            WHEN (assessment_type = 'endpoint'::text) THEN created_at
            ELSE NULL::timestamp with time zone
        END) AS endpoint_date,
    (max(
        CASE
            WHEN (assessment_type = 'endpoint'::text) THEN total_score
            ELSE NULL::integer
        END) - max(
        CASE
            WHEN (assessment_type = 'baseline'::text) THEN total_score
            ELSE NULL::integer
        END)) AS total_change,
    count(*) AS assessment_count,
        CASE
            WHEN (max(
            CASE
                WHEN (assessment_type = 'endpoint'::text) THEN 1
                ELSE 0
            END) = 1) THEN 'completed'::text
            WHEN (max(
            CASE
                WHEN (assessment_type = 'midpoint'::text) THEN 1
                ELSE 0
            END) = 1) THEN 'in_progress'::text
            WHEN (max(
            CASE
                WHEN (assessment_type = 'baseline'::text) THEN 1
                ELSE 0
            END) = 1) THEN 'started'::text
            ELSE 'not_started'::text
        END AS journey_status
   FROM public.pathway_assessments
  GROUP BY child_id, pathway_category;


CREATE OR REPLACE FUNCTION public.propagate_child_name_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update public.child_modules
  set child_name = new.name
  where child_id = new.id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.purchase_reward(p_child_id uuid, p_reward_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_child RECORD;
    v_reward RECORD;
    v_purchase_id UUID;
BEGIN
    -- Get child info
    SELECT * INTO v_child FROM children WHERE id = p_child_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Child not found';
    END IF;

    -- Get reward info
    SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reward not found or inactive';
    END IF;

    -- Check if child has enough spendable stars
    IF v_child.spendable_stars < v_reward.star_cost THEN
        RAISE EXCEPTION 'Not enough spendable stars';
    END IF;

    -- Deduct stars from child
    UPDATE children 
    SET spendable_stars = spendable_stars - v_reward.star_cost
    WHERE id = p_child_id;

    -- Create purchase record
    INSERT INTO reward_purchases (
        child_id,
        reward_id,
        reward_title,
        reward_description,
        star_cost,
        status
    ) VALUES (
        p_child_id,
        p_reward_id,
        v_reward.title,
        v_reward.description,
        v_reward.star_cost,
        'pending'
    ) RETURNING id INTO v_purchase_id;

    -- Return success with purchase details
    RETURN json_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'remaining_stars', v_child.spendable_stars - v_reward.star_cost
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_child_password_secure(p_child_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent_user_id uuid;
  v_hash text;
begin
  select parent_user_id into v_parent_user_id
  from public.children
  where id = p_child_id;

  if v_parent_user_id is null then
    raise exception 'Child not found';
  end if;

  if auth.uid() is null or auth.uid() <> v_parent_user_id then
    raise exception 'Unauthorized child access';
  end if;

  if p_password is null then
    update public.children set password = null where id = p_child_id;
    return true;
  end if;

  if char_length(p_password) < 3 then
    raise exception 'Password too short';
  end if;

  v_hash := crypt(p_password, gen_salt('bf'));

  update public.children
  set password = v_hash
  where id = p_child_id;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_username_from_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NEW.username IS NULL THEN
        NEW.username := SPLIT_PART(
            (SELECT email FROM auth.users WHERE id = NEW.id),
            '@',
            1
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_child_module_child_name()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  select name
  into new.child_name
  from public.children
  where id = new.child_id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_child_module_title()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  select title
  into new.module_title
  from public.modules
  where id = new.module_id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.unlock_module_with_credit(p_module_id uuid, p_period_start date DEFAULT (date_trunc('month'::text, now()))::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent_id uuid := auth.uid();
  v_period_start date := p_period_start;
  v_period_end date := (p_period_start + interval '1 month' - interval '1 day')::date;
  v_available integer;
  v_unlock_id bigint;
begin
  if v_parent_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1
    from public.module_unlocks mu
    where mu.parent_id = v_parent_id
      and mu.module_id = p_module_id
      and mu.is_active = true
      and mu.period_start = v_period_start
      and mu.period_end = v_period_end
  ) then
    return jsonb_build_object(
      'ok', true,
      'already_unlocked', true,
      'module_id', p_module_id,
      'period_start', v_period_start,
      'period_end', v_period_end
    );
  end if;

  select coalesce(sum(credits_delta), 0)
    into v_available
  from public.subscription_credit_ledger
  where parent_id = v_parent_id
    and period_start = v_period_start
    and period_end = v_period_end;

  if v_available < 1 then
    raise exception 'Not enough credits available for this period';
  end if;

  insert into public.module_unlocks (
    parent_id,
    module_id,
    unlock_source,
    credits_spent,
    period_start,
    period_end,
    is_active
  ) values (
    v_parent_id,
    p_module_id,
    'subscription_credit',
    1,
    v_period_start,
    v_period_end,
    true
  ) returning id into v_unlock_id;

  insert into public.subscription_credit_ledger (
    parent_id,
    period_start,
    period_end,
    entry_type,
    credits_delta,
    module_id,
    notes,
    created_by
  ) values (
    v_parent_id,
    v_period_start,
    v_period_end,
    'spend',
    -1,
    p_module_id,
    'Module unlock via credit spend',
    v_parent_id
  );

  return jsonb_build_object(
    'ok', true,
    'already_unlocked', false,
    'unlock_id', v_unlock_id,
    'module_id', p_module_id,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_age_ranges_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_audit_rules_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_audit_sections_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_category_colors_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_core_theories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_forbidden_terms_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_module_response_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_module_responses_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_modules_to_generate_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_pathway_assessments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_spendable_stars()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.spendable_stars = NEW.stars - COALESCE(NEW.spent_stars, 0);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

create or replace view "public"."v_parent_credit_summary" as  SELECT parent_id,
    period_start,
    period_end,
    COALESCE(sum(
        CASE
            WHEN (credits_delta > 0) THEN credits_delta
            ELSE 0
        END), (0)::bigint) AS credits_granted,
    abs(COALESCE(sum(
        CASE
            WHEN (credits_delta < 0) THEN credits_delta
            ELSE 0
        END), (0)::bigint)) AS credits_used,
    COALESCE(sum(credits_delta), (0)::bigint) AS credits_available
   FROM public.subscription_credit_ledger l
  GROUP BY parent_id, period_start, period_end;


CREATE OR REPLACE FUNCTION public.validate_secondary_theory_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF (
        SELECT COUNT(*) 
        FROM public.module_secondary_theories 
        WHERE module_id = NEW.module_id
    ) >= 3 THEN
        RAISE EXCEPTION 'Maximum of 3 secondary theories allowed per module';
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_target_categories_exist()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  missing_count int;
begin
  select count(*) into missing_count
  from unnest(new.target_category_ids) as cid
  left join public.category c on c.id = cid
  where c.id is null;

  if missing_count > 0 then
    raise exception 'One or more target_category_ids do not exist in category table';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_child_password_secure(p_child_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent_user_id uuid;
  v_hash text;
begin
  select parent_user_id, password into v_parent_user_id, v_hash
  from public.children
  where id = p_child_id;

  if v_parent_user_id is null then
    return false;
  end if;

  if auth.uid() is null or auth.uid() <> v_parent_user_id then
    raise exception 'Unauthorized child access';
  end if;

  if v_hash is null then
    return false;
  end if;

  return v_hash = crypt(p_password, v_hash);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.xp_for_next_level(current_level integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    k INTEGER := 100;
BEGIN
    RETURN (k * (current_level + 1) * (current_level + 2) / 2)::INTEGER;
END;
$function$
;

create or replace view "public"."v_child_dashboard" as  SELECT id AS child_id,
    name AS child_name,
    COALESCE(total_xp, 0) AS total_xp,
    COALESCE(level, 1) AS level,
    (public.xp_for_next_level(COALESCE(level, 1)) - COALESCE(total_xp, 0)) AS xp_to_next_level,
    COALESCE(stars, (0)::numeric) AS stars,
    COALESCE(spendable_stars, 0) AS spendable_stars,
    ( SELECT json_agg(json_build_object('super_skill_id', ss.id, 'name', ss.name, 'slug', ss.slug, 'emoji', ss.emoji, 'theme_color', ss.theme_color, 'character_name', ss.character_name, 'status', COALESCE(csp.status, 'locked'::text), 'current_week', COALESCE(csp.current_week, 0), 'total_xp_in_skill', COALESCE(csp.total_xp_in_skill, 0)) ORDER BY ss.sort_order) AS json_agg
           FROM (public.super_skills ss
             LEFT JOIN public.child_super_skill_progress csp ON (((csp.super_skill_id = ss.id) AND (csp.child_id = c.id))))
          WHERE (ss.is_active = true)) AS super_skills,
    ( SELECT json_agg(json_build_object('badge_id', b.id, 'name', b.name, 'slug', b.slug, 'earned_at', cb.earned_at)) AS json_agg
           FROM (public.child_badges cb
             JOIN public.badges b ON ((b.id = cb.badge_id)))
          WHERE (cb.child_id = c.id)) AS earned_badges
   FROM public.children c;


grant delete on table "public"."age_ranges" to "anon";

grant insert on table "public"."age_ranges" to "anon";

grant select on table "public"."age_ranges" to "anon";

grant update on table "public"."age_ranges" to "anon";

grant delete on table "public"."age_ranges" to "authenticated";

grant insert on table "public"."age_ranges" to "authenticated";

grant select on table "public"."age_ranges" to "authenticated";

grant update on table "public"."age_ranges" to "authenticated";

grant select on table "public"."age_ranges" to "service_role";

grant delete on table "public"."ai_generation_jobs" to "anon";

grant insert on table "public"."ai_generation_jobs" to "anon";

grant select on table "public"."ai_generation_jobs" to "anon";

grant update on table "public"."ai_generation_jobs" to "anon";

grant delete on table "public"."ai_generation_jobs" to "authenticated";

grant insert on table "public"."ai_generation_jobs" to "authenticated";

grant select on table "public"."ai_generation_jobs" to "authenticated";

grant update on table "public"."ai_generation_jobs" to "authenticated";

grant insert on table "public"."ai_generation_jobs" to "service_role";

grant select on table "public"."ai_generation_jobs" to "service_role";

grant update on table "public"."ai_generation_jobs" to "service_role";

grant delete on table "public"."ai_module_config" to "anon";

grant insert on table "public"."ai_module_config" to "anon";

grant select on table "public"."ai_module_config" to "anon";

grant update on table "public"."ai_module_config" to "anon";

grant delete on table "public"."ai_module_config" to "authenticated";

grant insert on table "public"."ai_module_config" to "authenticated";

grant select on table "public"."ai_module_config" to "authenticated";

grant update on table "public"."ai_module_config" to "authenticated";

grant select on table "public"."ai_module_config" to "service_role";

grant delete on table "public"."assessment_questions" to "anon";

grant insert on table "public"."assessment_questions" to "anon";

grant select on table "public"."assessment_questions" to "anon";

grant update on table "public"."assessment_questions" to "anon";

grant delete on table "public"."assessment_questions" to "authenticated";

grant insert on table "public"."assessment_questions" to "authenticated";

grant select on table "public"."assessment_questions" to "authenticated";

grant update on table "public"."assessment_questions" to "authenticated";

grant select on table "public"."assessment_questions" to "service_role";

grant delete on table "public"."audit_criteria" to "anon";

grant insert on table "public"."audit_criteria" to "anon";

grant select on table "public"."audit_criteria" to "anon";

grant update on table "public"."audit_criteria" to "anon";

grant delete on table "public"."audit_criteria" to "authenticated";

grant insert on table "public"."audit_criteria" to "authenticated";

grant select on table "public"."audit_criteria" to "authenticated";

grant update on table "public"."audit_criteria" to "authenticated";

grant delete on table "public"."audit_rules" to "anon";

grant insert on table "public"."audit_rules" to "anon";

grant select on table "public"."audit_rules" to "anon";

grant update on table "public"."audit_rules" to "anon";

grant delete on table "public"."audit_rules" to "authenticated";

grant insert on table "public"."audit_rules" to "authenticated";

grant select on table "public"."audit_rules" to "authenticated";

grant update on table "public"."audit_rules" to "authenticated";

grant delete on table "public"."audit_sections" to "anon";

grant insert on table "public"."audit_sections" to "anon";

grant select on table "public"."audit_sections" to "anon";

grant update on table "public"."audit_sections" to "anon";

grant delete on table "public"."audit_sections" to "authenticated";

grant insert on table "public"."audit_sections" to "authenticated";

grant select on table "public"."audit_sections" to "authenticated";

grant update on table "public"."audit_sections" to "authenticated";

grant delete on table "public"."badges" to "anon";

grant insert on table "public"."badges" to "anon";

grant select on table "public"."badges" to "anon";

grant update on table "public"."badges" to "anon";

grant delete on table "public"."badges" to "authenticated";

grant insert on table "public"."badges" to "authenticated";

grant select on table "public"."badges" to "authenticated";

grant update on table "public"."badges" to "authenticated";

grant select on table "public"."badges" to "service_role";

grant delete on table "public"."brain_town_vocabulary" to "anon";

grant insert on table "public"."brain_town_vocabulary" to "anon";

grant select on table "public"."brain_town_vocabulary" to "anon";

grant update on table "public"."brain_town_vocabulary" to "anon";

grant delete on table "public"."brain_town_vocabulary" to "authenticated";

grant insert on table "public"."brain_town_vocabulary" to "authenticated";

grant select on table "public"."brain_town_vocabulary" to "authenticated";

grant update on table "public"."brain_town_vocabulary" to "authenticated";

grant delete on table "public"."category_colors" to "anon";

grant insert on table "public"."category_colors" to "anon";

grant select on table "public"."category_colors" to "anon";

grant update on table "public"."category_colors" to "anon";

grant delete on table "public"."category_colors" to "authenticated";

grant insert on table "public"."category_colors" to "authenticated";

grant select on table "public"."category_colors" to "authenticated";

grant update on table "public"."category_colors" to "authenticated";

grant select on table "public"."category_colors" to "service_role";

grant delete on table "public"."characters" to "anon";

grant insert on table "public"."characters" to "anon";

grant select on table "public"."characters" to "anon";

grant update on table "public"."characters" to "anon";

grant delete on table "public"."characters" to "authenticated";

grant insert on table "public"."characters" to "authenticated";

grant select on table "public"."characters" to "authenticated";

grant update on table "public"."characters" to "authenticated";

grant delete on table "public"."checkin_challenges" to "anon";

grant insert on table "public"."checkin_challenges" to "anon";

grant select on table "public"."checkin_challenges" to "anon";

grant update on table "public"."checkin_challenges" to "anon";

grant delete on table "public"."checkin_challenges" to "authenticated";

grant insert on table "public"."checkin_challenges" to "authenticated";

grant select on table "public"."checkin_challenges" to "authenticated";

grant update on table "public"."checkin_challenges" to "authenticated";

grant select on table "public"."checkin_challenges" to "service_role";

grant delete on table "public"."checkin_goals" to "anon";

grant insert on table "public"."checkin_goals" to "anon";

grant select on table "public"."checkin_goals" to "anon";

grant update on table "public"."checkin_goals" to "anon";

grant delete on table "public"."checkin_goals" to "authenticated";

grant insert on table "public"."checkin_goals" to "authenticated";

grant select on table "public"."checkin_goals" to "authenticated";

grant update on table "public"."checkin_goals" to "authenticated";

grant select on table "public"."checkin_goals" to "service_role";

grant delete on table "public"."checkin_triggers" to "anon";

grant insert on table "public"."checkin_triggers" to "anon";

grant select on table "public"."checkin_triggers" to "anon";

grant update on table "public"."checkin_triggers" to "anon";

grant delete on table "public"."checkin_triggers" to "authenticated";

grant insert on table "public"."checkin_triggers" to "authenticated";

grant select on table "public"."checkin_triggers" to "authenticated";

grant update on table "public"."checkin_triggers" to "authenticated";

grant select on table "public"."checkin_triggers" to "service_role";

grant delete on table "public"."child_badges" to "anon";

grant insert on table "public"."child_badges" to "anon";

grant select on table "public"."child_badges" to "anon";

grant update on table "public"."child_badges" to "anon";

grant delete on table "public"."child_badges" to "authenticated";

grant insert on table "public"."child_badges" to "authenticated";

grant select on table "public"."child_badges" to "authenticated";

grant update on table "public"."child_badges" to "authenticated";

grant select on table "public"."child_badges" to "service_role";

grant delete on table "public"."child_cycle_progress" to "anon";

grant insert on table "public"."child_cycle_progress" to "anon";

grant select on table "public"."child_cycle_progress" to "anon";

grant update on table "public"."child_cycle_progress" to "anon";

grant delete on table "public"."child_cycle_progress" to "authenticated";

grant insert on table "public"."child_cycle_progress" to "authenticated";

grant select on table "public"."child_cycle_progress" to "authenticated";

grant update on table "public"."child_cycle_progress" to "authenticated";

grant select on table "public"."child_cycle_progress" to "service_role";

grant delete on table "public"."child_focus_plan" to "anon";

grant insert on table "public"."child_focus_plan" to "anon";

grant select on table "public"."child_focus_plan" to "anon";

grant update on table "public"."child_focus_plan" to "anon";

grant delete on table "public"."child_focus_plan" to "authenticated";

grant insert on table "public"."child_focus_plan" to "authenticated";

grant select on table "public"."child_focus_plan" to "authenticated";

grant update on table "public"."child_focus_plan" to "authenticated";

grant select on table "public"."child_focus_plan" to "service_role";

grant delete on table "public"."child_modules" to "anon";

grant insert on table "public"."child_modules" to "anon";

grant select on table "public"."child_modules" to "anon";

grant update on table "public"."child_modules" to "anon";

grant delete on table "public"."child_modules" to "authenticated";

grant insert on table "public"."child_modules" to "authenticated";

grant select on table "public"."child_modules" to "authenticated";

grant update on table "public"."child_modules" to "authenticated";

grant select on table "public"."child_modules" to "service_role";

grant delete on table "public"."child_mood_checkins" to "anon";

grant insert on table "public"."child_mood_checkins" to "anon";

grant select on table "public"."child_mood_checkins" to "anon";

grant update on table "public"."child_mood_checkins" to "anon";

grant delete on table "public"."child_mood_checkins" to "authenticated";

grant insert on table "public"."child_mood_checkins" to "authenticated";

grant select on table "public"."child_mood_checkins" to "authenticated";

grant update on table "public"."child_mood_checkins" to "authenticated";

grant delete on table "public"."child_roadblock_completions" to "anon";

grant insert on table "public"."child_roadblock_completions" to "anon";

grant select on table "public"."child_roadblock_completions" to "anon";

grant update on table "public"."child_roadblock_completions" to "anon";

grant delete on table "public"."child_roadblock_completions" to "authenticated";

grant insert on table "public"."child_roadblock_completions" to "authenticated";

grant select on table "public"."child_roadblock_completions" to "authenticated";

grant update on table "public"."child_roadblock_completions" to "authenticated";

grant select on table "public"."child_roadblock_completions" to "service_role";

grant delete on table "public"."child_roadblocks" to "anon";

grant insert on table "public"."child_roadblocks" to "anon";

grant select on table "public"."child_roadblocks" to "anon";

grant update on table "public"."child_roadblocks" to "anon";

grant delete on table "public"."child_roadblocks" to "authenticated";

grant insert on table "public"."child_roadblocks" to "authenticated";

grant select on table "public"."child_roadblocks" to "authenticated";

grant update on table "public"."child_roadblocks" to "authenticated";

grant select on table "public"."child_roadblocks" to "service_role";

grant delete on table "public"."child_super_skill_progress" to "anon";

grant insert on table "public"."child_super_skill_progress" to "anon";

grant select on table "public"."child_super_skill_progress" to "anon";

grant update on table "public"."child_super_skill_progress" to "anon";

grant delete on table "public"."child_super_skill_progress" to "authenticated";

grant insert on table "public"."child_super_skill_progress" to "authenticated";

grant select on table "public"."child_super_skill_progress" to "authenticated";

grant update on table "public"."child_super_skill_progress" to "authenticated";

grant select on table "public"."child_super_skill_progress" to "service_role";

grant delete on table "public"."children" to "anon";

grant insert on table "public"."children" to "anon";

grant select on table "public"."children" to "anon";

grant update on table "public"."children" to "anon";

grant delete on table "public"."children" to "authenticated";

grant insert on table "public"."children" to "authenticated";

grant select on table "public"."children" to "authenticated";

grant update on table "public"."children" to "authenticated";

grant select on table "public"."children" to "service_role";

grant delete on table "public"."core_theories" to "anon";

grant insert on table "public"."core_theories" to "anon";

grant select on table "public"."core_theories" to "anon";

grant update on table "public"."core_theories" to "anon";

grant delete on table "public"."core_theories" to "authenticated";

grant insert on table "public"."core_theories" to "authenticated";

grant select on table "public"."core_theories" to "authenticated";

grant update on table "public"."core_theories" to "authenticated";

grant select on table "public"."core_theories" to "service_role";

grant delete on table "public"."cycles" to "anon";

grant insert on table "public"."cycles" to "anon";

grant select on table "public"."cycles" to "anon";

grant update on table "public"."cycles" to "anon";

grant delete on table "public"."cycles" to "authenticated";

grant insert on table "public"."cycles" to "authenticated";

grant select on table "public"."cycles" to "authenticated";

grant update on table "public"."cycles" to "authenticated";

grant select on table "public"."cycles" to "service_role";

grant delete on table "public"."daily_quest_completions" to "anon";

grant insert on table "public"."daily_quest_completions" to "anon";

grant select on table "public"."daily_quest_completions" to "anon";

grant update on table "public"."daily_quest_completions" to "anon";

grant delete on table "public"."daily_quest_completions" to "authenticated";

grant insert on table "public"."daily_quest_completions" to "authenticated";

grant select on table "public"."daily_quest_completions" to "authenticated";

grant update on table "public"."daily_quest_completions" to "authenticated";

grant select on table "public"."daily_quest_completions" to "service_role";

grant delete on table "public"."diagnosis_profiles" to "anon";

grant insert on table "public"."diagnosis_profiles" to "anon";

grant select on table "public"."diagnosis_profiles" to "anon";

grant update on table "public"."diagnosis_profiles" to "anon";

grant delete on table "public"."diagnosis_profiles" to "authenticated";

grant insert on table "public"."diagnosis_profiles" to "authenticated";

grant select on table "public"."diagnosis_profiles" to "authenticated";

grant update on table "public"."diagnosis_profiles" to "authenticated";

grant delete on table "public"."dss_sedi_categories" to "anon";

grant insert on table "public"."dss_sedi_categories" to "anon";

grant select on table "public"."dss_sedi_categories" to "anon";

grant update on table "public"."dss_sedi_categories" to "anon";

grant delete on table "public"."dss_sedi_categories" to "authenticated";

grant insert on table "public"."dss_sedi_categories" to "authenticated";

grant select on table "public"."dss_sedi_categories" to "authenticated";

grant update on table "public"."dss_sedi_categories" to "authenticated";

grant select on table "public"."dss_sedi_categories" to "service_role";

grant delete on table "public"."emotions" to "anon";

grant insert on table "public"."emotions" to "anon";

grant select on table "public"."emotions" to "anon";

grant update on table "public"."emotions" to "anon";

grant delete on table "public"."emotions" to "authenticated";

grant insert on table "public"."emotions" to "authenticated";

grant select on table "public"."emotions" to "authenticated";

grant update on table "public"."emotions" to "authenticated";

grant select on table "public"."emotions" to "service_role";

grant delete on table "public"."fasd_domains" to "anon";

grant insert on table "public"."fasd_domains" to "anon";

grant select on table "public"."fasd_domains" to "anon";

grant update on table "public"."fasd_domains" to "anon";

grant delete on table "public"."fasd_domains" to "authenticated";

grant insert on table "public"."fasd_domains" to "authenticated";

grant select on table "public"."fasd_domains" to "authenticated";

grant update on table "public"."fasd_domains" to "authenticated";

grant select on table "public"."fasd_domains" to "service_role";

grant delete on table "public"."focus_plan_categories" to "anon";

grant insert on table "public"."focus_plan_categories" to "anon";

grant select on table "public"."focus_plan_categories" to "anon";

grant update on table "public"."focus_plan_categories" to "anon";

grant delete on table "public"."focus_plan_categories" to "authenticated";

grant insert on table "public"."focus_plan_categories" to "authenticated";

grant select on table "public"."focus_plan_categories" to "authenticated";

grant update on table "public"."focus_plan_categories" to "authenticated";

grant select on table "public"."focus_plan_categories" to "service_role";

grant delete on table "public"."focus_plan_frequencies" to "anon";

grant insert on table "public"."focus_plan_frequencies" to "anon";

grant select on table "public"."focus_plan_frequencies" to "anon";

grant update on table "public"."focus_plan_frequencies" to "anon";

grant delete on table "public"."focus_plan_frequencies" to "authenticated";

grant insert on table "public"."focus_plan_frequencies" to "authenticated";

grant select on table "public"."focus_plan_frequencies" to "authenticated";

grant update on table "public"."focus_plan_frequencies" to "authenticated";

grant select on table "public"."focus_plan_frequencies" to "service_role";

grant delete on table "public"."focus_plan_goals" to "anon";

grant insert on table "public"."focus_plan_goals" to "anon";

grant select on table "public"."focus_plan_goals" to "anon";

grant update on table "public"."focus_plan_goals" to "anon";

grant delete on table "public"."focus_plan_goals" to "authenticated";

grant insert on table "public"."focus_plan_goals" to "authenticated";

grant select on table "public"."focus_plan_goals" to "authenticated";

grant update on table "public"."focus_plan_goals" to "authenticated";

grant select on table "public"."focus_plan_goals" to "service_role";

grant delete on table "public"."focus_plan_intensities" to "anon";

grant insert on table "public"."focus_plan_intensities" to "anon";

grant select on table "public"."focus_plan_intensities" to "anon";

grant update on table "public"."focus_plan_intensities" to "anon";

grant delete on table "public"."focus_plan_intensities" to "authenticated";

grant insert on table "public"."focus_plan_intensities" to "authenticated";

grant select on table "public"."focus_plan_intensities" to "authenticated";

grant update on table "public"."focus_plan_intensities" to "authenticated";

grant select on table "public"."focus_plan_intensities" to "service_role";

grant delete on table "public"."forbidden_terms" to "anon";

grant insert on table "public"."forbidden_terms" to "anon";

grant select on table "public"."forbidden_terms" to "anon";

grant update on table "public"."forbidden_terms" to "anon";

grant delete on table "public"."forbidden_terms" to "authenticated";

grant insert on table "public"."forbidden_terms" to "authenticated";

grant select on table "public"."forbidden_terms" to "authenticated";

grant update on table "public"."forbidden_terms" to "authenticated";

grant delete on table "public"."levels" to "anon";

grant insert on table "public"."levels" to "anon";

grant select on table "public"."levels" to "anon";

grant update on table "public"."levels" to "anon";

grant delete on table "public"."levels" to "authenticated";

grant insert on table "public"."levels" to "authenticated";

grant select on table "public"."levels" to "authenticated";

grant update on table "public"."levels" to "authenticated";

grant select on table "public"."levels" to "service_role";

grant delete on table "public"."login_streaks" to "anon";

grant insert on table "public"."login_streaks" to "anon";

grant select on table "public"."login_streaks" to "anon";

grant update on table "public"."login_streaks" to "anon";

grant delete on table "public"."login_streaks" to "authenticated";

grant insert on table "public"."login_streaks" to "authenticated";

grant select on table "public"."login_streaks" to "authenticated";

grant update on table "public"."login_streaks" to "authenticated";

grant select on table "public"."login_streaks" to "service_role";

grant delete on table "public"."module_responses" to "anon";

grant insert on table "public"."module_responses" to "anon";

grant select on table "public"."module_responses" to "anon";

grant update on table "public"."module_responses" to "anon";

grant delete on table "public"."module_responses" to "authenticated";

grant insert on table "public"."module_responses" to "authenticated";

grant select on table "public"."module_responses" to "authenticated";

grant update on table "public"."module_responses" to "authenticated";

grant select on table "public"."module_responses" to "service_role";

grant delete on table "public"."module_secondary_theories" to "anon";

grant insert on table "public"."module_secondary_theories" to "anon";

grant select on table "public"."module_secondary_theories" to "anon";

grant update on table "public"."module_secondary_theories" to "anon";

grant delete on table "public"."module_secondary_theories" to "authenticated";

grant insert on table "public"."module_secondary_theories" to "authenticated";

grant select on table "public"."module_secondary_theories" to "authenticated";

grant update on table "public"."module_secondary_theories" to "authenticated";

grant select on table "public"."module_secondary_theories" to "service_role";

grant delete on table "public"."module_unlocks" to "anon";

grant insert on table "public"."module_unlocks" to "anon";

grant select on table "public"."module_unlocks" to "anon";

grant update on table "public"."module_unlocks" to "anon";

grant delete on table "public"."module_unlocks" to "authenticated";

grant insert on table "public"."module_unlocks" to "authenticated";

grant select on table "public"."module_unlocks" to "authenticated";

grant update on table "public"."module_unlocks" to "authenticated";

grant select on table "public"."module_unlocks" to "service_role";

grant delete on table "public"."module_variants" to "anon";

grant insert on table "public"."module_variants" to "anon";

grant select on table "public"."module_variants" to "anon";

grant update on table "public"."module_variants" to "anon";

grant delete on table "public"."module_variants" to "authenticated";

grant insert on table "public"."module_variants" to "authenticated";

grant select on table "public"."module_variants" to "authenticated";

grant update on table "public"."module_variants" to "authenticated";

grant delete on table "public"."modules" to "anon";

grant insert on table "public"."modules" to "anon";

grant select on table "public"."modules" to "anon";

grant update on table "public"."modules" to "anon";

grant delete on table "public"."modules" to "authenticated";

grant insert on table "public"."modules" to "authenticated";

grant select on table "public"."modules" to "authenticated";

grant update on table "public"."modules" to "authenticated";

grant insert on table "public"."modules" to "service_role";

grant select on table "public"."modules" to "service_role";

grant update on table "public"."modules" to "service_role";

grant delete on table "public"."modules_to_generate" to "anon";

grant insert on table "public"."modules_to_generate" to "anon";

grant select on table "public"."modules_to_generate" to "anon";

grant update on table "public"."modules_to_generate" to "anon";

grant delete on table "public"."modules_to_generate" to "authenticated";

grant insert on table "public"."modules_to_generate" to "authenticated";

grant select on table "public"."modules_to_generate" to "authenticated";

grant update on table "public"."modules_to_generate" to "authenticated";

grant select on table "public"."modules_to_generate" to "service_role";

grant delete on table "public"."ndis_domains" to "anon";

grant insert on table "public"."ndis_domains" to "anon";

grant select on table "public"."ndis_domains" to "anon";

grant update on table "public"."ndis_domains" to "anon";

grant delete on table "public"."ndis_domains" to "authenticated";

grant insert on table "public"."ndis_domains" to "authenticated";

grant select on table "public"."ndis_domains" to "authenticated";

grant update on table "public"."ndis_domains" to "authenticated";

grant select on table "public"."ndis_domains" to "service_role";

grant delete on table "public"."needs_based_pathways" to "anon";

grant insert on table "public"."needs_based_pathways" to "anon";

grant select on table "public"."needs_based_pathways" to "anon";

grant update on table "public"."needs_based_pathways" to "anon";

grant delete on table "public"."needs_based_pathways" to "authenticated";

grant insert on table "public"."needs_based_pathways" to "authenticated";

grant select on table "public"."needs_based_pathways" to "authenticated";

grant update on table "public"."needs_based_pathways" to "authenticated";

grant delete on table "public"."parent_modules" to "anon";

grant insert on table "public"."parent_modules" to "anon";

grant select on table "public"."parent_modules" to "anon";

grant update on table "public"."parent_modules" to "anon";

grant delete on table "public"."parent_modules" to "authenticated";

grant insert on table "public"."parent_modules" to "authenticated";

grant select on table "public"."parent_modules" to "authenticated";

grant update on table "public"."parent_modules" to "authenticated";

grant select on table "public"."parent_modules" to "service_role";

grant delete on table "public"."parent_profiles" to "anon";

grant insert on table "public"."parent_profiles" to "anon";

grant select on table "public"."parent_profiles" to "anon";

grant update on table "public"."parent_profiles" to "anon";

grant delete on table "public"."parent_profiles" to "authenticated";

grant insert on table "public"."parent_profiles" to "authenticated";

grant select on table "public"."parent_profiles" to "authenticated";

grant update on table "public"."parent_profiles" to "authenticated";

grant select on table "public"."parent_profiles" to "service_role";

grant delete on table "public"."parent_scripts" to "anon";

grant insert on table "public"."parent_scripts" to "anon";

grant select on table "public"."parent_scripts" to "anon";

grant update on table "public"."parent_scripts" to "anon";

grant delete on table "public"."parent_scripts" to "authenticated";

grant insert on table "public"."parent_scripts" to "authenticated";

grant select on table "public"."parent_scripts" to "authenticated";

grant update on table "public"."parent_scripts" to "authenticated";

grant select on table "public"."parent_scripts" to "service_role";

grant delete on table "public"."parent_subscriptions" to "anon";

grant insert on table "public"."parent_subscriptions" to "anon";

grant select on table "public"."parent_subscriptions" to "anon";

grant update on table "public"."parent_subscriptions" to "anon";

grant delete on table "public"."parent_subscriptions" to "authenticated";

grant insert on table "public"."parent_subscriptions" to "authenticated";

grant select on table "public"."parent_subscriptions" to "authenticated";

grant update on table "public"."parent_subscriptions" to "authenticated";

grant delete on table "public"."parent_subscriptions" to "service_role";

grant insert on table "public"."parent_subscriptions" to "service_role";

grant references on table "public"."parent_subscriptions" to "service_role";

grant select on table "public"."parent_subscriptions" to "service_role";

grant trigger on table "public"."parent_subscriptions" to "service_role";

grant truncate on table "public"."parent_subscriptions" to "service_role";

grant update on table "public"."parent_subscriptions" to "service_role";

grant delete on table "public"."pathway_assessments" to "anon";

grant insert on table "public"."pathway_assessments" to "anon";

grant select on table "public"."pathway_assessments" to "anon";

grant update on table "public"."pathway_assessments" to "anon";

grant delete on table "public"."pathway_assessments" to "authenticated";

grant insert on table "public"."pathway_assessments" to "authenticated";

grant select on table "public"."pathway_assessments" to "authenticated";

grant update on table "public"."pathway_assessments" to "authenticated";

grant select on table "public"."pathway_assessments" to "service_role";

grant delete on table "public"."pathways" to "anon";

grant insert on table "public"."pathways" to "anon";

grant select on table "public"."pathways" to "anon";

grant update on table "public"."pathways" to "anon";

grant delete on table "public"."pathways" to "authenticated";

grant insert on table "public"."pathways" to "authenticated";

grant select on table "public"."pathways" to "authenticated";

grant update on table "public"."pathways" to "authenticated";

grant select on table "public"."pathways" to "service_role";

grant delete on table "public"."reward_purchases" to "anon";

grant insert on table "public"."reward_purchases" to "anon";

grant select on table "public"."reward_purchases" to "anon";

grant update on table "public"."reward_purchases" to "anon";

grant delete on table "public"."reward_purchases" to "authenticated";

grant insert on table "public"."reward_purchases" to "authenticated";

grant select on table "public"."reward_purchases" to "authenticated";

grant update on table "public"."reward_purchases" to "authenticated";

grant select on table "public"."reward_purchases" to "service_role";

grant delete on table "public"."rewards" to "anon";

grant insert on table "public"."rewards" to "anon";

grant select on table "public"."rewards" to "anon";

grant update on table "public"."rewards" to "anon";

grant delete on table "public"."rewards" to "authenticated";

grant insert on table "public"."rewards" to "authenticated";

grant select on table "public"."rewards" to "authenticated";

grant update on table "public"."rewards" to "authenticated";

grant select on table "public"."rewards" to "service_role";

grant delete on table "public"."roadblock_config" to "anon";

grant insert on table "public"."roadblock_config" to "anon";

grant select on table "public"."roadblock_config" to "anon";

grant update on table "public"."roadblock_config" to "anon";

grant delete on table "public"."roadblock_config" to "authenticated";

grant insert on table "public"."roadblock_config" to "authenticated";

grant select on table "public"."roadblock_config" to "authenticated";

grant update on table "public"."roadblock_config" to "authenticated";

grant select on table "public"."roadblock_config" to "service_role";

grant delete on table "public"."roadblocks" to "anon";

grant insert on table "public"."roadblocks" to "anon";

grant select on table "public"."roadblocks" to "anon";

grant update on table "public"."roadblocks" to "anon";

grant delete on table "public"."roadblocks" to "authenticated";

grant insert on table "public"."roadblocks" to "authenticated";

grant select on table "public"."roadblocks" to "authenticated";

grant update on table "public"."roadblocks" to "authenticated";

grant select on table "public"."roadblocks" to "service_role";

grant delete on table "public"."sequencing_rules" to "anon";

grant insert on table "public"."sequencing_rules" to "anon";

grant select on table "public"."sequencing_rules" to "anon";

grant update on table "public"."sequencing_rules" to "anon";

grant delete on table "public"."sequencing_rules" to "authenticated";

grant insert on table "public"."sequencing_rules" to "authenticated";

grant select on table "public"."sequencing_rules" to "authenticated";

grant update on table "public"."sequencing_rules" to "authenticated";

grant delete on table "public"."series" to "anon";

grant insert on table "public"."series" to "anon";

grant select on table "public"."series" to "anon";

grant update on table "public"."series" to "anon";

grant delete on table "public"."series" to "authenticated";

grant insert on table "public"."series" to "authenticated";

grant select on table "public"."series" to "authenticated";

grant update on table "public"."series" to "authenticated";

grant select on table "public"."series" to "service_role";

grant delete on table "public"."settings" to "anon";

grant insert on table "public"."settings" to "anon";

grant select on table "public"."settings" to "anon";

grant update on table "public"."settings" to "anon";

grant delete on table "public"."settings" to "authenticated";

grant insert on table "public"."settings" to "authenticated";

grant select on table "public"."settings" to "authenticated";

grant update on table "public"."settings" to "authenticated";

grant select on table "public"."settings" to "service_role";

grant delete on table "public"."skills" to "anon";

grant insert on table "public"."skills" to "anon";

grant select on table "public"."skills" to "anon";

grant update on table "public"."skills" to "anon";

grant delete on table "public"."skills" to "authenticated";

grant insert on table "public"."skills" to "authenticated";

grant select on table "public"."skills" to "authenticated";

grant update on table "public"."skills" to "authenticated";

grant select on table "public"."skills" to "service_role";

grant delete on table "public"."sub_skills" to "anon";

grant insert on table "public"."sub_skills" to "anon";

grant select on table "public"."sub_skills" to "anon";

grant update on table "public"."sub_skills" to "anon";

grant delete on table "public"."sub_skills" to "authenticated";

grant insert on table "public"."sub_skills" to "authenticated";

grant select on table "public"."sub_skills" to "authenticated";

grant update on table "public"."sub_skills" to "authenticated";

grant select on table "public"."sub_skills" to "service_role";

grant delete on table "public"."subscription_credit_ledger" to "anon";

grant insert on table "public"."subscription_credit_ledger" to "anon";

grant select on table "public"."subscription_credit_ledger" to "anon";

grant update on table "public"."subscription_credit_ledger" to "anon";

grant delete on table "public"."subscription_credit_ledger" to "authenticated";

grant insert on table "public"."subscription_credit_ledger" to "authenticated";

grant select on table "public"."subscription_credit_ledger" to "authenticated";

grant update on table "public"."subscription_credit_ledger" to "authenticated";

grant delete on table "public"."subscription_credit_ledger" to "service_role";

grant insert on table "public"."subscription_credit_ledger" to "service_role";

grant references on table "public"."subscription_credit_ledger" to "service_role";

grant select on table "public"."subscription_credit_ledger" to "service_role";

grant trigger on table "public"."subscription_credit_ledger" to "service_role";

grant truncate on table "public"."subscription_credit_ledger" to "service_role";

grant update on table "public"."subscription_credit_ledger" to "service_role";

grant delete on table "public"."subscription_tiers" to "anon";

grant insert on table "public"."subscription_tiers" to "anon";

grant select on table "public"."subscription_tiers" to "anon";

grant update on table "public"."subscription_tiers" to "anon";

grant delete on table "public"."subscription_tiers" to "authenticated";

grant insert on table "public"."subscription_tiers" to "authenticated";

grant select on table "public"."subscription_tiers" to "authenticated";

grant update on table "public"."subscription_tiers" to "authenticated";

grant select on table "public"."subscription_tiers" to "service_role";

grant delete on table "public"."super_skills" to "anon";

grant insert on table "public"."super_skills" to "anon";

grant select on table "public"."super_skills" to "anon";

grant update on table "public"."super_skills" to "anon";

grant delete on table "public"."super_skills" to "authenticated";

grant insert on table "public"."super_skills" to "authenticated";

grant select on table "public"."super_skills" to "authenticated";

grant update on table "public"."super_skills" to "authenticated";

grant select on table "public"."super_skills" to "service_role";

grant delete on table "public"."theory_connections" to "anon";

grant insert on table "public"."theory_connections" to "anon";

grant select on table "public"."theory_connections" to "anon";

grant update on table "public"."theory_connections" to "anon";

grant delete on table "public"."theory_connections" to "authenticated";

grant insert on table "public"."theory_connections" to "authenticated";

grant select on table "public"."theory_connections" to "authenticated";

grant update on table "public"."theory_connections" to "authenticated";

grant delete on table "public"."tools" to "anon";

grant insert on table "public"."tools" to "anon";

grant select on table "public"."tools" to "anon";

grant update on table "public"."tools" to "anon";

grant delete on table "public"."tools" to "authenticated";

grant insert on table "public"."tools" to "authenticated";

grant select on table "public"."tools" to "authenticated";

grant update on table "public"."tools" to "authenticated";

grant select on table "public"."tools" to "service_role";

grant delete on table "public"."weekly_checkins" to "anon";

grant insert on table "public"."weekly_checkins" to "anon";

grant select on table "public"."weekly_checkins" to "anon";

grant update on table "public"."weekly_checkins" to "anon";

grant delete on table "public"."weekly_checkins" to "authenticated";

grant insert on table "public"."weekly_checkins" to "authenticated";

grant select on table "public"."weekly_checkins" to "authenticated";

grant update on table "public"."weekly_checkins" to "authenticated";

grant select on table "public"."weekly_checkins" to "service_role";


  create policy "Anyone can read active age ranges"
  on "public"."age_ranges"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "Authenticated users can manage age ranges"
  on "public"."age_ranges"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Service role can read age_ranges"
  on "public"."age_ranges"
  as permissive
  for select
  to service_role
using (true);



  create policy "age_ranges_delete_admin_only"
  on "public"."age_ranges"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "age_ranges_insert_admin_only"
  on "public"."age_ranges"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "age_ranges_select_all_authenticated"
  on "public"."age_ranges"
  as permissive
  for select
  to authenticated
using (true);



  create policy "age_ranges_update_admin_only"
  on "public"."age_ranges"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Allow all operations on ai_generation_jobs"
  on "public"."ai_generation_jobs"
  as permissive
  for all
  to public
using (true);



  create policy "ai_generation_jobs_delete_admin_only"
  on "public"."ai_generation_jobs"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "ai_generation_jobs_insert_admin_only"
  on "public"."ai_generation_jobs"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "ai_generation_jobs_select_all_authenticated"
  on "public"."ai_generation_jobs"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ai_generation_jobs_update_admin_only"
  on "public"."ai_generation_jobs"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Allow authenticated users to read AI config"
  on "public"."ai_module_config"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service role to manage AI config"
  on "public"."ai_module_config"
  as permissive
  for all
  to service_role
using (true);



  create policy "ai_module_config_delete_admin_only"
  on "public"."ai_module_config"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "ai_module_config_insert_admin_only"
  on "public"."ai_module_config"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "ai_module_config_select_all_authenticated"
  on "public"."ai_module_config"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ai_module_config_update_admin_only"
  on "public"."ai_module_config"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Public read assessment_questions"
  on "public"."assessment_questions"
  as permissive
  for select
  to public
using (true);



  create policy "Service role manage assessment_questions"
  on "public"."assessment_questions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "assessment_questions_delete_admin_only"
  on "public"."assessment_questions"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "assessment_questions_insert_admin_only"
  on "public"."assessment_questions"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "assessment_questions_select_all_authenticated"
  on "public"."assessment_questions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "assessment_questions_update_admin_only"
  on "public"."assessment_questions"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "audit_criteria_delete_admin_only"
  on "public"."audit_criteria"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "audit_criteria_insert_admin_only"
  on "public"."audit_criteria"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "audit_criteria_select_all_authenticated"
  on "public"."audit_criteria"
  as permissive
  for select
  to authenticated
using (true);



  create policy "audit_criteria_update_admin_only"
  on "public"."audit_criteria"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Allow authenticated users to delete audit rules"
  on "public"."audit_rules"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to insert audit rules"
  on "public"."audit_rules"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to read audit rules"
  on "public"."audit_rules"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to update audit rules"
  on "public"."audit_rules"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "audit_rules_delete_admin_only"
  on "public"."audit_rules"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "audit_rules_insert_admin_only"
  on "public"."audit_rules"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "audit_rules_select_all_authenticated"
  on "public"."audit_rules"
  as permissive
  for select
  to authenticated
using (true);



  create policy "audit_rules_update_admin_only"
  on "public"."audit_rules"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Allow authenticated users to delete audit sections"
  on "public"."audit_sections"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to insert audit sections"
  on "public"."audit_sections"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to read audit sections"
  on "public"."audit_sections"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to update audit sections"
  on "public"."audit_sections"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "audit_sections_delete_admin_only"
  on "public"."audit_sections"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "audit_sections_insert_admin_only"
  on "public"."audit_sections"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "audit_sections_select_all_authenticated"
  on "public"."audit_sections"
  as permissive
  for select
  to authenticated
using (true);



  create policy "audit_sections_update_admin_only"
  on "public"."audit_sections"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "badges_delete_admin_only"
  on "public"."badges"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "badges_insert_admin_only"
  on "public"."badges"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "badges_select_all_authenticated"
  on "public"."badges"
  as permissive
  for select
  to authenticated
using (true);



  create policy "badges_update_admin_only"
  on "public"."badges"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "brain_town_vocabulary_delete_admin_only"
  on "public"."brain_town_vocabulary"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "brain_town_vocabulary_insert_admin_only"
  on "public"."brain_town_vocabulary"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "brain_town_vocabulary_select_all_authenticated"
  on "public"."brain_town_vocabulary"
  as permissive
  for select
  to authenticated
using (true);



  create policy "brain_town_vocabulary_update_admin_only"
  on "public"."brain_town_vocabulary"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Authenticated users can view category_colors"
  on "public"."category_colors"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify category_colors"
  on "public"."category_colors"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "category_colors_delete_admin_only"
  on "public"."category_colors"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "category_colors_insert_admin_only"
  on "public"."category_colors"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "category_colors_select_all_authenticated"
  on "public"."category_colors"
  as permissive
  for select
  to authenticated
using (true);



  create policy "category_colors_update_admin_only"
  on "public"."category_colors"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "characters_delete_admin_only"
  on "public"."characters"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "characters_insert_admin_only"
  on "public"."characters"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "characters_select_all_authenticated"
  on "public"."characters"
  as permissive
  for select
  to authenticated
using (true);



  create policy "characters_update_admin_only"
  on "public"."characters"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Public read checkin_challenges"
  on "public"."checkin_challenges"
  as permissive
  for select
  to public
using (true);



  create policy "Service role manage checkin_challenges"
  on "public"."checkin_challenges"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "checkin_challenges_delete_admin_only"
  on "public"."checkin_challenges"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "checkin_challenges_insert_admin_only"
  on "public"."checkin_challenges"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "checkin_challenges_select_all_authenticated"
  on "public"."checkin_challenges"
  as permissive
  for select
  to authenticated
using (true);



  create policy "checkin_challenges_update_admin_only"
  on "public"."checkin_challenges"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Public read checkin_goals"
  on "public"."checkin_goals"
  as permissive
  for select
  to public
using (true);



  create policy "Service role manage checkin_goals"
  on "public"."checkin_goals"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "checkin_goals_delete_admin_only"
  on "public"."checkin_goals"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "checkin_goals_insert_admin_only"
  on "public"."checkin_goals"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "checkin_goals_select_all_authenticated"
  on "public"."checkin_goals"
  as permissive
  for select
  to authenticated
using (true);



  create policy "checkin_goals_update_admin_only"
  on "public"."checkin_goals"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Public read checkin_triggers"
  on "public"."checkin_triggers"
  as permissive
  for select
  to public
using (true);



  create policy "Service role manage checkin_triggers"
  on "public"."checkin_triggers"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "checkin_triggers_delete_admin_only"
  on "public"."checkin_triggers"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "checkin_triggers_insert_admin_only"
  on "public"."checkin_triggers"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "checkin_triggers_select_all_authenticated"
  on "public"."checkin_triggers"
  as permissive
  for select
  to authenticated
using (true);



  create policy "checkin_triggers_update_admin_only"
  on "public"."checkin_triggers"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "child_badges_delete_own_child_or_admin"
  on "public"."child_badges"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_badges_insert_own_child_or_admin"
  on "public"."child_badges"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_badges_select_own_child_or_admin"
  on "public"."child_badges"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_badges_update_own_child_or_admin"
  on "public"."child_badges"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_cycle_progress_delete_own_child_or_admin"
  on "public"."child_cycle_progress"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_cycle_progress_insert_own_child_or_admin"
  on "public"."child_cycle_progress"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_cycle_progress_select_own_child_or_admin"
  on "public"."child_cycle_progress"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_cycle_progress_update_own_child_or_admin"
  on "public"."child_cycle_progress"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "Parents can delete their children's focus plans"
  on "public"."child_focus_plan"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_focus_plan.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Parents can insert focus plans for their children"
  on "public"."child_focus_plan"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_focus_plan.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Parents can update their children's focus plans"
  on "public"."child_focus_plan"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_focus_plan.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Parents can view their children's focus plans"
  on "public"."child_focus_plan"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_focus_plan.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "child_focus_plan_delete_own_child_or_admin"
  on "public"."child_focus_plan"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_focus_plan_insert_own_child_or_admin"
  on "public"."child_focus_plan"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_focus_plan_select_own_child_or_admin"
  on "public"."child_focus_plan"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_focus_plan_update_own_child_or_admin"
  on "public"."child_focus_plan"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "Admins can manage all child modules"
  on "public"."child_modules"
  as permissive
  for all
  to public
using (public.is_user_admin_module_check());



  create policy "Allow authenticated delete on child_modules"
  on "public"."child_modules"
  as permissive
  for delete
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Enable insert for authenticated users"
  on "public"."child_modules"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable select for authenticated users"
  on "public"."child_modules"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Enable update for authenticated users"
  on "public"."child_modules"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Parents can view children modules"
  on "public"."child_modules"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children
  WHERE ((children.id = child_modules.child_id) AND (children.parent_user_id = auth.uid())))));



  create policy "Service role can manage child modules"
  on "public"."child_modules"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text));



  create policy "Users can insert their children's modules"
  on "public"."child_modules"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.children
  WHERE ((children.id = child_modules.child_id) AND (children.parent_user_id = auth.uid())))));



  create policy "Users can update their children's modules"
  on "public"."child_modules"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.children
  WHERE ((children.id = child_modules.child_id) AND (children.parent_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.children
  WHERE ((children.id = child_modules.child_id) AND (children.parent_user_id = auth.uid())))));



  create policy "Users can view their children's modules"
  on "public"."child_modules"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children
  WHERE ((children.id = child_modules.child_id) AND (children.parent_user_id = auth.uid())))));



  create policy "child_modules_delete_own_child_or_admin"
  on "public"."child_modules"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_modules_insert_own_child_or_admin"
  on "public"."child_modules"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_modules_select_own_child_or_admin"
  on "public"."child_modules"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_modules_update_own_child_or_admin"
  on "public"."child_modules"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "delete_child_modules_for_own_children"
  on "public"."child_modules"
  as restrictive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_modules.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "insert_child_modules_for_own_children"
  on "public"."child_modules"
  as restrictive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_modules.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "select_child_modules_for_own_children"
  on "public"."child_modules"
  as restrictive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_modules.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "update_child_modules_for_own_children"
  on "public"."child_modules"
  as restrictive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_modules.child_id) AND (c.parent_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_modules.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Parents can insert mood check-ins for their children"
  on "public"."child_mood_checkins"
  as permissive
  for insert
  to authenticated
with check (((parent_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_mood_checkins.child_id) AND (c.parent_user_id = auth.uid()))))));



  create policy "Parents can read mood check-ins for their children"
  on "public"."child_mood_checkins"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_mood_checkins.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Users can insert own children roadblock completions"
  on "public"."child_roadblock_completions"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_roadblock_completions.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Users can view own children roadblock completions"
  on "public"."child_roadblock_completions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = child_roadblock_completions.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "child_roadblock_completions_delete_own_child_or_admin"
  on "public"."child_roadblock_completions"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_roadblock_completions_insert_own_child_or_admin"
  on "public"."child_roadblock_completions"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_roadblock_completions_select_own_child_or_admin"
  on "public"."child_roadblock_completions"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_roadblock_completions_update_own_child_or_admin"
  on "public"."child_roadblock_completions"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_roadblocks_delete_own_child_or_admin"
  on "public"."child_roadblocks"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_roadblocks_insert_own_child_or_admin"
  on "public"."child_roadblocks"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_roadblocks_select_own_child_or_admin"
  on "public"."child_roadblocks"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_roadblocks_update_own_child_or_admin"
  on "public"."child_roadblocks"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_super_skill_progress_delete_own_child_or_admin"
  on "public"."child_super_skill_progress"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_super_skill_progress_insert_own_child_or_admin"
  on "public"."child_super_skill_progress"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_super_skill_progress_select_own_child_or_admin"
  on "public"."child_super_skill_progress"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "child_super_skill_progress_update_own_child_or_admin"
  on "public"."child_super_skill_progress"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "Users can delete their own children"
  on "public"."children"
  as permissive
  for delete
  to public
using ((auth.uid() = parent_user_id));



  create policy "Users can insert their own children"
  on "public"."children"
  as permissive
  for insert
  to public
with check ((auth.uid() = parent_user_id));



  create policy "Users can update their own children"
  on "public"."children"
  as permissive
  for update
  to public
using ((auth.uid() = parent_user_id))
with check ((auth.uid() = parent_user_id));



  create policy "Users can view their own children"
  on "public"."children"
  as permissive
  for select
  to public
using (true);



  create policy "children_delete_own_or_admin"
  on "public"."children"
  as permissive
  for delete
  to authenticated
using (((parent_user_id = auth.uid()) OR public.is_sys_admin()));



  create policy "children_insert_own_or_admin"
  on "public"."children"
  as permissive
  for insert
  to authenticated
with check (((parent_user_id = auth.uid()) OR public.is_sys_admin()));



  create policy "children_select_own_or_admin"
  on "public"."children"
  as permissive
  for select
  to authenticated
using (((parent_user_id = auth.uid()) OR public.is_sys_admin()));



  create policy "children_update_own_or_admin"
  on "public"."children"
  as permissive
  for update
  to authenticated
using (((parent_user_id = auth.uid()) OR public.is_sys_admin()))
with check (((parent_user_id = auth.uid()) OR public.is_sys_admin()));



  create policy "delete_own_children"
  on "public"."children"
  as restrictive
  for delete
  to public
using ((parent_user_id = auth.uid()));



  create policy "insert_own_children"
  on "public"."children"
  as restrictive
  for insert
  to public
with check ((parent_user_id = auth.uid()));



  create policy "update_own_children"
  on "public"."children"
  as restrictive
  for update
  to public
using ((parent_user_id = auth.uid()))
with check ((parent_user_id = auth.uid()));



  create policy "Anyone can read active core theories"
  on "public"."core_theories"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "Authenticated users can manage core theories"
  on "public"."core_theories"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Service role can read core_theories"
  on "public"."core_theories"
  as permissive
  for select
  to service_role
using (true);



  create policy "core_theories_delete_admin_only"
  on "public"."core_theories"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "core_theories_insert_admin_only"
  on "public"."core_theories"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "core_theories_select_all_authenticated"
  on "public"."core_theories"
  as permissive
  for select
  to authenticated
using (true);



  create policy "core_theories_update_admin_only"
  on "public"."core_theories"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Enable read access for all users"
  on "public"."cycles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "cycles_delete_admin_only"
  on "public"."cycles"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "cycles_insert_admin_only"
  on "public"."cycles"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "cycles_select_all_authenticated"
  on "public"."cycles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "cycles_update_admin_only"
  on "public"."cycles"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Users can insert own children quest completions"
  on "public"."daily_quest_completions"
  as permissive
  for insert
  to public
with check ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can view own children quest completions"
  on "public"."daily_quest_completions"
  as permissive
  for select
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "daily_quest_completions_delete_own_child_or_admin"
  on "public"."daily_quest_completions"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "daily_quest_completions_insert_own_child_or_admin"
  on "public"."daily_quest_completions"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "daily_quest_completions_select_own_child_or_admin"
  on "public"."daily_quest_completions"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "daily_quest_completions_update_own_child_or_admin"
  on "public"."daily_quest_completions"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "diagnosis_profiles_delete_admin_only"
  on "public"."diagnosis_profiles"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "diagnosis_profiles_insert_admin_only"
  on "public"."diagnosis_profiles"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "diagnosis_profiles_select_all_authenticated"
  on "public"."diagnosis_profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "diagnosis_profiles_update_admin_only"
  on "public"."diagnosis_profiles"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Authenticated users can view dss_sedi_categories"
  on "public"."dss_sedi_categories"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify dss_sedi_categories"
  on "public"."dss_sedi_categories"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "dss_sedi_categories_delete_admin_only"
  on "public"."dss_sedi_categories"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "dss_sedi_categories_insert_admin_only"
  on "public"."dss_sedi_categories"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "dss_sedi_categories_select_all_authenticated"
  on "public"."dss_sedi_categories"
  as permissive
  for select
  to authenticated
using (true);



  create policy "dss_sedi_categories_update_admin_only"
  on "public"."dss_sedi_categories"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Authenticated users can view emotions"
  on "public"."emotions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify emotions"
  on "public"."emotions"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "emotions_delete_admin_only"
  on "public"."emotions"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "emotions_insert_admin_only"
  on "public"."emotions"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "emotions_select_all_authenticated"
  on "public"."emotions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "emotions_update_admin_only"
  on "public"."emotions"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Authenticated users can view fasd_domains"
  on "public"."fasd_domains"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify fasd_domains"
  on "public"."fasd_domains"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "fasd_domains_delete_admin_only"
  on "public"."fasd_domains"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "fasd_domains_insert_admin_only"
  on "public"."fasd_domains"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "fasd_domains_select_all_authenticated"
  on "public"."fasd_domains"
  as permissive
  for select
  to authenticated
using (true);



  create policy "fasd_domains_update_admin_only"
  on "public"."fasd_domains"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Public read focus_plan_categories"
  on "public"."focus_plan_categories"
  as permissive
  for select
  to public
using (true);



  create policy "Service role manage focus_plan_categories"
  on "public"."focus_plan_categories"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "focus_plan_categories_delete_admin_only"
  on "public"."focus_plan_categories"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "focus_plan_categories_insert_admin_only"
  on "public"."focus_plan_categories"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "focus_plan_categories_select_all_authenticated"
  on "public"."focus_plan_categories"
  as permissive
  for select
  to authenticated
using (true);



  create policy "focus_plan_categories_update_admin_only"
  on "public"."focus_plan_categories"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Public read focus_plan_frequencies"
  on "public"."focus_plan_frequencies"
  as permissive
  for select
  to public
using (true);



  create policy "Service role manage focus_plan_frequencies"
  on "public"."focus_plan_frequencies"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "focus_plan_frequencies_delete_admin_only"
  on "public"."focus_plan_frequencies"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "focus_plan_frequencies_insert_admin_only"
  on "public"."focus_plan_frequencies"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "focus_plan_frequencies_select_all_authenticated"
  on "public"."focus_plan_frequencies"
  as permissive
  for select
  to authenticated
using (true);



  create policy "focus_plan_frequencies_update_admin_only"
  on "public"."focus_plan_frequencies"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Public read focus_plan_goals"
  on "public"."focus_plan_goals"
  as permissive
  for select
  to public
using (true);



  create policy "Service role manage focus_plan_goals"
  on "public"."focus_plan_goals"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "focus_plan_goals_delete_admin_only"
  on "public"."focus_plan_goals"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "focus_plan_goals_insert_admin_only"
  on "public"."focus_plan_goals"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "focus_plan_goals_select_all_authenticated"
  on "public"."focus_plan_goals"
  as permissive
  for select
  to authenticated
using (true);



  create policy "focus_plan_goals_update_admin_only"
  on "public"."focus_plan_goals"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Public read focus_plan_intensities"
  on "public"."focus_plan_intensities"
  as permissive
  for select
  to public
using (true);



  create policy "Service role manage focus_plan_intensities"
  on "public"."focus_plan_intensities"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "focus_plan_intensities_delete_admin_only"
  on "public"."focus_plan_intensities"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "focus_plan_intensities_insert_admin_only"
  on "public"."focus_plan_intensities"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "focus_plan_intensities_select_all_authenticated"
  on "public"."focus_plan_intensities"
  as permissive
  for select
  to authenticated
using (true);



  create policy "focus_plan_intensities_update_admin_only"
  on "public"."focus_plan_intensities"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Allow authenticated users to delete forbidden terms"
  on "public"."forbidden_terms"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to insert forbidden terms"
  on "public"."forbidden_terms"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to read forbidden terms"
  on "public"."forbidden_terms"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to update forbidden terms"
  on "public"."forbidden_terms"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "forbidden_terms_delete_admin_only"
  on "public"."forbidden_terms"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "forbidden_terms_insert_admin_only"
  on "public"."forbidden_terms"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "forbidden_terms_select_all_authenticated"
  on "public"."forbidden_terms"
  as permissive
  for select
  to authenticated
using (true);



  create policy "forbidden_terms_update_admin_only"
  on "public"."forbidden_terms"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Levels are viewable by everyone"
  on "public"."levels"
  as permissive
  for select
  to public
using (true);



  create policy "levels_delete_admin_only"
  on "public"."levels"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "levels_insert_admin_only"
  on "public"."levels"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "levels_select_all_authenticated"
  on "public"."levels"
  as permissive
  for select
  to authenticated
using (true);



  create policy "levels_update_admin_only"
  on "public"."levels"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Users can insert their own login streaks"
  on "public"."login_streaks"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = login_streaks.child_id) AND (c.parent_user_id = auth.uid()))))));



  create policy "Users can update their own login streaks"
  on "public"."login_streaks"
  as permissive
  for update
  to public
using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = login_streaks.child_id) AND (c.parent_user_id = auth.uid()))))));



  create policy "Users can view their own login streaks"
  on "public"."login_streaks"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = login_streaks.child_id) AND (c.parent_user_id = auth.uid()))))));



  create policy "login_streaks_delete_own_or_admin"
  on "public"."login_streaks"
  as permissive
  for delete
  to authenticated
using (((user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "login_streaks_insert_own_or_admin"
  on "public"."login_streaks"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "login_streaks_select_own_or_admin"
  on "public"."login_streaks"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "login_streaks_update_own_or_admin"
  on "public"."login_streaks"
  as permissive
  for update
  to authenticated
using (((user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()))
with check (((user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "Admins can manage all module responses"
  on "public"."module_responses"
  as permissive
  for all
  to public
using (public.is_user_admin_module_check());



  create policy "Parents can insert responses for their children"
  on "public"."module_responses"
  as permissive
  for insert
  to public
with check ((auth.uid() = parent_user_id));



  create policy "Parents can read own children's responses"
  on "public"."module_responses"
  as permissive
  for select
  to public
using ((auth.uid() = parent_user_id));



  create policy "Parents can update responses for their children"
  on "public"."module_responses"
  as permissive
  for update
  to public
using ((auth.uid() = parent_user_id));



  create policy "Parents can view children responses"
  on "public"."module_responses"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children
  WHERE ((children.id = module_responses.child_id) AND (children.parent_user_id = auth.uid())))));



  create policy "Service role can manage module responses"
  on "public"."module_responses"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text));



  create policy "Users can delete responses for their children"
  on "public"."module_responses"
  as permissive
  for delete
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can insert responses for their children"
  on "public"."module_responses"
  as permissive
  for insert
  to public
with check ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can update responses for their children"
  on "public"."module_responses"
  as permissive
  for update
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can view their children's responses"
  on "public"."module_responses"
  as permissive
  for select
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "module_responses_delete_own_or_admin"
  on "public"."module_responses"
  as permissive
  for delete
  to authenticated
using (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "module_responses_insert_own_or_admin"
  on "public"."module_responses"
  as permissive
  for insert
  to authenticated
with check (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "module_responses_select_own_or_admin"
  on "public"."module_responses"
  as permissive
  for select
  to authenticated
using (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "module_responses_update_own_or_admin"
  on "public"."module_responses"
  as permissive
  for update
  to authenticated
using (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()))
with check (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "Authenticated users can view module_secondary_theories"
  on "public"."module_secondary_theories"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify module_secondary_theories"
  on "public"."module_secondary_theories"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "module_secondary_theories_delete_admin_only"
  on "public"."module_secondary_theories"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "module_secondary_theories_insert_admin_only"
  on "public"."module_secondary_theories"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "module_secondary_theories_select_all_authenticated"
  on "public"."module_secondary_theories"
  as permissive
  for select
  to authenticated
using (true);



  create policy "module_secondary_theories_update_admin_only"
  on "public"."module_secondary_theories"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Users can insert own module unlocks"
  on "public"."module_unlocks"
  as permissive
  for insert
  to public
with check ((auth.uid() = parent_id));



  create policy "Users can view own module unlocks"
  on "public"."module_unlocks"
  as permissive
  for select
  to public
using ((auth.uid() = parent_id));



  create policy "module_unlocks_delete_own_or_admin"
  on "public"."module_unlocks"
  as permissive
  for delete
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "module_unlocks_insert_own_or_admin"
  on "public"."module_unlocks"
  as permissive
  for insert
  to authenticated
with check (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "module_unlocks_select_own_or_admin"
  on "public"."module_unlocks"
  as permissive
  for select
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "module_unlocks_update_own_or_admin"
  on "public"."module_unlocks"
  as permissive
  for update
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()))
with check (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "module_variants_select_policy"
  on "public"."module_variants"
  as permissive
  for select
  to public
using (true);



  create policy "module_variants_service_delete"
  on "public"."module_variants"
  as permissive
  for delete
  to public
using (true);



  create policy "module_variants_service_insert"
  on "public"."module_variants"
  as permissive
  for insert
  to public
with check (true);



  create policy "module_variants_service_update"
  on "public"."module_variants"
  as permissive
  for update
  to public
using (true);



  create policy "Admins can manage all modules"
  on "public"."modules"
  as permissive
  for all
  to public
using (public.is_user_admin_module_check());



  create policy "Allow authenticated delete on modules"
  on "public"."modules"
  as permissive
  for delete
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Anyone can view active modules"
  on "public"."modules"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "Service role can manage modules"
  on "public"."modules"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text));



  create policy "modules_delete_admin_only"
  on "public"."modules"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "modules_insert_admin_only"
  on "public"."modules"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "modules_select_all_authenticated"
  on "public"."modules"
  as permissive
  for select
  to authenticated
using (true);



  create policy "modules_update_admin_only"
  on "public"."modules"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Allow authenticated users to delete modules_to_generate"
  on "public"."modules_to_generate"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Allow authenticated users to insert modules_to_generate"
  on "public"."modules_to_generate"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to update modules_to_generate"
  on "public"."modules_to_generate"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Allow authenticated users to view modules_to_generate"
  on "public"."modules_to_generate"
  as permissive
  for select
  to authenticated
using (true);



  create policy "modules_to_generate_delete_own_or_admin"
  on "public"."modules_to_generate"
  as permissive
  for delete
  to authenticated
using (((created_by = auth.uid()) OR public.is_sys_admin()));



  create policy "modules_to_generate_insert_own_or_admin"
  on "public"."modules_to_generate"
  as permissive
  for insert
  to authenticated
with check (((created_by = auth.uid()) OR public.is_sys_admin()));



  create policy "modules_to_generate_select_own_or_admin"
  on "public"."modules_to_generate"
  as permissive
  for select
  to authenticated
using (((created_by = auth.uid()) OR public.is_sys_admin()));



  create policy "modules_to_generate_update_own_or_admin"
  on "public"."modules_to_generate"
  as permissive
  for update
  to authenticated
using (((created_by = auth.uid()) OR public.is_sys_admin()))
with check (((created_by = auth.uid()) OR public.is_sys_admin()));



  create policy "Authenticated users can view ndis_domains"
  on "public"."ndis_domains"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify ndis_domains"
  on "public"."ndis_domains"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "ndis_domains_delete_admin_only"
  on "public"."ndis_domains"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "ndis_domains_insert_admin_only"
  on "public"."ndis_domains"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "ndis_domains_select_all_authenticated"
  on "public"."ndis_domains"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ndis_domains_update_admin_only"
  on "public"."ndis_domains"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "needs_based_pathways_delete_admin_only"
  on "public"."needs_based_pathways"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "needs_based_pathways_insert_admin_only"
  on "public"."needs_based_pathways"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "needs_based_pathways_select_all_authenticated"
  on "public"."needs_based_pathways"
  as permissive
  for select
  to authenticated
using (true);



  create policy "needs_based_pathways_update_admin_only"
  on "public"."needs_based_pathways"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Admins can manage all parent modules"
  on "public"."parent_modules"
  as permissive
  for all
  to public
using (public.is_user_admin_module_check());



  create policy "Parents can insert their own modules"
  on "public"."parent_modules"
  as permissive
  for insert
  to authenticated
with check ((parent_id = auth.uid()));



  create policy "Parents can view their own modules"
  on "public"."parent_modules"
  as permissive
  for select
  to public
using ((parent_id = auth.uid()));



  create policy "Service role can manage parent modules"
  on "public"."parent_modules"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text));



  create policy "parent_modules_delete_own_or_admin"
  on "public"."parent_modules"
  as permissive
  for delete
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_modules_insert_own_or_admin"
  on "public"."parent_modules"
  as permissive
  for insert
  to authenticated
with check (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_modules_select_own_or_admin"
  on "public"."parent_modules"
  as permissive
  for select
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_modules_update_own_or_admin"
  on "public"."parent_modules"
  as permissive
  for update
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()))
with check (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "Admins can update all profiles"
  on "public"."parent_profiles"
  as permissive
  for update
  to public
using (((auth.uid() = id) OR (public.is_user_admin_check(auth.uid()) = true)));



  create policy "Admins can view all profiles"
  on "public"."parent_profiles"
  as permissive
  for select
  to public
using (((auth.uid() = id) OR (public.is_user_admin_check(auth.uid()) = true)));



  create policy "Service role can insert profiles"
  on "public"."parent_profiles"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can update their own profile"
  on "public"."parent_profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view their own profile"
  on "public"."parent_profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "parent_profiles_delete_own_or_admin"
  on "public"."parent_profiles"
  as permissive
  for delete
  to authenticated
using (((id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_profiles_insert_own_or_admin"
  on "public"."parent_profiles"
  as permissive
  for insert
  to authenticated
with check (((id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_profiles_select_own_or_admin"
  on "public"."parent_profiles"
  as permissive
  for select
  to authenticated
using (((id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_profiles_update_own_or_admin"
  on "public"."parent_profiles"
  as permissive
  for update
  to authenticated
using (((id = auth.uid()) OR public.is_sys_admin()))
with check (((id = auth.uid()) OR public.is_sys_admin()));



  create policy "Authenticated users can view parent scripts"
  on "public"."parent_scripts"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify parent scripts"
  on "public"."parent_scripts"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "parent_scripts_delete_admin_only"
  on "public"."parent_scripts"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "parent_scripts_insert_admin_only"
  on "public"."parent_scripts"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "parent_scripts_select_all_authenticated"
  on "public"."parent_scripts"
  as permissive
  for select
  to authenticated
using (true);



  create policy "parent_scripts_update_admin_only"
  on "public"."parent_scripts"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Users can update own subscription (testing)"
  on "public"."parent_subscriptions"
  as permissive
  for update
  to public
using ((auth.uid() = parent_id))
with check ((auth.uid() = parent_id));



  create policy "Users can upsert own subscription (testing)"
  on "public"."parent_subscriptions"
  as permissive
  for insert
  to public
with check ((auth.uid() = parent_id));



  create policy "Users can view own subscription"
  on "public"."parent_subscriptions"
  as permissive
  for select
  to public
using ((auth.uid() = parent_id));



  create policy "parent_subscriptions_delete_own_or_admin"
  on "public"."parent_subscriptions"
  as permissive
  for delete
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_subscriptions_insert_own_or_admin"
  on "public"."parent_subscriptions"
  as permissive
  for insert
  to authenticated
with check (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_subscriptions_select_own_or_admin"
  on "public"."parent_subscriptions"
  as permissive
  for select
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "parent_subscriptions_update_own_or_admin"
  on "public"."parent_subscriptions"
  as permissive
  for update
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()))
with check (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "Parents can delete pathway assessments for their children"
  on "public"."pathway_assessments"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = pathway_assessments.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Parents can insert pathway assessments for their children"
  on "public"."pathway_assessments"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = pathway_assessments.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Parents can read pathway assessments for their children"
  on "public"."pathway_assessments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = pathway_assessments.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Parents can update pathway assessments for their children"
  on "public"."pathway_assessments"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = pathway_assessments.child_id) AND (c.parent_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.children c
  WHERE ((c.id = pathway_assessments.child_id) AND (c.parent_user_id = auth.uid())))));



  create policy "Users can delete their children's assessments"
  on "public"."pathway_assessments"
  as permissive
  for delete
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can insert assessments for their children"
  on "public"."pathway_assessments"
  as permissive
  for insert
  to public
with check ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can update their children's assessments"
  on "public"."pathway_assessments"
  as permissive
  for update
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can view their children's assessments"
  on "public"."pathway_assessments"
  as permissive
  for select
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "pathway_assessments_delete_own_child_or_admin"
  on "public"."pathway_assessments"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "pathway_assessments_insert_own_child_or_admin"
  on "public"."pathway_assessments"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "pathway_assessments_select_own_child_or_admin"
  on "public"."pathway_assessments"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "pathway_assessments_update_own_child_or_admin"
  on "public"."pathway_assessments"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "Authenticated users can view pathways"
  on "public"."pathways"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify pathways"
  on "public"."pathways"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "pathways_delete_admin_only"
  on "public"."pathways"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "pathways_insert_admin_only"
  on "public"."pathways"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "pathways_select_all_authenticated"
  on "public"."pathways"
  as permissive
  for select
  to authenticated
using (true);



  create policy "pathways_update_admin_only"
  on "public"."pathways"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Users can create purchases for own children"
  on "public"."reward_purchases"
  as permissive
  for insert
  to public
with check ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can update own children purchases"
  on "public"."reward_purchases"
  as permissive
  for update
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "Users can view own children purchases"
  on "public"."reward_purchases"
  as permissive
  for select
  to public
using ((child_id IN ( SELECT children.id
   FROM public.children
  WHERE (children.parent_user_id = auth.uid()))));



  create policy "reward_purchases_delete_own_child_or_admin"
  on "public"."reward_purchases"
  as permissive
  for delete
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "reward_purchases_insert_own_child_or_admin"
  on "public"."reward_purchases"
  as permissive
  for insert
  to authenticated
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "reward_purchases_select_own_child_or_admin"
  on "public"."reward_purchases"
  as permissive
  for select
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "reward_purchases_update_own_child_or_admin"
  on "public"."reward_purchases"
  as permissive
  for update
  to authenticated
using ((public.owns_child(child_id) OR public.is_sys_admin()))
with check ((public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "Users can create custom rewards"
  on "public"."rewards"
  as permissive
  for insert
  to public
with check (((parent_user_id = auth.uid()) AND (is_baseline = false)));



  create policy "Users can delete own rewards"
  on "public"."rewards"
  as permissive
  for delete
  to public
using (((parent_user_id = auth.uid()) AND (is_baseline = false)));



  create policy "Users can update own rewards"
  on "public"."rewards"
  as permissive
  for update
  to public
using (((parent_user_id = auth.uid()) AND (is_baseline = false)))
with check (((parent_user_id = auth.uid()) AND (is_baseline = false)));



  create policy "Users can view baseline and own custom rewards"
  on "public"."rewards"
  as permissive
  for select
  to public
using (((is_baseline = true) OR (parent_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.parent_profiles
  WHERE ((parent_profiles.id = auth.uid()) AND (parent_profiles.is_admin = true))))));



  create policy "Users can view baseline and own rewards"
  on "public"."rewards"
  as permissive
  for select
  to public
using (((is_baseline = true) OR (parent_user_id = auth.uid())));



  create policy "rewards_delete_own_or_admin"
  on "public"."rewards"
  as permissive
  for delete
  to authenticated
using (((parent_user_id = auth.uid()) OR public.is_sys_admin()));



  create policy "rewards_insert_own_or_admin"
  on "public"."rewards"
  as permissive
  for insert
  to authenticated
with check (((parent_user_id = auth.uid()) OR public.is_sys_admin()));



  create policy "rewards_select_baseline_or_own_or_admin"
  on "public"."rewards"
  as permissive
  for select
  to authenticated
using (((is_baseline = true) OR (parent_user_id = auth.uid()) OR public.is_sys_admin()));



  create policy "rewards_update_own_or_admin"
  on "public"."rewards"
  as permissive
  for update
  to authenticated
using (((parent_user_id = auth.uid()) OR public.is_sys_admin()))
with check (((parent_user_id = auth.uid()) OR public.is_sys_admin()));



  create policy "roadblock_config_delete_admin_only"
  on "public"."roadblock_config"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "roadblock_config_insert_admin_only"
  on "public"."roadblock_config"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "roadblock_config_select_all_authenticated"
  on "public"."roadblock_config"
  as permissive
  for select
  to authenticated
using (true);



  create policy "roadblock_config_update_admin_only"
  on "public"."roadblock_config"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "roadblocks_delete_admin_only"
  on "public"."roadblocks"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "roadblocks_insert_admin_only"
  on "public"."roadblocks"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "roadblocks_select_all_authenticated"
  on "public"."roadblocks"
  as permissive
  for select
  to authenticated
using (true);



  create policy "roadblocks_update_admin_only"
  on "public"."roadblocks"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "sequencing_rules_delete_admin_only"
  on "public"."sequencing_rules"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "sequencing_rules_insert_admin_only"
  on "public"."sequencing_rules"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "sequencing_rules_select_all_authenticated"
  on "public"."sequencing_rules"
  as permissive
  for select
  to authenticated
using (true);



  create policy "sequencing_rules_update_admin_only"
  on "public"."sequencing_rules"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Authenticated users can view series"
  on "public"."series"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify series"
  on "public"."series"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "series_delete_admin_only"
  on "public"."series"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "series_insert_admin_only"
  on "public"."series"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "series_select_all_authenticated"
  on "public"."series"
  as permissive
  for select
  to authenticated
using (true);



  create policy "series_update_admin_only"
  on "public"."series"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Allow authenticated users to read settings"
  on "public"."settings"
  as permissive
  for select
  to authenticated
using (true);



  create policy "settings_delete_admin_only"
  on "public"."settings"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "settings_insert_admin_only"
  on "public"."settings"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "settings_select"
  on "public"."settings"
  as permissive
  for select
  to authenticated
using (true);



  create policy "settings_select_all_authenticated"
  on "public"."settings"
  as permissive
  for select
  to authenticated
using (true);



  create policy "settings_select_authenticated"
  on "public"."settings"
  as permissive
  for select
  to authenticated
using (true);



  create policy "settings_update"
  on "public"."settings"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "settings_update_admin_only"
  on "public"."settings"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "settings_update_authenticated"
  on "public"."settings"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Authenticated users can view skills"
  on "public"."skills"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify skills"
  on "public"."skills"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "skills_delete_admin_only"
  on "public"."skills"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "skills_insert_admin_only"
  on "public"."skills"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "skills_select_all_authenticated"
  on "public"."skills"
  as permissive
  for select
  to authenticated
using (true);



  create policy "skills_update_admin_only"
  on "public"."skills"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Enable read access for all users"
  on "public"."sub_skills"
  as permissive
  for select
  to authenticated
using (true);



  create policy "sub_skills_delete_admin_only"
  on "public"."sub_skills"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "sub_skills_insert_admin_only"
  on "public"."sub_skills"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "sub_skills_select_all_authenticated"
  on "public"."sub_skills"
  as permissive
  for select
  to authenticated
using (true);



  create policy "sub_skills_update_admin_only"
  on "public"."sub_skills"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Service role can insert credits"
  on "public"."subscription_credit_ledger"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "Service role can select credits"
  on "public"."subscription_credit_ledger"
  as permissive
  for select
  to service_role
using (true);



  create policy "Users can insert self credit adjustments"
  on "public"."subscription_credit_ledger"
  as permissive
  for insert
  to public
with check (((auth.uid() = parent_id) AND (entry_type = ANY (ARRAY['grant'::text, 'adjustment'::text, 'refund'::text])) AND (credits_delta > 0)));



  create policy "Users can insert spend entries"
  on "public"."subscription_credit_ledger"
  as permissive
  for insert
  to public
with check (((auth.uid() = parent_id) AND (entry_type = 'spend'::text) AND (credits_delta < 0)));



  create policy "Users can view own credit ledger"
  on "public"."subscription_credit_ledger"
  as permissive
  for select
  to public
using ((auth.uid() = parent_id));



  create policy "subscription_credit_ledger_delete_own_or_admin"
  on "public"."subscription_credit_ledger"
  as permissive
  for delete
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "subscription_credit_ledger_insert_own_or_admin"
  on "public"."subscription_credit_ledger"
  as permissive
  for insert
  to authenticated
with check (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "subscription_credit_ledger_select_own_or_admin"
  on "public"."subscription_credit_ledger"
  as permissive
  for select
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "subscription_credit_ledger_update_own_or_admin"
  on "public"."subscription_credit_ledger"
  as permissive
  for update
  to authenticated
using (((parent_id = auth.uid()) OR public.is_sys_admin()))
with check (((parent_id = auth.uid()) OR public.is_sys_admin()));



  create policy "Users can view active tiers"
  on "public"."subscription_tiers"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "subscription_tiers_delete_admin_only"
  on "public"."subscription_tiers"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "subscription_tiers_insert_admin_only"
  on "public"."subscription_tiers"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "subscription_tiers_select_all_authenticated"
  on "public"."subscription_tiers"
  as permissive
  for select
  to authenticated
using (true);



  create policy "subscription_tiers_update_admin_only"
  on "public"."subscription_tiers"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Enable read access for all users"
  on "public"."super_skills"
  as permissive
  for select
  to authenticated
using (true);



  create policy "super_skills_delete_admin_only"
  on "public"."super_skills"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "super_skills_insert_admin_only"
  on "public"."super_skills"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "super_skills_select_all_authenticated"
  on "public"."super_skills"
  as permissive
  for select
  to authenticated
using (true);



  create policy "super_skills_update_admin_only"
  on "public"."super_skills"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Allow authenticated users to delete theory connections"
  on "public"."theory_connections"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to insert theory connections"
  on "public"."theory_connections"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to read theory connections"
  on "public"."theory_connections"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to update theory connections"
  on "public"."theory_connections"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "theory_connections_delete_admin_only"
  on "public"."theory_connections"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "theory_connections_insert_admin_only"
  on "public"."theory_connections"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "theory_connections_select_all_authenticated"
  on "public"."theory_connections"
  as permissive
  for select
  to authenticated
using (true);



  create policy "theory_connections_update_admin_only"
  on "public"."theory_connections"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Authenticated users can view tools"
  on "public"."tools"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Only admins can modify tools"
  on "public"."tools"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));



  create policy "tools_delete_admin_only"
  on "public"."tools"
  as permissive
  for delete
  to authenticated
using (public.is_sys_admin());



  create policy "tools_insert_admin_only"
  on "public"."tools"
  as permissive
  for insert
  to authenticated
with check (public.is_sys_admin());



  create policy "tools_select_all_authenticated"
  on "public"."tools"
  as permissive
  for select
  to authenticated
using (true);



  create policy "tools_update_admin_only"
  on "public"."tools"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



  create policy "Parents can insert their own weekly checkins"
  on "public"."weekly_checkins"
  as permissive
  for insert
  to public
with check ((auth.uid() = parent_user_id));



  create policy "Parents can update their own weekly checkins"
  on "public"."weekly_checkins"
  as permissive
  for update
  to public
using ((auth.uid() = parent_user_id));



  create policy "Parents can view their own weekly checkins"
  on "public"."weekly_checkins"
  as permissive
  for select
  to public
using ((auth.uid() = parent_user_id));



  create policy "weekly_checkins_delete_own_or_admin"
  on "public"."weekly_checkins"
  as permissive
  for delete
  to authenticated
using (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "weekly_checkins_insert_own_or_admin"
  on "public"."weekly_checkins"
  as permissive
  for insert
  to authenticated
with check (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "weekly_checkins_select_own_or_admin"
  on "public"."weekly_checkins"
  as permissive
  for select
  to authenticated
using (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));



  create policy "weekly_checkins_update_own_or_admin"
  on "public"."weekly_checkins"
  as permissive
  for update
  to authenticated
using (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()))
with check (((parent_user_id = auth.uid()) OR public.owns_child(child_id) OR public.is_sys_admin()));


CREATE TRIGGER trigger_age_ranges_updated_at BEFORE UPDATE ON public.age_ranges FOR EACH ROW EXECUTE FUNCTION public.update_age_ranges_updated_at();

CREATE TRIGGER update_ai_generation_jobs_updated_at BEFORE UPDATE ON public.ai_generation_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_audit_rules_updated_at BEFORE UPDATE ON public.audit_rules FOR EACH ROW EXECUTE FUNCTION public.update_audit_rules_updated_at();

CREATE TRIGGER trigger_audit_sections_updated_at BEFORE UPDATE ON public.audit_sections FOR EACH ROW EXECUTE FUNCTION public.update_audit_sections_updated_at();

CREATE TRIGGER category_colors_updated_at BEFORE UPDATE ON public.category_colors FOR EACH ROW EXECUTE FUNCTION public.update_category_colors_updated_at();

CREATE TRIGGER trg_child_focus_plan_set_updated_at BEFORE UPDATE ON public.child_focus_plan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sync_child_module_child_name BEFORE INSERT OR UPDATE OF child_id ON public.child_modules FOR EACH ROW EXECUTE FUNCTION public.sync_child_module_child_name();

CREATE TRIGGER trg_sync_child_module_title BEFORE INSERT OR UPDATE OF module_id ON public.child_modules FOR EACH ROW EXECUTE FUNCTION public.sync_child_module_title();

CREATE TRIGGER trg_propagate_child_name_change AFTER UPDATE OF name ON public.children FOR EACH ROW EXECUTE FUNCTION public.propagate_child_name_change();

CREATE TRIGGER trigger_update_spendable_stars BEFORE INSERT OR UPDATE OF stars, spent_stars ON public.children FOR EACH ROW EXECUTE FUNCTION public.update_spendable_stars();

CREATE TRIGGER trigger_core_theories_updated_at BEFORE UPDATE ON public.core_theories FOR EACH ROW EXECUTE FUNCTION public.update_core_theories_updated_at();

CREATE TRIGGER trigger_forbidden_terms_updated_at BEFORE UPDATE ON public.forbidden_terms FOR EACH ROW EXECUTE FUNCTION public.update_forbidden_terms_updated_at();

CREATE TRIGGER update_levels_updated_at BEFORE UPDATE ON public.levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_module_responses_updated_at BEFORE UPDATE ON public.module_responses FOR EACH ROW EXECUTE FUNCTION public.update_module_responses_updated_at();

CREATE TRIGGER check_secondary_theory_count BEFORE INSERT ON public.module_secondary_theories FOR EACH ROW EXECUTE FUNCTION public.validate_secondary_theory_count();

CREATE TRIGGER on_module_created AFTER INSERT ON public.modules FOR EACH ROW EXECUTE FUNCTION public.add_module_to_all_parents();

CREATE TRIGGER trigger_modules_to_generate_updated_at BEFORE UPDATE ON public.modules_to_generate FOR EACH ROW EXECUTE FUNCTION public.update_modules_to_generate_updated_at();

CREATE TRIGGER tr_parent_subscriptions_updated_at BEFORE UPDATE ON public.parent_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER set_pathway_assessments_updated_at BEFORE UPDATE ON public.pathway_assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_pathway_assessments_updated_at BEFORE UPDATE ON public.pathway_assessments FOR EACH ROW EXECUTE FUNCTION public.update_pathway_assessments_updated_at();

CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

CREATE TRIGGER tr_subscription_tiers_updated_at BEFORE UPDATE ON public.subscription_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER update_theory_connections_updated_at BEFORE UPDATE ON public.theory_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


  create policy "Authenticated users can delete modules"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'modules'::text));



  create policy "Authenticated users can update modules"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'modules'::text))
with check ((bucket_id = 'modules'::text));



  create policy "Authenticated users can upload modules"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'modules'::text));



  create policy "Public can read modules"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'modules'::text));



