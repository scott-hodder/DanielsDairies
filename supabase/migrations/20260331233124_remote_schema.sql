drop trigger if exists "trigger_age_ranges_updated_at" on "public"."age_ranges";

drop trigger if exists "update_ai_generation_jobs_updated_at" on "public"."ai_generation_jobs";

drop trigger if exists "trigger_audit_rules_updated_at" on "public"."audit_rules";

drop trigger if exists "trigger_audit_sections_updated_at" on "public"."audit_sections";

drop trigger if exists "category_colors_updated_at" on "public"."category_colors";

drop trigger if exists "trg_child_focus_plan_set_updated_at" on "public"."child_focus_plan";

drop trigger if exists "trg_sync_child_module_child_name" on "public"."child_modules";

drop trigger if exists "trg_sync_child_module_title" on "public"."child_modules";

drop trigger if exists "trg_propagate_child_name_change" on "public"."children";

drop trigger if exists "trigger_update_spendable_stars" on "public"."children";

drop trigger if exists "trigger_core_theories_updated_at" on "public"."core_theories";

drop trigger if exists "trigger_forbidden_terms_updated_at" on "public"."forbidden_terms";

drop trigger if exists "update_levels_updated_at" on "public"."levels";

drop trigger if exists "update_module_responses_updated_at" on "public"."module_responses";

drop trigger if exists "check_secondary_theory_count" on "public"."module_secondary_theories";

drop trigger if exists "on_module_created" on "public"."modules";

drop trigger if exists "trigger_modules_to_generate_updated_at" on "public"."modules_to_generate";

drop trigger if exists "tr_parent_subscriptions_updated_at" on "public"."parent_subscriptions";

drop trigger if exists "set_pathway_assessments_updated_at" on "public"."pathway_assessments";

drop trigger if exists "trigger_pathway_assessments_updated_at" on "public"."pathway_assessments";

drop trigger if exists "settings_updated_at" on "public"."settings";

drop trigger if exists "tr_subscription_tiers_updated_at" on "public"."subscription_tiers";

drop trigger if exists "update_theory_connections_updated_at" on "public"."theory_connections";

drop policy "age_ranges_delete_admin_only" on "public"."age_ranges";

drop policy "age_ranges_insert_admin_only" on "public"."age_ranges";

drop policy "age_ranges_update_admin_only" on "public"."age_ranges";

drop policy "ai_generation_jobs_delete_admin_only" on "public"."ai_generation_jobs";

drop policy "ai_generation_jobs_insert_admin_only" on "public"."ai_generation_jobs";

drop policy "ai_generation_jobs_update_admin_only" on "public"."ai_generation_jobs";

drop policy "ai_module_config_delete_admin_only" on "public"."ai_module_config";

drop policy "ai_module_config_insert_admin_only" on "public"."ai_module_config";

drop policy "ai_module_config_update_admin_only" on "public"."ai_module_config";

drop policy "assessment_questions_delete_admin_only" on "public"."assessment_questions";

drop policy "assessment_questions_insert_admin_only" on "public"."assessment_questions";

drop policy "assessment_questions_update_admin_only" on "public"."assessment_questions";

drop policy "audit_criteria_delete_admin_only" on "public"."audit_criteria";

drop policy "audit_criteria_insert_admin_only" on "public"."audit_criteria";

drop policy "audit_criteria_update_admin_only" on "public"."audit_criteria";

drop policy "audit_rules_delete_admin_only" on "public"."audit_rules";

drop policy "audit_rules_insert_admin_only" on "public"."audit_rules";

drop policy "audit_rules_update_admin_only" on "public"."audit_rules";

drop policy "audit_sections_delete_admin_only" on "public"."audit_sections";

drop policy "audit_sections_insert_admin_only" on "public"."audit_sections";

drop policy "audit_sections_update_admin_only" on "public"."audit_sections";

drop policy "badges_delete_admin_only" on "public"."badges";

drop policy "badges_insert_admin_only" on "public"."badges";

drop policy "badges_update_admin_only" on "public"."badges";

drop policy "brain_town_vocabulary_delete_admin_only" on "public"."brain_town_vocabulary";

drop policy "brain_town_vocabulary_insert_admin_only" on "public"."brain_town_vocabulary";

drop policy "brain_town_vocabulary_update_admin_only" on "public"."brain_town_vocabulary";

drop policy "Only admins can modify category_colors" on "public"."category_colors";

drop policy "category_colors_delete_admin_only" on "public"."category_colors";

drop policy "category_colors_insert_admin_only" on "public"."category_colors";

drop policy "category_colors_update_admin_only" on "public"."category_colors";

drop policy "characters_delete_admin_only" on "public"."characters";

drop policy "characters_insert_admin_only" on "public"."characters";

drop policy "characters_update_admin_only" on "public"."characters";

drop policy "checkin_challenges_delete_admin_only" on "public"."checkin_challenges";

drop policy "checkin_challenges_insert_admin_only" on "public"."checkin_challenges";

drop policy "checkin_challenges_update_admin_only" on "public"."checkin_challenges";

drop policy "checkin_goals_delete_admin_only" on "public"."checkin_goals";

drop policy "checkin_goals_insert_admin_only" on "public"."checkin_goals";

drop policy "checkin_goals_update_admin_only" on "public"."checkin_goals";

drop policy "checkin_triggers_delete_admin_only" on "public"."checkin_triggers";

drop policy "checkin_triggers_insert_admin_only" on "public"."checkin_triggers";

drop policy "checkin_triggers_update_admin_only" on "public"."checkin_triggers";

drop policy "child_badges_delete_own_child_or_admin" on "public"."child_badges";

drop policy "child_badges_insert_own_child_or_admin" on "public"."child_badges";

drop policy "child_badges_select_own_child_or_admin" on "public"."child_badges";

drop policy "child_badges_update_own_child_or_admin" on "public"."child_badges";

drop policy "child_cycle_progress_delete_own_child_or_admin" on "public"."child_cycle_progress";

drop policy "child_cycle_progress_insert_own_child_or_admin" on "public"."child_cycle_progress";

drop policy "child_cycle_progress_select_own_child_or_admin" on "public"."child_cycle_progress";

drop policy "child_cycle_progress_update_own_child_or_admin" on "public"."child_cycle_progress";

drop policy "Parents can delete their children's focus plans" on "public"."child_focus_plan";

drop policy "Parents can insert focus plans for their children" on "public"."child_focus_plan";

drop policy "Parents can update their children's focus plans" on "public"."child_focus_plan";

drop policy "Parents can view their children's focus plans" on "public"."child_focus_plan";

drop policy "child_focus_plan_delete_own_child_or_admin" on "public"."child_focus_plan";

drop policy "child_focus_plan_insert_own_child_or_admin" on "public"."child_focus_plan";

drop policy "child_focus_plan_select_own_child_or_admin" on "public"."child_focus_plan";

drop policy "child_focus_plan_update_own_child_or_admin" on "public"."child_focus_plan";

drop policy "Admins can manage all child modules" on "public"."child_modules";

drop policy "Parents can view children modules" on "public"."child_modules";

drop policy "Users can insert their children's modules" on "public"."child_modules";

drop policy "Users can update their children's modules" on "public"."child_modules";

drop policy "Users can view their children's modules" on "public"."child_modules";

drop policy "child_modules_delete_own_child_or_admin" on "public"."child_modules";

drop policy "child_modules_insert_own_child_or_admin" on "public"."child_modules";

drop policy "child_modules_select_own_child_or_admin" on "public"."child_modules";

drop policy "child_modules_update_own_child_or_admin" on "public"."child_modules";

drop policy "delete_child_modules_for_own_children" on "public"."child_modules";

drop policy "insert_child_modules_for_own_children" on "public"."child_modules";

drop policy "select_child_modules_for_own_children" on "public"."child_modules";

drop policy "update_child_modules_for_own_children" on "public"."child_modules";

drop policy "Parents can insert mood check-ins for their children" on "public"."child_mood_checkins";

drop policy "Parents can read mood check-ins for their children" on "public"."child_mood_checkins";

drop policy "Users can insert own children roadblock completions" on "public"."child_roadblock_completions";

drop policy "Users can view own children roadblock completions" on "public"."child_roadblock_completions";

drop policy "child_roadblock_completions_delete_own_child_or_admin" on "public"."child_roadblock_completions";

drop policy "child_roadblock_completions_insert_own_child_or_admin" on "public"."child_roadblock_completions";

drop policy "child_roadblock_completions_select_own_child_or_admin" on "public"."child_roadblock_completions";

drop policy "child_roadblock_completions_update_own_child_or_admin" on "public"."child_roadblock_completions";

drop policy "child_roadblocks_delete_own_child_or_admin" on "public"."child_roadblocks";

drop policy "child_roadblocks_insert_own_child_or_admin" on "public"."child_roadblocks";

drop policy "child_roadblocks_select_own_child_or_admin" on "public"."child_roadblocks";

drop policy "child_roadblocks_update_own_child_or_admin" on "public"."child_roadblocks";

drop policy "child_super_skill_progress_delete_own_child_or_admin" on "public"."child_super_skill_progress";

drop policy "child_super_skill_progress_insert_own_child_or_admin" on "public"."child_super_skill_progress";

drop policy "child_super_skill_progress_select_own_child_or_admin" on "public"."child_super_skill_progress";

drop policy "child_super_skill_progress_update_own_child_or_admin" on "public"."child_super_skill_progress";

drop policy "children_delete_own_or_admin" on "public"."children";

drop policy "children_insert_own_or_admin" on "public"."children";

drop policy "children_select_own_or_admin" on "public"."children";

drop policy "children_update_own_or_admin" on "public"."children";

drop policy "core_theories_delete_admin_only" on "public"."core_theories";

drop policy "core_theories_insert_admin_only" on "public"."core_theories";

drop policy "core_theories_update_admin_only" on "public"."core_theories";

drop policy "cycles_delete_admin_only" on "public"."cycles";

drop policy "cycles_insert_admin_only" on "public"."cycles";

drop policy "cycles_update_admin_only" on "public"."cycles";

drop policy "Users can insert own children quest completions" on "public"."daily_quest_completions";

drop policy "Users can view own children quest completions" on "public"."daily_quest_completions";

drop policy "daily_quest_completions_delete_own_child_or_admin" on "public"."daily_quest_completions";

drop policy "daily_quest_completions_insert_own_child_or_admin" on "public"."daily_quest_completions";

drop policy "daily_quest_completions_select_own_child_or_admin" on "public"."daily_quest_completions";

drop policy "daily_quest_completions_update_own_child_or_admin" on "public"."daily_quest_completions";

drop policy "diagnosis_profiles_delete_admin_only" on "public"."diagnosis_profiles";

drop policy "diagnosis_profiles_insert_admin_only" on "public"."diagnosis_profiles";

drop policy "diagnosis_profiles_update_admin_only" on "public"."diagnosis_profiles";

drop policy "Only admins can modify dss_sedi_categories" on "public"."dss_sedi_categories";

drop policy "dss_sedi_categories_delete_admin_only" on "public"."dss_sedi_categories";

drop policy "dss_sedi_categories_insert_admin_only" on "public"."dss_sedi_categories";

drop policy "dss_sedi_categories_update_admin_only" on "public"."dss_sedi_categories";

drop policy "Only admins can modify emotions" on "public"."emotions";

drop policy "emotions_delete_admin_only" on "public"."emotions";

drop policy "emotions_insert_admin_only" on "public"."emotions";

drop policy "emotions_update_admin_only" on "public"."emotions";

drop policy "Only admins can modify fasd_domains" on "public"."fasd_domains";

drop policy "fasd_domains_delete_admin_only" on "public"."fasd_domains";

drop policy "fasd_domains_insert_admin_only" on "public"."fasd_domains";

drop policy "fasd_domains_update_admin_only" on "public"."fasd_domains";

drop policy "focus_plan_categories_delete_admin_only" on "public"."focus_plan_categories";

drop policy "focus_plan_categories_insert_admin_only" on "public"."focus_plan_categories";

drop policy "focus_plan_categories_update_admin_only" on "public"."focus_plan_categories";

drop policy "focus_plan_frequencies_delete_admin_only" on "public"."focus_plan_frequencies";

drop policy "focus_plan_frequencies_insert_admin_only" on "public"."focus_plan_frequencies";

drop policy "focus_plan_frequencies_update_admin_only" on "public"."focus_plan_frequencies";

drop policy "focus_plan_goals_delete_admin_only" on "public"."focus_plan_goals";

drop policy "focus_plan_goals_insert_admin_only" on "public"."focus_plan_goals";

drop policy "focus_plan_goals_update_admin_only" on "public"."focus_plan_goals";

drop policy "focus_plan_intensities_delete_admin_only" on "public"."focus_plan_intensities";

drop policy "focus_plan_intensities_insert_admin_only" on "public"."focus_plan_intensities";

drop policy "focus_plan_intensities_update_admin_only" on "public"."focus_plan_intensities";

drop policy "forbidden_terms_delete_admin_only" on "public"."forbidden_terms";

drop policy "forbidden_terms_insert_admin_only" on "public"."forbidden_terms";

drop policy "forbidden_terms_update_admin_only" on "public"."forbidden_terms";

drop policy "levels_delete_admin_only" on "public"."levels";

drop policy "levels_insert_admin_only" on "public"."levels";

drop policy "levels_update_admin_only" on "public"."levels";

drop policy "Users can insert their own login streaks" on "public"."login_streaks";

drop policy "Users can update their own login streaks" on "public"."login_streaks";

drop policy "Users can view their own login streaks" on "public"."login_streaks";

drop policy "login_streaks_delete_own_or_admin" on "public"."login_streaks";

drop policy "login_streaks_insert_own_or_admin" on "public"."login_streaks";

drop policy "login_streaks_select_own_or_admin" on "public"."login_streaks";

drop policy "login_streaks_update_own_or_admin" on "public"."login_streaks";

drop policy "Admins can manage all module responses" on "public"."module_responses";

drop policy "Parents can view children responses" on "public"."module_responses";

drop policy "Users can delete responses for their children" on "public"."module_responses";

drop policy "Users can insert responses for their children" on "public"."module_responses";

drop policy "Users can update responses for their children" on "public"."module_responses";

drop policy "Users can view their children's responses" on "public"."module_responses";

drop policy "module_responses_delete_own_or_admin" on "public"."module_responses";

drop policy "module_responses_insert_own_or_admin" on "public"."module_responses";

drop policy "module_responses_select_own_or_admin" on "public"."module_responses";

drop policy "module_responses_update_own_or_admin" on "public"."module_responses";

drop policy "Only admins can modify module_secondary_theories" on "public"."module_secondary_theories";

drop policy "module_secondary_theories_delete_admin_only" on "public"."module_secondary_theories";

drop policy "module_secondary_theories_insert_admin_only" on "public"."module_secondary_theories";

drop policy "module_secondary_theories_update_admin_only" on "public"."module_secondary_theories";

drop policy "module_unlocks_delete_own_or_admin" on "public"."module_unlocks";

drop policy "module_unlocks_insert_own_or_admin" on "public"."module_unlocks";

drop policy "module_unlocks_select_own_or_admin" on "public"."module_unlocks";

drop policy "module_unlocks_update_own_or_admin" on "public"."module_unlocks";

drop policy "Admins can manage all modules" on "public"."modules";

drop policy "modules_delete_admin_only" on "public"."modules";

drop policy "modules_insert_admin_only" on "public"."modules";

drop policy "modules_update_admin_only" on "public"."modules";

drop policy "modules_to_generate_delete_own_or_admin" on "public"."modules_to_generate";

drop policy "modules_to_generate_insert_own_or_admin" on "public"."modules_to_generate";

drop policy "modules_to_generate_select_own_or_admin" on "public"."modules_to_generate";

drop policy "modules_to_generate_update_own_or_admin" on "public"."modules_to_generate";

drop policy "Only admins can modify ndis_domains" on "public"."ndis_domains";

drop policy "ndis_domains_delete_admin_only" on "public"."ndis_domains";

drop policy "ndis_domains_insert_admin_only" on "public"."ndis_domains";

drop policy "ndis_domains_update_admin_only" on "public"."ndis_domains";

drop policy "needs_based_pathways_delete_admin_only" on "public"."needs_based_pathways";

drop policy "needs_based_pathways_insert_admin_only" on "public"."needs_based_pathways";

drop policy "needs_based_pathways_update_admin_only" on "public"."needs_based_pathways";

drop policy "Admins can manage all parent modules" on "public"."parent_modules";

drop policy "parent_modules_delete_own_or_admin" on "public"."parent_modules";

drop policy "parent_modules_insert_own_or_admin" on "public"."parent_modules";

drop policy "parent_modules_select_own_or_admin" on "public"."parent_modules";

drop policy "parent_modules_update_own_or_admin" on "public"."parent_modules";

drop policy "Admins can update all profiles" on "public"."parent_profiles";

drop policy "Admins can view all profiles" on "public"."parent_profiles";

drop policy "parent_profiles_delete_own_or_admin" on "public"."parent_profiles";

drop policy "parent_profiles_insert_own_or_admin" on "public"."parent_profiles";

drop policy "parent_profiles_select_own_or_admin" on "public"."parent_profiles";

drop policy "parent_profiles_update_own_or_admin" on "public"."parent_profiles";

drop policy "Only admins can modify parent scripts" on "public"."parent_scripts";

drop policy "parent_scripts_delete_admin_only" on "public"."parent_scripts";

drop policy "parent_scripts_insert_admin_only" on "public"."parent_scripts";

drop policy "parent_scripts_update_admin_only" on "public"."parent_scripts";

drop policy "parent_subscriptions_delete_own_or_admin" on "public"."parent_subscriptions";

drop policy "parent_subscriptions_insert_own_or_admin" on "public"."parent_subscriptions";

drop policy "parent_subscriptions_select_own_or_admin" on "public"."parent_subscriptions";

drop policy "parent_subscriptions_update_own_or_admin" on "public"."parent_subscriptions";

drop policy "Parents can delete pathway assessments for their children" on "public"."pathway_assessments";

drop policy "Parents can insert pathway assessments for their children" on "public"."pathway_assessments";

drop policy "Parents can read pathway assessments for their children" on "public"."pathway_assessments";

drop policy "Parents can update pathway assessments for their children" on "public"."pathway_assessments";

drop policy "Users can delete their children's assessments" on "public"."pathway_assessments";

drop policy "Users can insert assessments for their children" on "public"."pathway_assessments";

drop policy "Users can update their children's assessments" on "public"."pathway_assessments";

drop policy "Users can view their children's assessments" on "public"."pathway_assessments";

drop policy "pathway_assessments_delete_own_child_or_admin" on "public"."pathway_assessments";

drop policy "pathway_assessments_insert_own_child_or_admin" on "public"."pathway_assessments";

drop policy "pathway_assessments_select_own_child_or_admin" on "public"."pathway_assessments";

drop policy "pathway_assessments_update_own_child_or_admin" on "public"."pathway_assessments";

drop policy "Only admins can modify pathways" on "public"."pathways";

drop policy "pathways_delete_admin_only" on "public"."pathways";

drop policy "pathways_insert_admin_only" on "public"."pathways";

drop policy "pathways_update_admin_only" on "public"."pathways";

drop policy "Users can create purchases for own children" on "public"."reward_purchases";

drop policy "Users can update own children purchases" on "public"."reward_purchases";

drop policy "Users can view own children purchases" on "public"."reward_purchases";

drop policy "reward_purchases_delete_own_child_or_admin" on "public"."reward_purchases";

drop policy "reward_purchases_insert_own_child_or_admin" on "public"."reward_purchases";

drop policy "reward_purchases_select_own_child_or_admin" on "public"."reward_purchases";

drop policy "reward_purchases_update_own_child_or_admin" on "public"."reward_purchases";

drop policy "Users can view baseline and own custom rewards" on "public"."rewards";

drop policy "rewards_delete_own_or_admin" on "public"."rewards";

drop policy "rewards_insert_own_or_admin" on "public"."rewards";

drop policy "rewards_select_baseline_or_own_or_admin" on "public"."rewards";

drop policy "rewards_update_own_or_admin" on "public"."rewards";

drop policy "roadblock_config_delete_admin_only" on "public"."roadblock_config";

drop policy "roadblock_config_insert_admin_only" on "public"."roadblock_config";

drop policy "roadblock_config_update_admin_only" on "public"."roadblock_config";

drop policy "roadblocks_delete_admin_only" on "public"."roadblocks";

drop policy "roadblocks_insert_admin_only" on "public"."roadblocks";

drop policy "roadblocks_update_admin_only" on "public"."roadblocks";

drop policy "sequencing_rules_delete_admin_only" on "public"."sequencing_rules";

drop policy "sequencing_rules_insert_admin_only" on "public"."sequencing_rules";

drop policy "sequencing_rules_update_admin_only" on "public"."sequencing_rules";

drop policy "Only admins can modify series" on "public"."series";

drop policy "series_delete_admin_only" on "public"."series";

drop policy "series_insert_admin_only" on "public"."series";

drop policy "series_update_admin_only" on "public"."series";

drop policy "settings_delete_admin_only" on "public"."settings";

drop policy "settings_insert_admin_only" on "public"."settings";

drop policy "settings_update_admin_only" on "public"."settings";

drop policy "Only admins can modify skills" on "public"."skills";

drop policy "skills_delete_admin_only" on "public"."skills";

drop policy "skills_insert_admin_only" on "public"."skills";

drop policy "skills_update_admin_only" on "public"."skills";

drop policy "sub_skills_delete_admin_only" on "public"."sub_skills";

drop policy "sub_skills_insert_admin_only" on "public"."sub_skills";

drop policy "sub_skills_update_admin_only" on "public"."sub_skills";

drop policy "subscription_credit_ledger_delete_own_or_admin" on "public"."subscription_credit_ledger";

drop policy "subscription_credit_ledger_insert_own_or_admin" on "public"."subscription_credit_ledger";

drop policy "subscription_credit_ledger_select_own_or_admin" on "public"."subscription_credit_ledger";

drop policy "subscription_credit_ledger_update_own_or_admin" on "public"."subscription_credit_ledger";

drop policy "subscription_tiers_delete_admin_only" on "public"."subscription_tiers";

drop policy "subscription_tiers_insert_admin_only" on "public"."subscription_tiers";

drop policy "subscription_tiers_update_admin_only" on "public"."subscription_tiers";

drop policy "super_skills_delete_admin_only" on "public"."super_skills";

drop policy "super_skills_insert_admin_only" on "public"."super_skills";

drop policy "super_skills_update_admin_only" on "public"."super_skills";

drop policy "theory_connections_delete_admin_only" on "public"."theory_connections";

drop policy "theory_connections_insert_admin_only" on "public"."theory_connections";

drop policy "theory_connections_update_admin_only" on "public"."theory_connections";

drop policy "Only admins can modify tools" on "public"."tools";

drop policy "tools_delete_admin_only" on "public"."tools";

drop policy "tools_insert_admin_only" on "public"."tools";

drop policy "tools_update_admin_only" on "public"."tools";

drop policy "weekly_checkins_delete_own_or_admin" on "public"."weekly_checkins";

drop policy "weekly_checkins_insert_own_or_admin" on "public"."weekly_checkins";

drop policy "weekly_checkins_select_own_or_admin" on "public"."weekly_checkins";

drop policy "weekly_checkins_update_own_or_admin" on "public"."weekly_checkins";

alter table "public"."ai_generation_jobs" drop constraint "ai_generation_jobs_module_id_fkey";

alter table "public"."ai_generation_jobs" drop constraint "ai_generation_jobs_parent_job_id_fkey";

alter table "public"."audit_criteria" drop constraint "audit_criteria_check_type_check";

alter table "public"."audit_criteria" drop constraint "audit_criteria_fail_severity_check";

alter table "public"."audit_rules" drop constraint "audit_rules_section_id_fkey";

alter table "public"."badges" drop constraint "badges_super_skill_id_fkey";

alter table "public"."brain_town_vocabulary" drop constraint "brain_town_vocabulary_vocab_type_check";

alter table "public"."characters" drop constraint "characters_super_skill_id_fkey";

alter table "public"."child_badges" drop constraint "child_badges_badge_id_fkey";

alter table "public"."child_badges" drop constraint "child_badges_child_id_fkey";

alter table "public"."child_cycle_progress" drop constraint "child_cycle_progress_child_id_fkey";

alter table "public"."child_cycle_progress" drop constraint "child_cycle_progress_cycle_id_fkey";

alter table "public"."child_focus_plan" drop constraint "child_focus_plan_category_fkey";

alter table "public"."child_focus_plan" drop constraint "child_focus_plan_child_id_fkey";

alter table "public"."child_focus_plan" drop constraint "child_focus_plan_default_pathway_id_fkey";

alter table "public"."child_focus_plan" drop constraint "child_focus_plan_intensity_chk";

alter table "public"."child_focus_plan" drop constraint "child_focus_plan_super_skill_id_fkey";

alter table "public"."child_modules" drop constraint "child_modules_child_id_fkey";

alter table "public"."child_modules" drop constraint "child_modules_module_id_fkey";

alter table "public"."child_mood_checkins" drop constraint "child_mood_checkins_child_id_fkey";

alter table "public"."child_roadblock_completions" drop constraint "child_roadblock_completions_child_id_fkey";

alter table "public"."child_roadblock_completions" drop constraint "child_roadblock_completions_roadblock_id_fkey";

alter table "public"."child_roadblocks" drop constraint "child_roadblocks_child_id_fkey";

alter table "public"."child_roadblocks" drop constraint "child_roadblocks_roadblock_id_fkey";

alter table "public"."child_roadblocks" drop constraint "child_roadblocks_super_skill_id_fkey";

alter table "public"."child_roadblocks" drop constraint "child_roadblocks_triggered_by_module_id_fkey";

alter table "public"."child_super_skill_progress" drop constraint "child_super_skill_progress_child_id_fkey";

alter table "public"."child_super_skill_progress" drop constraint "child_super_skill_progress_current_cycle_id_fkey";

alter table "public"."child_super_skill_progress" drop constraint "child_super_skill_progress_super_skill_id_fkey";

alter table "public"."core_theories" drop constraint "core_theories_super_skill_id_fkey";

alter table "public"."cycles" drop constraint "cycles_badge_id_fkey";

alter table "public"."cycles" drop constraint "cycles_super_skill_id_fkey";

alter table "public"."daily_quest_completions" drop constraint "daily_quest_completions_child_id_fkey";

alter table "public"."diagnosis_profiles" drop constraint "diagnosis_profiles_tier_check";

alter table "public"."focus_plan_categories" drop constraint "focus_plan_categories_super_skill_id_fkey";

alter table "public"."login_streaks" drop constraint "login_streaks_child_id_fkey";

alter table "public"."module_responses" drop constraint "module_responses_child_id_fkey";

alter table "public"."module_responses" drop constraint "module_responses_module_id_fkey";

alter table "public"."module_secondary_theories" drop constraint "module_secondary_theories_module_id_fkey";

alter table "public"."module_secondary_theories" drop constraint "module_secondary_theories_theory_id_fkey";

alter table "public"."module_unlocks" drop constraint "module_unlocks_module_id_fkey";

alter table "public"."module_variants" drop constraint "module_variants_module_id_fkey";

alter table "public"."modules" drop constraint "modules_age_range_fkey";

alter table "public"."modules" drop constraint "modules_bridge_from_module_id_fkey";

alter table "public"."modules" drop constraint "modules_cycle_id_fkey";

alter table "public"."modules" drop constraint "modules_dss_sedi_id_fkey";

alter table "public"."modules" drop constraint "modules_ndis_domain_id_fkey";

alter table "public"."modules" drop constraint "modules_pathway_fkey";

alter table "public"."modules" drop constraint "modules_primary_theory_id_fkey";

alter table "public"."modules" drop constraint "modules_sub_skill_id_fkey";

alter table "public"."modules" drop constraint "modules_super_skill_id_fkey";

alter table "public"."modules_to_generate" drop constraint "modules_to_generate_bridge_from_module_id_fkey";

alter table "public"."modules_to_generate" drop constraint "modules_to_generate_dss_sedi_id_fkey";

alter table "public"."modules_to_generate" drop constraint "modules_to_generate_generated_module_id_fkey";

alter table "public"."modules_to_generate" drop constraint "modules_to_generate_ndis_domain_id_fkey";

alter table "public"."modules_to_generate" drop constraint "modules_to_generate_primary_theory_id_fkey";

alter table "public"."modules_to_generate" drop constraint "modules_to_generate_sub_skill_id_fkey";

alter table "public"."modules_to_generate" drop constraint "modules_to_generate_super_skill_id_fkey";

alter table "public"."parent_modules" drop constraint "parent_modules_module_id_fkey";

alter table "public"."parent_subscriptions" drop constraint "parent_subscriptions_tier_fkey";

alter table "public"."pathway_assessments" drop constraint "pathway_assessments_child_id_fkey";

alter table "public"."pathway_assessments" drop constraint "pathway_assessments_module_id_fkey";

alter table "public"."pathways" drop constraint "pathways_category_fkey";

alter table "public"."reward_purchases" drop constraint "reward_purchases_child_id_fkey";

alter table "public"."reward_purchases" drop constraint "reward_purchases_reward_id_fkey";

alter table "public"."rewards" drop constraint "rewards_child_id_fkey";

alter table "public"."sub_skills" drop constraint "sub_skills_super_skill_id_fkey";

alter table "public"."subscription_credit_ledger" drop constraint "subscription_credit_ledger_module_id_fkey";

alter table "public"."super_skills" drop constraint "super_skills_character_id_fkey";

alter table "public"."theory_connections" drop constraint "theory_connections_cycle_id_fkey";

alter table "public"."theory_connections" drop constraint "theory_connections_primary_theory_id_fkey";

alter table "public"."theory_connections" drop constraint "theory_connections_super_skill_id_fkey";

alter table "public"."weekly_checkins" drop constraint "weekly_checkins_child_id_fkey";

alter table "public"."weekly_checkins" drop constraint "weekly_checkins_module_id_fkey";

alter table "public"."weekly_checkins" drop constraint "weekly_checkins_sub_skill_id_fkey";


  create table "public"."user_feedback" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "email" text not null default 'unknown'::text,
    "rating" smallint,
    "message" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_feedback" enable row level security;

alter table "public"."ai_module_config" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."module_unlocks" alter column "id" set default nextval('public.module_unlocks_id_seq'::regclass);

alter table "public"."module_variants" add column "narration_data" jsonb default '[]'::jsonb;

alter table "public"."module_variants" add column "narration_status" text default 'none'::text;

alter table "public"."modules" add column "narration_data" jsonb default '[]'::jsonb;

alter table "public"."modules" add column "narration_status" text default 'none'::text;

alter table "public"."parent_subscriptions" add column "paused_at" timestamp with time zone;

alter table "public"."parent_subscriptions" add column "payment_failed_at" timestamp with time zone;

alter table "public"."parent_subscriptions" add column "payment_failure_code" text;

alter table "public"."parent_subscriptions" add column "payment_failure_count" integer default 0;

alter table "public"."series" alter column "id" set default nextval('public.series_id_seq'::regclass);

alter table "public"."subscription_credit_ledger" alter column "id" set default nextval('public.subscription_credit_ledger_id_seq'::regclass);

alter table "public"."super_skills" add column "voice_id" text;

CREATE UNIQUE INDEX user_feedback_pkey ON public.user_feedback USING btree (id);

alter table "public"."user_feedback" add constraint "user_feedback_pkey" PRIMARY KEY using index "user_feedback_pkey";

alter table "public"."user_feedback" add constraint "user_feedback_rating_check" CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5)))) not valid;

alter table "public"."user_feedback" validate constraint "user_feedback_rating_check";

alter table "public"."user_feedback" add constraint "user_feedback_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."user_feedback" validate constraint "user_feedback_user_id_fkey";

alter table "public"."ai_generation_jobs" add constraint "ai_generation_jobs_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) not valid;

alter table "public"."ai_generation_jobs" validate constraint "ai_generation_jobs_module_id_fkey";

alter table "public"."ai_generation_jobs" add constraint "ai_generation_jobs_parent_job_id_fkey" FOREIGN KEY (parent_job_id) REFERENCES public.ai_generation_jobs(id) not valid;

alter table "public"."ai_generation_jobs" validate constraint "ai_generation_jobs_parent_job_id_fkey";

alter table "public"."audit_criteria" add constraint "audit_criteria_check_type_check" CHECK (((check_type)::text = ANY ((ARRAY['AUTOMATIC'::character varying, 'MANUAL'::character varying])::text[]))) not valid;

alter table "public"."audit_criteria" validate constraint "audit_criteria_check_type_check";

alter table "public"."audit_criteria" add constraint "audit_criteria_fail_severity_check" CHECK (((fail_severity)::text = ANY ((ARRAY['CRITICAL'::character varying, 'WARNING'::character varying])::text[]))) not valid;

alter table "public"."audit_criteria" validate constraint "audit_criteria_fail_severity_check";

alter table "public"."audit_rules" add constraint "audit_rules_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.audit_sections(id) ON DELETE CASCADE not valid;

alter table "public"."audit_rules" validate constraint "audit_rules_section_id_fkey";

alter table "public"."badges" add constraint "badges_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."badges" validate constraint "badges_super_skill_id_fkey";

alter table "public"."brain_town_vocabulary" add constraint "brain_town_vocabulary_vocab_type_check" CHECK (((vocab_type)::text = ANY ((ARRAY['approved'::character varying, 'forbidden_word'::character varying, 'forbidden_metaphor'::character varying])::text[]))) not valid;

alter table "public"."brain_town_vocabulary" validate constraint "brain_town_vocabulary_vocab_type_check";

alter table "public"."characters" add constraint "characters_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."characters" validate constraint "characters_super_skill_id_fkey";

alter table "public"."child_badges" add constraint "child_badges_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE not valid;

alter table "public"."child_badges" validate constraint "child_badges_badge_id_fkey";

alter table "public"."child_badges" add constraint "child_badges_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_badges" validate constraint "child_badges_child_id_fkey";

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

alter table "public"."child_focus_plan" add constraint "child_focus_plan_intensity_chk" CHECK ((intensity = ANY (ARRAY['mild'::text, 'moderate'::text, 'severe'::text, 'complex'::text]))) not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_intensity_chk";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_super_skill_id_fkey";

alter table "public"."child_modules" add constraint "child_modules_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_modules" validate constraint "child_modules_child_id_fkey";

alter table "public"."child_modules" add constraint "child_modules_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) not valid;

alter table "public"."child_modules" validate constraint "child_modules_module_id_fkey";

alter table "public"."child_mood_checkins" add constraint "child_mood_checkins_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_mood_checkins" validate constraint "child_mood_checkins_child_id_fkey";

alter table "public"."child_roadblock_completions" add constraint "child_roadblock_completions_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."child_roadblock_completions" validate constraint "child_roadblock_completions_child_id_fkey";

alter table "public"."child_roadblock_completions" add constraint "child_roadblock_completions_roadblock_id_fkey" FOREIGN KEY (roadblock_id) REFERENCES public.roadblocks(id) ON DELETE CASCADE not valid;

alter table "public"."child_roadblock_completions" validate constraint "child_roadblock_completions_roadblock_id_fkey";

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

alter table "public"."child_super_skill_progress" add constraint "child_super_skill_progress_current_cycle_id_fkey" FOREIGN KEY (current_cycle_id) REFERENCES public.cycles(id) ON DELETE SET NULL not valid;

alter table "public"."child_super_skill_progress" validate constraint "child_super_skill_progress_current_cycle_id_fkey";

alter table "public"."child_super_skill_progress" add constraint "child_super_skill_progress_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE CASCADE not valid;

alter table "public"."child_super_skill_progress" validate constraint "child_super_skill_progress_super_skill_id_fkey";

alter table "public"."core_theories" add constraint "core_theories_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) not valid;

alter table "public"."core_theories" validate constraint "core_theories_super_skill_id_fkey";

alter table "public"."cycles" add constraint "cycles_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE SET NULL not valid;

alter table "public"."cycles" validate constraint "cycles_badge_id_fkey";

alter table "public"."cycles" add constraint "cycles_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE CASCADE not valid;

alter table "public"."cycles" validate constraint "cycles_super_skill_id_fkey";

alter table "public"."daily_quest_completions" add constraint "daily_quest_completions_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."daily_quest_completions" validate constraint "daily_quest_completions_child_id_fkey";

alter table "public"."diagnosis_profiles" add constraint "diagnosis_profiles_tier_check" CHECK (((tier)::text = ANY ((ARRAY['core'::character varying, 'extended'::character varying])::text[]))) not valid;

alter table "public"."diagnosis_profiles" validate constraint "diagnosis_profiles_tier_check";

alter table "public"."focus_plan_categories" add constraint "focus_plan_categories_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE SET NULL not valid;

alter table "public"."focus_plan_categories" validate constraint "focus_plan_categories_super_skill_id_fkey";

alter table "public"."login_streaks" add constraint "login_streaks_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."login_streaks" validate constraint "login_streaks_child_id_fkey";

alter table "public"."module_responses" add constraint "module_responses_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."module_responses" validate constraint "module_responses_child_id_fkey";

alter table "public"."module_responses" add constraint "module_responses_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."module_responses" validate constraint "module_responses_module_id_fkey";

alter table "public"."module_secondary_theories" add constraint "module_secondary_theories_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."module_secondary_theories" validate constraint "module_secondary_theories_module_id_fkey";

alter table "public"."module_secondary_theories" add constraint "module_secondary_theories_theory_id_fkey" FOREIGN KEY (theory_id) REFERENCES public.core_theories(id) ON DELETE CASCADE not valid;

alter table "public"."module_secondary_theories" validate constraint "module_secondary_theories_theory_id_fkey";

alter table "public"."module_unlocks" add constraint "module_unlocks_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."module_unlocks" validate constraint "module_unlocks_module_id_fkey";

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

alter table "public"."parent_modules" add constraint "parent_modules_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE not valid;

alter table "public"."parent_modules" validate constraint "parent_modules_module_id_fkey";

alter table "public"."parent_subscriptions" add constraint "parent_subscriptions_tier_fkey" FOREIGN KEY (tier) REFERENCES public.subscription_tiers(tier) not valid;

alter table "public"."parent_subscriptions" validate constraint "parent_subscriptions_tier_fkey";

alter table "public"."pathway_assessments" add constraint "pathway_assessments_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."pathway_assessments" validate constraint "pathway_assessments_child_id_fkey";

alter table "public"."pathway_assessments" add constraint "pathway_assessments_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE SET NULL not valid;

alter table "public"."pathway_assessments" validate constraint "pathway_assessments_module_id_fkey";

alter table "public"."pathways" add constraint "pathways_category_fkey" FOREIGN KEY (category) REFERENCES public.category_colors(category) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."pathways" validate constraint "pathways_category_fkey";

alter table "public"."reward_purchases" add constraint "reward_purchases_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."reward_purchases" validate constraint "reward_purchases_child_id_fkey";

alter table "public"."reward_purchases" add constraint "reward_purchases_reward_id_fkey" FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE SET NULL not valid;

alter table "public"."reward_purchases" validate constraint "reward_purchases_reward_id_fkey";

alter table "public"."rewards" add constraint "rewards_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."rewards" validate constraint "rewards_child_id_fkey";

alter table "public"."sub_skills" add constraint "sub_skills_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE CASCADE not valid;

alter table "public"."sub_skills" validate constraint "sub_skills_super_skill_id_fkey";

alter table "public"."subscription_credit_ledger" add constraint "subscription_credit_ledger_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE SET NULL not valid;

alter table "public"."subscription_credit_ledger" validate constraint "subscription_credit_ledger_module_id_fkey";

alter table "public"."super_skills" add constraint "super_skills_character_id_fkey" FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE SET NULL not valid;

alter table "public"."super_skills" validate constraint "super_skills_character_id_fkey";

alter table "public"."theory_connections" add constraint "theory_connections_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE CASCADE not valid;

alter table "public"."theory_connections" validate constraint "theory_connections_cycle_id_fkey";

alter table "public"."theory_connections" add constraint "theory_connections_primary_theory_id_fkey" FOREIGN KEY (primary_theory_id) REFERENCES public.core_theories(id) ON DELETE CASCADE not valid;

alter table "public"."theory_connections" validate constraint "theory_connections_primary_theory_id_fkey";

alter table "public"."theory_connections" add constraint "theory_connections_super_skill_id_fkey" FOREIGN KEY (super_skill_id) REFERENCES public.super_skills(id) ON DELETE CASCADE not valid;

alter table "public"."theory_connections" validate constraint "theory_connections_super_skill_id_fkey";

alter table "public"."weekly_checkins" add constraint "weekly_checkins_child_id_fkey" FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE not valid;

alter table "public"."weekly_checkins" validate constraint "weekly_checkins_child_id_fkey";

alter table "public"."weekly_checkins" add constraint "weekly_checkins_module_id_fkey" FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE SET NULL not valid;

alter table "public"."weekly_checkins" validate constraint "weekly_checkins_module_id_fkey";

alter table "public"."weekly_checkins" add constraint "weekly_checkins_sub_skill_id_fkey" FOREIGN KEY (sub_skill_id) REFERENCES public.sub_skills(id) ON DELETE SET NULL not valid;

alter table "public"."weekly_checkins" validate constraint "weekly_checkins_sub_skill_id_fkey";

set check_function_bodies = off;

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


grant delete on table "public"."children" to "service_role";

grant insert on table "public"."children" to "service_role";

grant references on table "public"."children" to "service_role";

grant trigger on table "public"."children" to "service_role";

grant truncate on table "public"."children" to "service_role";

grant update on table "public"."children" to "service_role";

grant delete on table "public"."module_variants" to "service_role";

grant insert on table "public"."module_variants" to "service_role";

grant select on table "public"."module_variants" to "service_role";

grant update on table "public"."module_variants" to "service_role";

grant delete on table "public"."user_feedback" to "anon";

grant insert on table "public"."user_feedback" to "anon";

grant select on table "public"."user_feedback" to "anon";

grant update on table "public"."user_feedback" to "anon";

grant delete on table "public"."user_feedback" to "authenticated";

grant insert on table "public"."user_feedback" to "authenticated";

grant select on table "public"."user_feedback" to "authenticated";

grant update on table "public"."user_feedback" to "authenticated";


  create policy "service_role_all_children"
  on "public"."children"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "service_role_update_children"
  on "public"."children"
  as permissive
  for update
  to service_role
using (true)
with check (true);



  create policy "Admins can read all feedback"
  on "public"."user_feedback"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.parent_profiles
  WHERE ((parent_profiles.id = auth.uid()) AND (parent_profiles.is_admin = true)))));



  create policy "Users can insert feedback"
  on "public"."user_feedback"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can read own feedback"
  on "public"."user_feedback"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



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



  create policy "age_ranges_update_admin_only"
  on "public"."age_ranges"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "ai_generation_jobs_update_admin_only"
  on "public"."ai_generation_jobs"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "ai_module_config_update_admin_only"
  on "public"."ai_module_config"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "audit_criteria_update_admin_only"
  on "public"."audit_criteria"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "audit_rules_update_admin_only"
  on "public"."audit_rules"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "brain_town_vocabulary_update_admin_only"
  on "public"."brain_town_vocabulary"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "characters_update_admin_only"
  on "public"."characters"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "checkin_challenges_update_admin_only"
  on "public"."checkin_challenges"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "checkin_goals_update_admin_only"
  on "public"."checkin_goals"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "Parents can view children modules"
  on "public"."child_modules"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children
  WHERE ((children.id = child_modules.child_id) AND (children.parent_user_id = auth.uid())))));



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



  create policy "core_theories_update_admin_only"
  on "public"."core_theories"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "diagnosis_profiles_update_admin_only"
  on "public"."diagnosis_profiles"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "dss_sedi_categories_update_admin_only"
  on "public"."dss_sedi_categories"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "emotions_update_admin_only"
  on "public"."emotions"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "fasd_domains_update_admin_only"
  on "public"."fasd_domains"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "focus_plan_categories_update_admin_only"
  on "public"."focus_plan_categories"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "focus_plan_frequencies_update_admin_only"
  on "public"."focus_plan_frequencies"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "focus_plan_goals_update_admin_only"
  on "public"."focus_plan_goals"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "focus_plan_intensities_update_admin_only"
  on "public"."focus_plan_intensities"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "forbidden_terms_update_admin_only"
  on "public"."forbidden_terms"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "Parents can view children responses"
  on "public"."module_responses"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.children
  WHERE ((children.id = module_responses.child_id) AND (children.parent_user_id = auth.uid())))));



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



  create policy "module_secondary_theories_update_admin_only"
  on "public"."module_secondary_theories"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "Admins can manage all modules"
  on "public"."modules"
  as permissive
  for all
  to public
using (public.is_user_admin_module_check());



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



  create policy "modules_update_admin_only"
  on "public"."modules"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "parent_scripts_update_admin_only"
  on "public"."parent_scripts"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "Users can view baseline and own custom rewards"
  on "public"."rewards"
  as permissive
  for select
  to public
using (((is_baseline = true) OR (parent_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.parent_profiles
  WHERE ((parent_profiles.id = auth.uid()) AND (parent_profiles.is_admin = true))))));



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



  create policy "sequencing_rules_update_admin_only"
  on "public"."sequencing_rules"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "series_update_admin_only"
  on "public"."series"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "settings_update_admin_only"
  on "public"."settings"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "skills_update_admin_only"
  on "public"."skills"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "sub_skills_update_admin_only"
  on "public"."sub_skills"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "subscription_tiers_update_admin_only"
  on "public"."subscription_tiers"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "super_skills_update_admin_only"
  on "public"."super_skills"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "theory_connections_update_admin_only"
  on "public"."theory_connections"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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



  create policy "tools_update_admin_only"
  on "public"."tools"
  as permissive
  for update
  to authenticated
using (public.is_sys_admin())
with check (public.is_sys_admin());



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

drop trigger if exists "on_auth_user_created" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Public read access for tts-audio"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'tts-audio'::text));



  create policy "Service role can manage tts-audio"
  on "storage"."objects"
  as permissive
  for delete
  to service_role
using ((bucket_id = 'tts-audio'::text));



  create policy "Service role can upload tts-audio"
  on "storage"."objects"
  as permissive
  for insert
  to service_role
with check ((bucket_id = 'tts-audio'::text));



