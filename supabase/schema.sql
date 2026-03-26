


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."activate_super_skill_for_child"("p_child_id" "uuid", "p_super_skill_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE child_super_skill_progress
    SET status = 'active',
        started_at = COALESCE(started_at, NOW()),
        current_cycle_id = COALESCE(current_cycle_id, 
            (SELECT id FROM cycles WHERE super_skill_id = p_super_skill_id AND cycle_number = 1))
    WHERE child_id = p_child_id
    AND super_skill_id = p_super_skill_id;
END;
$$;


ALTER FUNCTION "public"."activate_super_skill_for_child"("p_child_id" "uuid", "p_super_skill_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_module_to_all_parents"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert the new module for all existing parents
  INSERT INTO public.parent_modules (parent_id, module_id, is_active)
  SELECT id, NEW.id, false
  FROM public.parent_profiles
  ON CONFLICT (parent_id, module_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_module_to_all_parents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_modules_to_new_parent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into parent_modules (parent_id, module_id, is_active, purchased_at, created_at)
  select new.id, m.id, false, null, now()
  from modules m;
  return new;
end;
$$;


ALTER FUNCTION "public"."assign_modules_to_new_parent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_stars_with_spendable"("p_child_id" "uuid", "p_stars" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."award_stars_with_spendable"("p_child_id" "uuid", "p_stars" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_xp_to_child"("p_child_id" "uuid", "p_xp_amount" integer) RETURNS TABLE("new_total_xp" integer, "new_level" integer, "leveled_up" boolean)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."award_xp_to_child"("p_child_id" "uuid", "p_xp_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_level"("xp" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    k INTEGER := 100;
BEGIN
    RETURN GREATEST(1, FLOOR((SQRT(1 + 8.0 * xp / k) - 1) / 2)::INTEGER);
END;
$$;


ALTER FUNCTION "public"."calculate_level"("xp" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_parent_profile"("user_id" "uuid", "user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.parent_profiles (id, username)
  VALUES (user_id, user_email)
  ON CONFLICT (id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."create_parent_profile"("user_id" "uuid", "user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_parent_profile_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_parent_profile_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_admin_exists"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if any admin exists, if not, you can manually set one here
  -- For example, to set a specific user as admin:
  -- UPDATE parent_profiles SET is_admin = true WHERE id = 'your-user-id-here';
  
  -- For now, just ensure the table structure is correct
  NULL;
END;
$$;


ALTER FUNCTION "public"."ensure_admin_exists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_module_theories"("p_module_id" "uuid") RETURNS TABLE("theory_type" "text", "theory_name" "text", "theory_code" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_module_theories"("p_module_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quest_stats"("child_id_param" "uuid") RETURNS TABLE("total_completions" bigint, "current_streak" integer, "last_completion" "date")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_quest_stats"("child_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_child_rewards"("p_child_id" "uuid", "p_stars" integer DEFAULT 0, "p_xp" integer DEFAULT 0) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."increment_child_rewards"("p_child_id" "uuid", "p_stars" integer, "p_xp" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_child_stars"("child_id_param" "uuid", "amount" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE children 
    SET total_stars = COALESCE(total_stars, 0) + amount,
        updated_at = NOW()
    WHERE id = child_id_param;
END;
$$;


ALTER FUNCTION "public"."increment_child_stars"("child_id_param" "uuid", "amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_child_super_skills"("p_child_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."initialize_child_super_skills"("p_child_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."sub_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "super_skill_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "code" character varying(10),
    "brain_town_description" "text"
);


ALTER TABLE "public"."sub_skills" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_sub_skill"("p_name" "text", "p_super_skill_id" "uuid", "p_description" "text" DEFAULT ''::"text", "p_is_active" boolean DEFAULT true) RETURNS "public"."sub_skills"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."insert_sub_skill"("p_name" "text", "p_super_skill_id" "uuid", "p_description" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_sys_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select p.is_admin from public.parent_profiles p where p.id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_sys_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_admin_check"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (SELECT is_admin FROM parent_profiles WHERE id = user_id LIMIT 1);
END;
$$;


ALTER FUNCTION "public"."is_user_admin_check"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_admin_module_check"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (SELECT is_admin FROM parent_profiles WHERE id = auth.uid() LIMIT 1) = true;
END;
$$;


ALTER FUNCTION "public"."is_user_admin_module_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."maybe_spawn_roadblock"("p_child_id" "uuid", "p_super_skill_id" "uuid", "p_triggered_by_module_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."maybe_spawn_roadblock"("p_child_id" "uuid", "p_super_skill_id" "uuid", "p_triggered_by_module_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_child"("p_child_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.children c
    where c.id = p_child_id
      and c.parent_user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."owns_child"("p_child_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."propagate_child_name_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.child_modules
  set child_name = new.name
  where child_id = new.id;

  return new;
end;
$$;


ALTER FUNCTION "public"."propagate_child_name_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_reward"("p_child_id" "uuid", "p_reward_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."purchase_reward"("p_child_id" "uuid", "p_reward_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_child_password_secure"("p_child_id" "uuid", "p_password" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_child_password_secure"("p_child_id" "uuid", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_username_from_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."set_username_from_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_child_module_child_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  select name
  into new.child_name
  from public.children
  where id = new.child_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_child_module_child_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_child_module_title"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  select title
  into new.module_title
  from public.modules
  where id = new.module_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_child_module_title"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlock_module_with_credit"("p_module_id" "uuid", "p_period_start" "date" DEFAULT ("date_trunc"('month'::"text", "now"()))::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."unlock_module_with_credit"("p_module_id" "uuid", "p_period_start" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_age_ranges_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_age_ranges_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_audit_rules_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_audit_rules_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_audit_sections_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_audit_sections_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_category_colors_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_category_colors_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_core_theories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_core_theories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_forbidden_terms_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_forbidden_terms_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_response_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_module_response_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_responses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_module_responses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modules_to_generate_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modules_to_generate_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pathway_assessments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pathway_assessments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_spendable_stars"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.spendable_stars = NEW.stars - COALESCE(NEW.spent_stars, 0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_spendable_stars"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_secondary_theory_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_secondary_theory_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_target_categories_exist"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_target_categories_exist"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_child_password_secure"("p_child_id" "uuid", "p_password" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."verify_child_password_secure"("p_child_id" "uuid", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."xp_for_next_level"("current_level" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    k INTEGER := 100;
BEGIN
    RETURN (k * (current_level + 1) * (current_level + 2) / 2)::INTEGER;
END;
$$;


ALTER FUNCTION "public"."xp_for_next_level"("current_level" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."age_ranges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "age_range" character varying(20) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "language_guidelines" "text" NOT NULL,
    "developmental_stage" "text" NOT NULL,
    "cognitive_abilities" "text",
    "emotional_capacity" "text",
    "attention_span" "text",
    "vocabulary_level" "text",
    "sentence_complexity" "text",
    "abstract_thinking" "text",
    "neurodivergent_adaptations" "text",
    "trauma_sensitive_notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "piaget_stage" "text",
    "erikson_stage" "text",
    "language_register" "text",
    "duration_minutes" "text"
);

ALTER TABLE ONLY "public"."age_ranges" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."age_ranges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_generation_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "content_brief" "text" NOT NULL,
    "result" "jsonb",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "content_brief_metadata" "jsonb",
    "generation_metadata" "jsonb",
    "attempt_number" integer DEFAULT 1,
    "parent_job_id" "uuid",
    "module_id" "uuid",
    "failed_at_pass" "text",
    CONSTRAINT "ai_generation_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."ai_generation_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_module_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "config_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "version" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_module_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_module_config" IS 'Stores AI module generation configuration including rulesheet and example modules';



CREATE TABLE IF NOT EXISTS "public"."assessment_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pathway_category" "text" NOT NULL,
    "question_key" "text" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" "text" DEFAULT 'frequency'::"text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "reverse_score" boolean DEFAULT false NOT NULL,
    "score_category" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assessment_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_number" integer NOT NULL,
    "section_name" character varying(50) NOT NULL,
    "check_name" character varying(100) NOT NULL,
    "check_type" character varying(20) DEFAULT 'AUTOMATIC'::character varying NOT NULL,
    "check_logic" "text",
    "weight" numeric DEFAULT 1.0,
    "fail_severity" character varying(10) DEFAULT 'WARNING'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_criteria_check_type_check" CHECK ((("check_type")::"text" = ANY ((ARRAY['AUTOMATIC'::character varying, 'MANUAL'::character varying])::"text"[]))),
    CONSTRAINT "audit_criteria_fail_severity_check" CHECK ((("fail_severity")::"text" = ANY ((ARRAY['CRITICAL'::character varying, 'WARNING'::character varying])::"text"[])))
);


ALTER TABLE "public"."audit_criteria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "rule_number" "text" NOT NULL,
    "rule_name" "text" NOT NULL,
    "check_type" "text" NOT NULL,
    "check_params" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_instruction" "text" NOT NULL,
    "failure_message" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_rules_check_type_check" CHECK (("check_type" = ANY (ARRAY['contains_text'::"text", 'not_contains_text'::"text", 'contains_any'::"text", 'not_contains_any'::"text", 'min_count'::"text", 'regex_match'::"text", 'manual_review'::"text"])))
);


ALTER TABLE "public"."audit_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_number" integer NOT NULL,
    "section_name" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "weight" integer DEFAULT 10 NOT NULL,
    "description" "text",
    "ai_instruction" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_sections_severity_check" CHECK (("severity" = ANY (ARRAY['CRITICAL'::"text", 'IMPORTANT'::"text", 'ADVISORY'::"text"]))),
    CONSTRAINT "audit_sections_weight_check" CHECK ((("weight" >= 0) AND ("weight" <= 100)))
);


ALTER TABLE "public"."audit_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "image_url" "text",
    "super_skill_id" "uuid",
    "cycle_number" integer,
    "badge_type" "text" DEFAULT 'cycle_completion'::"text",
    "rarity" "text" DEFAULT 'common'::"text",
    "xp_bonus" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brain_town_vocabulary" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vocab_type" character varying(20) NOT NULL,
    "real_concept" "text",
    "brain_town_term" "text",
    "correct_usage" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "brain_town_vocabulary_vocab_type_check" CHECK ((("vocab_type")::"text" = ANY ((ARRAY['approved'::character varying, 'forbidden_word'::character varying, 'forbidden_metaphor'::character varying])::"text"[])))
);


ALTER TABLE "public"."brain_town_vocabulary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_colors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "color" "text" DEFAULT '#4c6c96'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "short_description" "text"
);


ALTER TABLE "public"."category_colors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."characters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "species" character varying(100),
    "personality_nd" "text",
    "image_url" "text",
    "super_skill_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."characters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkin_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checkin_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkin_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checkin_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkin_triggers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checkin_triggers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."child_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_cycle_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text",
    "completed_weeks" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."child_cycle_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_focus_plan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "target_category_ids" "uuid"[] NOT NULL,
    "default_pathway_id" "uuid",
    "goal_key" "text",
    "goal_text" "text",
    "frequency" "text",
    "intensity" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comments" "text",
    "category" "uuid",
    "assessment_enabled" boolean DEFAULT true,
    "super_skill_id" "uuid",
    CONSTRAINT "child_focus_plan_frequency_chk" CHECK ((("frequency" IS NULL) OR ("frequency" = ANY (ARRAY['daily'::"text", 'few_per_week'::"text", 'weekly'::"text", 'rare'::"text"])))),
    CONSTRAINT "child_focus_plan_goal_text_len_chk" CHECK ((("goal_text" IS NULL) OR ("char_length"("goal_text") <= 120))),
    CONSTRAINT "child_focus_plan_intensity_chk" CHECK ((("intensity" IS NULL) OR ("intensity" = ANY (ARRAY['mild'::"text", 'medium'::"text", 'big'::"text"])))),
    CONSTRAINT "child_focus_plan_target_count_chk" CHECK ((("array_length"("target_category_ids", 1) >= 1) AND ("array_length"("target_category_ids", 1) <= 3)))
);


ALTER TABLE "public"."child_focus_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "child_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "module_title" "text",
    "child_name" "text",
    "xp_awarded" integer DEFAULT 0,
    "stars_awarded" integer DEFAULT 0,
    "level_at_completion" integer,
    "locked" boolean DEFAULT true
);


ALTER TABLE "public"."child_modules" OWNER TO "postgres";


COMMENT ON TABLE "public"."child_modules" IS 'holds what children have which modules';



CREATE TABLE IF NOT EXISTS "public"."children" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "name" "text" DEFAULT ''::"text",
    "date_of_birth" "date",
    "stars" numeric,
    "password" "text",
    "avatar" "text",
    "spendable_stars" integer DEFAULT 0,
    "spent_stars" smallint DEFAULT '0'::smallint,
    "total_xp" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    CONSTRAINT "check_level_positive" CHECK (("level" >= 1)),
    CONSTRAINT "check_total_xp_non_negative" CHECK (("total_xp" >= 0)),
    CONSTRAINT "children_password_check" CHECK (("length"("password") > 6)),
    CONSTRAINT "children_spendable_stars_check" CHECK (("spendable_stars" >= 0))
);


ALTER TABLE "public"."children" OWNER TO "postgres";


COMMENT ON TABLE "public"."children" IS 'Holds the users children';



CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" "text" DEFAULT ''::"text",
    "title" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "age_range" "uuid",
    "short_description" "text",
    "category" "text" DEFAULT ''::"text",
    "stripe_payment_link" "text",
    "series" "text",
    "card_color" "text" DEFAULT '#4caf50'::"text",
    "price" smallint,
    "html_content" "text",
    "description" "text",
    "pathway" "uuid",
    "pathway_order" integer,
    "super_skill_id" "uuid",
    "sub_skill_id" "uuid",
    "cycle_id" "uuid",
    "week_number" integer,
    "xp_reward" integer DEFAULT 100,
    "stars_reward" integer DEFAULT 10,
    "character_name" "text",
    "primary_theory_id" "uuid",
    "ndis_domain_id" "uuid",
    "dss_sedi_id" "uuid",
    "neuroscience_concept" character varying,
    "brain_town_metaphor" "text",
    "module_objective" "text",
    "facilitator_tip" "text",
    "reflection_prompt" "text",
    "reward_text" "text",
    "bridge_from_module_id" "uuid",
    "module_summary" "text",
    "diagnosis_profiles" "text"[],
    "module_id_code" character varying(30),
    "dx_adjustments" "jsonb",
    "audit_score" integer,
    "audit_report" "jsonb",
    "level_name" character varying(30),
    "generated_at" timestamp with time zone,
    "audited_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "generated_by" character varying(50)
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


COMMENT ON TABLE "public"."modules" IS 'Holds all modules';



COMMENT ON COLUMN "public"."modules"."category" IS 'The emotion or topic category (e.g., anger, body, anxiety, emotions, social, cognitive)';



COMMENT ON COLUMN "public"."modules"."series" IS 'The series this module belongs to (e.g., Luna, Daniel)';



COMMENT ON COLUMN "public"."modules"."price" IS 'price of each individual module';



COMMENT ON COLUMN "public"."modules"."html_content" IS 'Stores the complete HTML content of the module for rendering';



COMMENT ON COLUMN "public"."modules"."description" IS 'Long description of the Module';



COMMENT ON COLUMN "public"."modules"."primary_theory_id" IS 'Primary theoretical framework for this module';



COMMENT ON COLUMN "public"."modules"."ndis_domain_id" IS 'NDIS outcome domain this module supports';



COMMENT ON COLUMN "public"."modules"."dss_sedi_id" IS 'DSS SEDI category for outcome measurement';



COMMENT ON COLUMN "public"."modules"."neuroscience_concept" IS 'Key neuroscience concept (e.g., Neuroplasticity, Myelination)';



COMMENT ON COLUMN "public"."modules"."brain_town_metaphor" IS 'Custom Brain Town metaphor for this module';



COMMENT ON COLUMN "public"."modules"."module_objective" IS 'What children will be able to do after completing this module';



COMMENT ON COLUMN "public"."modules"."facilitator_tip" IS 'Guidance for parents/educators on delivering this module';



CREATE OR REPLACE VIEW "public"."child_modules_with_names" WITH ("security_invoker"='on') AS
 SELECT "cm"."id",
    "cm"."created_at",
    "cm"."child_id",
    "cm"."module_id",
    "cm"."status",
    "cm"."is_completed",
    "cm"."completed_at",
    "cm"."is_active",
    "c"."name" AS "child_name",
    "m"."title" AS "module_name",
    "m"."code" AS "module_code",
    "m"."category" AS "module_category",
    "m"."series" AS "module_series"
   FROM (("public"."child_modules" "cm"
     LEFT JOIN "public"."children" "c" ON (("cm"."child_id" = "c"."id")))
     LEFT JOIN "public"."modules" "m" ON (("cm"."module_id" = "m"."id")))
  ORDER BY "cm"."created_at" DESC;


ALTER VIEW "public"."child_modules_with_names" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_mood_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "parent_user_id" "uuid" NOT NULL,
    "mood_score" integer NOT NULL,
    "mood_label" "text",
    "mood_emoji" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "child_mood_checkins_mood_score_check" CHECK ((("mood_score" >= 1) AND ("mood_score" <= 5)))
);


ALTER TABLE "public"."child_mood_checkins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_roadblock_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "roadblock_id" "uuid" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."child_roadblock_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_roadblocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "roadblock_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'spawned'::"text",
    "spawned_at" timestamp with time zone DEFAULT "now"(),
    "cleared_at" timestamp with time zone,
    "triggered_by_module_id" "uuid",
    "super_skill_id" "uuid"
);


ALTER TABLE "public"."child_roadblocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_super_skill_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "super_skill_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'locked'::"text",
    "current_cycle_id" "uuid",
    "current_week" integer DEFAULT 0,
    "total_xp_in_skill" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone
);


ALTER TABLE "public"."child_super_skill_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_theories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "theory_name" character varying(200) NOT NULL,
    "theory_code" character varying(50) NOT NULL,
    "description" "text" NOT NULL,
    "key_mechanism" "text",
    "how_to_apply" "text",
    "age_adaptations" "text",
    "allowed_claims" "text",
    "avoid_claims" "text",
    "contraindications" "text",
    "suggested_activities" "text",
    "suggested_measures" "text",
    "example_scenarios" "text",
    "category" character varying(100),
    "related_theories" "text",
    "primary_researchers" "text",
    "key_references" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "key_theorists" "text",
    "cycle_number" integer,
    "super_skill_id" "uuid",
    "citation" "text",
    "brain_town_application" "text",
    "status" character varying(20) DEFAULT 'review'::character varying,
    "cycle_theme" character varying(30)
);

ALTER TABLE ONLY "public"."core_theories" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."core_theories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "super_skill_id" "uuid" NOT NULL,
    "cycle_number" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "total_weeks" integer DEFAULT 12,
    "badge_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_quest_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "quest_id" character varying(50) NOT NULL,
    "completed_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "response_data" "jsonb",
    "stars_awarded" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_quest_completions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."daily_quest_status" WITH ("security_invoker"='on') AS
 SELECT "c"."id" AS "child_id",
    "c"."name" AS "child_name",
    "dqc"."quest_id",
    "dqc"."completed_at",
        CASE
            WHEN ("dqc"."id" IS NOT NULL) THEN true
            ELSE false
        END AS "completed_today"
   FROM ("public"."children" "c"
     LEFT JOIN "public"."daily_quest_completions" "dqc" ON ((("c"."id" = "dqc"."child_id") AND ("dqc"."completed_date" = CURRENT_DATE))));


ALTER VIEW "public"."daily_quest_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."diagnosis_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(10) NOT NULL,
    "name" character varying(100) NOT NULL,
    "tier" character varying(20) DEFAULT 'core'::character varying NOT NULL,
    "adjustment_principles" "text" NOT NULL,
    "brain_town_note" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "diagnosis_profiles_tier_check" CHECK ((("tier")::"text" = ANY ((ARRAY['core'::character varying, 'extended'::character varying])::"text"[])))
);


ALTER TABLE "public"."diagnosis_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dss_sedi_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sedi_code" character varying NOT NULL,
    "sedi_name" character varying NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dss_sedi_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."dss_sedi_categories" IS 'DSS SEDI categories for outcome measurement and reporting.';



CREATE TABLE IF NOT EXISTS "public"."emotions" (
    "id" "text" NOT NULL,
    "label" "text" NOT NULL
);


ALTER TABLE "public"."emotions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fasd_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain_number" integer NOT NULL,
    "domain_name" character varying NOT NULL,
    "description" "text",
    "adaptation_notes" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fasd_domains" OWNER TO "postgres";


COMMENT ON TABLE "public"."fasd_domains" IS 'FASD-specific brain domains for targeted intervention planning.';



CREATE TABLE IF NOT EXISTS "public"."focus_plan_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" DEFAULT '📚'::"text" NOT NULL,
    "short_description" "text" DEFAULT ''::"text" NOT NULL,
    "super_skill_id" "uuid",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."focus_plan_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."focus_plan_frequencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "value" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."focus_plan_frequencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."focus_plan_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "icon" "text" DEFAULT '🎯'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."focus_plan_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."focus_plan_intensities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "value" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "icon" "text" DEFAULT '🌱'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."focus_plan_intensities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forbidden_terms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term" "text" NOT NULL,
    "term_type" "text" NOT NULL,
    "reason" "text",
    "brain_town_alternative" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "forbidden_terms_term_type_check" CHECK (("term_type" = ANY (ARRAY['word'::"text", 'metaphor'::"text"])))
);


ALTER TABLE "public"."forbidden_terms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."levels" (
    "id" integer NOT NULL,
    "level" integer NOT NULL,
    "xp_required" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "level_name" character varying(30),
    "cognitive_stage" "text",
    "approved_verbs" "text",
    "independence_indicator" "text",
    "weeks" integer[],
    "default_xp" integer,
    "default_stars" integer
);


ALTER TABLE "public"."levels" OWNER TO "postgres";


ALTER TABLE "public"."levels" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."levels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."login_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_login_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "child_id" "uuid"
);


ALTER TABLE "public"."login_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid",
    "module_id" "uuid",
    "parent_user_id" "uuid",
    "question_text" "text" NOT NULL,
    "response_type" character varying(50) NOT NULL,
    "response_value" "text",
    "response_options" "text"[],
    "selected_option" integer,
    "page_number" integer DEFAULT 1,
    "question_order" integer DEFAULT 1,
    "response_time_ms" integer,
    "is_correct" boolean,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "question_id" "text"
);


ALTER TABLE "public"."module_responses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."module_response_analytics" WITH ("security_invoker"='on') AS
 SELECT "mr"."id",
    "mr"."child_id",
    "c"."name" AS "child_name",
    "mr"."module_id",
    "m"."code" AS "module_code",
    "m"."title" AS "module_title",
    "mr"."question_id",
    "mr"."question_text",
    "mr"."response_type",
    "mr"."response_value",
    "mr"."response_options",
    "mr"."selected_option",
    "mr"."page_number",
    "mr"."question_order",
    "mr"."response_time_ms",
    "mr"."is_correct",
    "mr"."created_at",
    "mr"."updated_at",
    "count"(*) OVER (PARTITION BY "mr"."child_id", "mr"."module_id") AS "total_responses",
    "count"(
        CASE
            WHEN ("mr"."is_correct" = true) THEN 1
            ELSE NULL::integer
        END) OVER (PARTITION BY "mr"."child_id", "mr"."module_id") AS "correct_count"
   FROM (("public"."module_responses" "mr"
     LEFT JOIN "public"."children" "c" ON (("c"."id" = "mr"."child_id")))
     LEFT JOIN "public"."modules" "m" ON (("m"."id" = "mr"."module_id")))
  ORDER BY "mr"."created_at" DESC;


ALTER VIEW "public"."module_response_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_secondary_theories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "theory_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."module_secondary_theories" OWNER TO "postgres";


COMMENT ON TABLE "public"."module_secondary_theories" IS 'Maps modules to secondary (supporting) theories. Maximum 3 per module.';



CREATE OR REPLACE VIEW "public"."module_theory_view" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "code",
    NULL::"text" AS "title",
    NULL::character varying(200) AS "primary_theory_name",
    NULL::character varying(50) AS "primary_theory_code",
    NULL::character varying[] AS "secondary_theories",
    NULL::character varying AS "ndis_domain",
    NULL::character varying AS "dss_sedi",
    NULL::character varying AS "neuroscience_concept",
    NULL::"text" AS "brain_town_metaphor";


ALTER VIEW "public"."module_theory_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_unlocks" (
    "id" bigint NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "unlock_source" "text" DEFAULT 'subscription_credit'::"text" NOT NULL,
    "credits_spent" integer DEFAULT 1 NOT NULL,
    "period_start" "date",
    "period_end" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "module_unlocks_credits_spent_check" CHECK (("credits_spent" >= 0)),
    CONSTRAINT "module_unlocks_unlock_source_check" CHECK (("unlock_source" = ANY (ARRAY['subscription_credit'::"text", 'manual_admin'::"text", 'legacy_purchase'::"text"])))
);


ALTER TABLE "public"."module_unlocks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."module_unlocks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."module_unlocks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."module_unlocks_id_seq" OWNED BY "public"."module_unlocks"."id";



CREATE TABLE IF NOT EXISTS "public"."modules_to_generate" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_title" "text" NOT NULL,
    "cycle" "text",
    "week_number" integer,
    "level" "text",
    "age_range" "text",
    "core_theory" "text",
    "brain_town_analogy" "text",
    "main_activity" "text",
    "measure_type" "text",
    "builds_on" "text",
    "progress_percentage" integer DEFAULT 0,
    "ai_content_prompt" "text",
    "super_skill_id" "uuid",
    "sub_skill_id" "uuid",
    "has_been_generated" boolean DEFAULT false,
    "generated_module_id" "uuid",
    "generated_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "primary_theory_id" "uuid",
    "secondary_theory_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "ndis_domain_id" "uuid",
    "dss_sedi_id" "uuid",
    "neuroscience_concept" character varying,
    "brain_town_metaphor" "text",
    "diagnosis_pathways" "text"[] DEFAULT '{}'::"text"[],
    "fasd_domain_ids" integer[] DEFAULT '{}'::integer[],
    "fasd_strategies" "text",
    "module_objective" "text",
    "facilitator_tip" "text",
    "reflection_prompt" "text",
    "reward_text" "text",
    "bridge_from_module_id" "uuid",
    "module_id_code" character varying(30),
    "level_name" character varying(30)
);


ALTER TABLE "public"."modules_to_generate" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ndis_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain_name" character varying NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ndis_domains" OWNER TO "postgres";


COMMENT ON TABLE "public"."ndis_domains" IS 'NDIS outcome domains for linking modules to funded support goals.';



CREATE TABLE IF NOT EXISTS "public"."needs_based_pathways" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "presenting_pattern" "text" NOT NULL,
    "recommended_path" character varying(40) NOT NULL,
    "rationale" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."needs_based_pathways" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "purchased_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."parent_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "is_admin" boolean DEFAULT false,
    "full_name" "text",
    "phone" "text",
    "credits" integer DEFAULT 0,
    "subscription_tier" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."parent_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_scripts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "context" "text" NOT NULL,
    "script" "text" NOT NULL,
    "feelings" "text"[] DEFAULT '{}'::"text"[],
    "tools" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."parent_scripts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_subscriptions" (
    "parent_id" "uuid" NOT NULL,
    "tier" "text",
    "status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "current_period_start" "date",
    "current_period_end" "date",
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "stripe_current_period_start" timestamp with time zone,
    "stripe_current_period_end" timestamp with time zone,
    CONSTRAINT "parent_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['inactive'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'paused'::"text", 'trialing'::"text"])))
);


ALTER TABLE "public"."parent_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pathway_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "pathway_category" "text" NOT NULL,
    "assessment_type" "text" NOT NULL,
    "total_score" integer NOT NULL,
    "max_score" integer DEFAULT 24 NOT NULL,
    "efficacy_score" numeric(3,2),
    "question_scores" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "responses" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "module_id" "uuid",
    "week_number" integer,
    "cycle_number" "text",
    CONSTRAINT "pathway_assessments_assessment_type_check" CHECK (("assessment_type" = ANY (ARRAY['baseline'::"text", 'midpoint'::"text", 'endpoint'::"text", 'checkin'::"text", 'check_in'::"text"])))
);


ALTER TABLE "public"."pathway_assessments" OWNER TO "postgres";


COMMENT ON TABLE "public"."pathway_assessments" IS 'Stores psychology-based progress assessments for children on different emotional/behavioral pathways. 
Each child can have baseline, midpoint, and endpoint assessments per pathway category.
Assessments use validated frameworks like SDQ, SCARED-5, and emotion regulation measures adapted for children.';



CREATE OR REPLACE VIEW "public"."pathway_progress_summary" WITH ("security_invoker"='on') AS
 SELECT "child_id",
    "pathway_category",
    "max"(
        CASE
            WHEN ("assessment_type" = 'baseline'::"text") THEN "total_score"
            ELSE NULL::integer
        END) AS "baseline_score",
    "max"(
        CASE
            WHEN ("assessment_type" = 'baseline'::"text") THEN "efficacy_score"
            ELSE NULL::numeric
        END) AS "baseline_efficacy",
    "max"(
        CASE
            WHEN ("assessment_type" = 'baseline'::"text") THEN "created_at"
            ELSE NULL::timestamp with time zone
        END) AS "baseline_date",
    "max"(
        CASE
            WHEN ("assessment_type" = 'midpoint'::"text") THEN "total_score"
            ELSE NULL::integer
        END) AS "midpoint_score",
    "max"(
        CASE
            WHEN ("assessment_type" = 'midpoint'::"text") THEN "efficacy_score"
            ELSE NULL::numeric
        END) AS "midpoint_efficacy",
    "max"(
        CASE
            WHEN ("assessment_type" = 'midpoint'::"text") THEN "created_at"
            ELSE NULL::timestamp with time zone
        END) AS "midpoint_date",
    "max"(
        CASE
            WHEN ("assessment_type" = 'endpoint'::"text") THEN "total_score"
            ELSE NULL::integer
        END) AS "endpoint_score",
    "max"(
        CASE
            WHEN ("assessment_type" = 'endpoint'::"text") THEN "efficacy_score"
            ELSE NULL::numeric
        END) AS "endpoint_efficacy",
    "max"(
        CASE
            WHEN ("assessment_type" = 'endpoint'::"text") THEN "created_at"
            ELSE NULL::timestamp with time zone
        END) AS "endpoint_date",
    ("max"(
        CASE
            WHEN ("assessment_type" = 'endpoint'::"text") THEN "total_score"
            ELSE NULL::integer
        END) - "max"(
        CASE
            WHEN ("assessment_type" = 'baseline'::"text") THEN "total_score"
            ELSE NULL::integer
        END)) AS "total_change",
    "count"(*) AS "assessment_count",
        CASE
            WHEN ("max"(
            CASE
                WHEN ("assessment_type" = 'endpoint'::"text") THEN 1
                ELSE 0
            END) = 1) THEN 'completed'::"text"
            WHEN ("max"(
            CASE
                WHEN ("assessment_type" = 'midpoint'::"text") THEN 1
                ELSE 0
            END) = 1) THEN 'in_progress'::"text"
            WHEN ("max"(
            CASE
                WHEN ("assessment_type" = 'baseline'::"text") THEN 1
                ELSE 0
            END) = 1) THEN 'started'::"text"
            ELSE 'not_started'::"text"
        END AS "journey_status"
   FROM "public"."pathway_assessments"
  GROUP BY "child_id", "pathway_category";


ALTER VIEW "public"."pathway_progress_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pathways" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text"
);


ALTER TABLE "public"."pathways" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "child_id" "uuid" NOT NULL,
    "reward_id" "uuid",
    "reward_title" "text" NOT NULL,
    "reward_description" "text",
    "star_cost" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "notes" "text"
);


ALTER TABLE "public"."reward_purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "star_cost" integer NOT NULL,
    "icon" "text" DEFAULT '🎁'::"text",
    "is_baseline" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "category" "text" DEFAULT 'other'::"text",
    "child_id" "uuid",
    CONSTRAINT "rewards_star_cost_check" CHECK (("star_cost" > 0))
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roadblock_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "spawn_chance" numeric(3,2) DEFAULT 0.20,
    "force_spawn_after_modules" integer DEFAULT 4,
    "cooldown_modules" integer DEFAULT 2,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."roadblock_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roadblocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "roadblock_type" "text" NOT NULL,
    "difficulty" integer DEFAULT 1,
    "content_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tagged_super_skill_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "tagged_sub_skill_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "xp_reward" integer DEFAULT 25,
    "stars_reward" integer DEFAULT 5,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roadblocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sequencing_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier" character varying(30) NOT NULL,
    "skill_codes" "text"[] NOT NULL,
    "rule_description" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sequencing_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."series" (
    "id" bigint NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "character_type" "text" DEFAULT 'Dog'::"text",
    "emoji" "text"
);


ALTER TABLE "public"."series" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."series_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."series_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."series_id_seq" OWNED BY "public"."series"."id";



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "weekly_checkin_enabled" boolean DEFAULT true,
    "challenges" "text"[] DEFAULT ARRAY['Morning routine'::"text", 'Bedtime routine'::"text", 'Homework time'::"text", 'Sibling conflict'::"text", 'Screen time limits'::"text", 'Transitions'::"text", 'Mealtime'::"text"],
    "goals" "text"[] DEFAULT ARRAY['Use a calm-down tool once'::"text", 'Name the feeling before reacting'::"text", 'Take 3 deep breaths when upset'::"text", 'Use kind words during conflict'::"text", 'Ask for help when needed'::"text"],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "claude_api_key" "text",
    "ai_prompt_template" "text"
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" "text" NOT NULL,
    "label" "text" NOT NULL
);


ALTER TABLE "public"."skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_credit_ledger" (
    "id" bigint NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "entry_type" "text" NOT NULL,
    "credits_delta" integer NOT NULL,
    "module_id" "uuid",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_invoice_id" "text",
    "stripe_event_id" "text",
    CONSTRAINT "subscription_credit_ledger_check" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "subscription_credit_ledger_entry_type_check" CHECK (("entry_type" = ANY (ARRAY['grant'::"text", 'adjustment'::"text", 'spend'::"text", 'refund'::"text", 'expire'::"text"])))
);


ALTER TABLE "public"."subscription_credit_ledger" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."subscription_credit_ledger_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."subscription_credit_ledger_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."subscription_credit_ledger_id_seq" OWNED BY "public"."subscription_credit_ledger"."id";



CREATE TABLE IF NOT EXISTS "public"."subscription_tiers" (
    "tier" "text" NOT NULL,
    "modules_per_month" integer NOT NULL,
    "monthly_price_cents" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "includes_behavioural_support" boolean DEFAULT false,
    "includes_parent_insights" boolean DEFAULT false,
    "display_name" "text",
    "discount_3_month" integer,
    "discount_6_month" integer,
    "discount_12_month" integer,
    CONSTRAINT "subscription_tiers_modules_per_month_check" CHECK (("modules_per_month" > 0)),
    CONSTRAINT "subscription_tiers_tier_check" CHECK (("tier" = ANY (ARRAY['low'::"text", 'mid'::"text", 'top'::"text"])))
);


ALTER TABLE "public"."subscription_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."super_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "theme_color" "text" DEFAULT '#405878'::"text",
    "icon" "text",
    "emoji" "text",
    "character_name" "text",
    "character_image_url" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "relevant_theories" "text",
    "code" character varying(4),
    "domain" "text",
    "species" "text",
    "personality" "text",
    "nd_affirmation" "text",
    "character_id" "uuid"
);


ALTER TABLE "public"."super_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."theory_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "super_skill_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "primary_theory_id" "uuid" NOT NULL,
    "citation" "text",
    "brain_town_application" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."theory_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tools" (
    "id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "skills" "text"[] DEFAULT '{}'::"text"[],
    "emotions" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."tools" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_child_dashboard" WITH ("security_invoker"='on') AS
 SELECT "id" AS "child_id",
    "name" AS "child_name",
    COALESCE("total_xp", 0) AS "total_xp",
    COALESCE("level", 1) AS "level",
    ("public"."xp_for_next_level"(COALESCE("level", 1)) - COALESCE("total_xp", 0)) AS "xp_to_next_level",
    COALESCE("stars", (0)::numeric) AS "stars",
    COALESCE("spendable_stars", 0) AS "spendable_stars",
    ( SELECT "json_agg"("json_build_object"('super_skill_id', "ss"."id", 'name', "ss"."name", 'slug', "ss"."slug", 'emoji', "ss"."emoji", 'theme_color', "ss"."theme_color", 'character_name', "ss"."character_name", 'status', COALESCE("csp"."status", 'locked'::"text"), 'current_week', COALESCE("csp"."current_week", 0), 'total_xp_in_skill', COALESCE("csp"."total_xp_in_skill", 0)) ORDER BY "ss"."sort_order") AS "json_agg"
           FROM ("public"."super_skills" "ss"
             LEFT JOIN "public"."child_super_skill_progress" "csp" ON ((("csp"."super_skill_id" = "ss"."id") AND ("csp"."child_id" = "c"."id"))))
          WHERE ("ss"."is_active" = true)) AS "super_skills",
    ( SELECT "json_agg"("json_build_object"('badge_id', "b"."id", 'name', "b"."name", 'slug', "b"."slug", 'earned_at', "cb"."earned_at")) AS "json_agg"
           FROM ("public"."child_badges" "cb"
             JOIN "public"."badges" "b" ON (("b"."id" = "cb"."badge_id")))
          WHERE ("cb"."child_id" = "c"."id")) AS "earned_badges"
   FROM "public"."children" "c";


ALTER VIEW "public"."v_child_dashboard" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_parent_credit_summary" WITH ("security_invoker"='on') AS
 SELECT "parent_id",
    "period_start",
    "period_end",
    COALESCE("sum"(
        CASE
            WHEN ("credits_delta" > 0) THEN "credits_delta"
            ELSE 0
        END), (0)::bigint) AS "credits_granted",
    "abs"(COALESCE("sum"(
        CASE
            WHEN ("credits_delta" < 0) THEN "credits_delta"
            ELSE 0
        END), (0)::bigint)) AS "credits_used",
    COALESCE("sum"("credits_delta"), (0)::bigint) AS "credits_available"
   FROM "public"."subscription_credit_ledger" "l"
  GROUP BY "parent_id", "period_start", "period_end";


ALTER VIEW "public"."v_parent_credit_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_user_id" "uuid" NOT NULL,
    "child_id" "uuid" NOT NULL,
    "intensity" integer NOT NULL,
    "challenge" "text" NOT NULL,
    "triggers" "text"[] DEFAULT '{}'::"text"[],
    "goal" "text",
    "notes" "text",
    "generated_plan" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sub_skill_id" "uuid",
    "week_number" integer,
    "module_id" "uuid",
    CONSTRAINT "weekly_checkins_intensity_check" CHECK ((("intensity" >= 1) AND ("intensity" <= 5)))
);


ALTER TABLE "public"."weekly_checkins" OWNER TO "postgres";


ALTER TABLE ONLY "public"."module_unlocks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."module_unlocks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."series" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."series_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."subscription_credit_ledger" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."subscription_credit_ledger_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "Children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "Modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."age_ranges"
    ADD CONSTRAINT "age_ranges_age_range_key" UNIQUE ("age_range");



ALTER TABLE ONLY "public"."age_ranges"
    ADD CONSTRAINT "age_ranges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_generation_jobs"
    ADD CONSTRAINT "ai_generation_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_module_config"
    ADD CONSTRAINT "ai_module_config_config_type_key" UNIQUE ("config_type");



ALTER TABLE ONLY "public"."ai_module_config"
    ADD CONSTRAINT "ai_module_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_question_key_key" UNIQUE ("question_key");



ALTER TABLE ONLY "public"."audit_criteria"
    ADD CONSTRAINT "audit_criteria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_rules"
    ADD CONSTRAINT "audit_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_rules"
    ADD CONSTRAINT "audit_rules_section_id_rule_number_key" UNIQUE ("section_id", "rule_number");



ALTER TABLE ONLY "public"."audit_sections"
    ADD CONSTRAINT "audit_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_sections"
    ADD CONSTRAINT "audit_sections_section_number_key" UNIQUE ("section_number");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."brain_town_vocabulary"
    ADD CONSTRAINT "brain_town_vocabulary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_colors"
    ADD CONSTRAINT "category_colors_category_key" UNIQUE ("category");



ALTER TABLE ONLY "public"."category_colors"
    ADD CONSTRAINT "category_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_super_skill_id_key" UNIQUE ("super_skill_id");



ALTER TABLE ONLY "public"."checkin_challenges"
    ADD CONSTRAINT "checkin_challenges_label_key" UNIQUE ("label");



ALTER TABLE ONLY "public"."checkin_challenges"
    ADD CONSTRAINT "checkin_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkin_goals"
    ADD CONSTRAINT "checkin_goals_label_key" UNIQUE ("label");



ALTER TABLE ONLY "public"."checkin_goals"
    ADD CONSTRAINT "checkin_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkin_triggers"
    ADD CONSTRAINT "checkin_triggers_label_key" UNIQUE ("label");



ALTER TABLE ONLY "public"."checkin_triggers"
    ADD CONSTRAINT "checkin_triggers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_badges"
    ADD CONSTRAINT "child_badges_child_id_badge_id_key" UNIQUE ("child_id", "badge_id");



ALTER TABLE ONLY "public"."child_badges"
    ADD CONSTRAINT "child_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_cycle_progress"
    ADD CONSTRAINT "child_cycle_progress_child_id_cycle_id_key" UNIQUE ("child_id", "cycle_id");



ALTER TABLE ONLY "public"."child_cycle_progress"
    ADD CONSTRAINT "child_cycle_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_focus_plan"
    ADD CONSTRAINT "child_focus_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_modules"
    ADD CONSTRAINT "child_modules_child_id_module_id_key" UNIQUE ("child_id", "module_id");



ALTER TABLE ONLY "public"."child_modules"
    ADD CONSTRAINT "child_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_mood_checkins"
    ADD CONSTRAINT "child_mood_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_roadblock_completions"
    ADD CONSTRAINT "child_roadblock_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_roadblocks"
    ADD CONSTRAINT "child_roadblocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_super_skill_progress"
    ADD CONSTRAINT "child_super_skill_progress_child_id_super_skill_id_key" UNIQUE ("child_id", "super_skill_id");



ALTER TABLE ONLY "public"."child_super_skill_progress"
    ADD CONSTRAINT "child_super_skill_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_theories"
    ADD CONSTRAINT "core_theories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_theories"
    ADD CONSTRAINT "core_theories_theory_code_key" UNIQUE ("theory_code");



ALTER TABLE ONLY "public"."core_theories"
    ADD CONSTRAINT "core_theories_theory_name_key" UNIQUE ("theory_name");



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_super_skill_id_cycle_number_key" UNIQUE ("super_skill_id", "cycle_number");



ALTER TABLE ONLY "public"."daily_quest_completions"
    ADD CONSTRAINT "daily_quest_completions_child_id_completed_date_key" UNIQUE ("child_id", "completed_date");



ALTER TABLE ONLY "public"."daily_quest_completions"
    ADD CONSTRAINT "daily_quest_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diagnosis_profiles"
    ADD CONSTRAINT "diagnosis_profiles_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."diagnosis_profiles"
    ADD CONSTRAINT "diagnosis_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dss_sedi_categories"
    ADD CONSTRAINT "dss_sedi_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dss_sedi_categories"
    ADD CONSTRAINT "dss_sedi_categories_sedi_code_key" UNIQUE ("sedi_code");



ALTER TABLE ONLY "public"."emotions"
    ADD CONSTRAINT "emotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fasd_domains"
    ADD CONSTRAINT "fasd_domains_domain_number_key" UNIQUE ("domain_number");



ALTER TABLE ONLY "public"."fasd_domains"
    ADD CONSTRAINT "fasd_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."focus_plan_categories"
    ADD CONSTRAINT "focus_plan_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."focus_plan_categories"
    ADD CONSTRAINT "focus_plan_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."focus_plan_frequencies"
    ADD CONSTRAINT "focus_plan_frequencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."focus_plan_frequencies"
    ADD CONSTRAINT "focus_plan_frequencies_value_key" UNIQUE ("value");



ALTER TABLE ONLY "public"."focus_plan_goals"
    ADD CONSTRAINT "focus_plan_goals_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."focus_plan_goals"
    ADD CONSTRAINT "focus_plan_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."focus_plan_intensities"
    ADD CONSTRAINT "focus_plan_intensities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."focus_plan_intensities"
    ADD CONSTRAINT "focus_plan_intensities_value_key" UNIQUE ("value");



ALTER TABLE ONLY "public"."forbidden_terms"
    ADD CONSTRAINT "forbidden_terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_level_key" UNIQUE ("level");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_streaks"
    ADD CONSTRAINT "login_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_responses"
    ADD CONSTRAINT "module_responses_child_module_question_unique" UNIQUE ("child_id", "module_id", "question_id");



ALTER TABLE ONLY "public"."module_responses"
    ADD CONSTRAINT "module_responses_child_module_unique" UNIQUE ("child_id", "module_id");



ALTER TABLE ONLY "public"."module_responses"
    ADD CONSTRAINT "module_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_secondary_theories"
    ADD CONSTRAINT "module_secondary_theories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_secondary_theories"
    ADD CONSTRAINT "module_secondary_theories_unique" UNIQUE ("module_id", "theory_id");



ALTER TABLE ONLY "public"."module_unlocks"
    ADD CONSTRAINT "module_unlocks_parent_id_module_id_period_start_period_end_key" UNIQUE ("parent_id", "module_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."module_unlocks"
    ADD CONSTRAINT "module_unlocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ndis_domains"
    ADD CONSTRAINT "ndis_domains_domain_name_key" UNIQUE ("domain_name");



ALTER TABLE ONLY "public"."ndis_domains"
    ADD CONSTRAINT "ndis_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."needs_based_pathways"
    ADD CONSTRAINT "needs_based_pathways_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_modules"
    ADD CONSTRAINT "parent_modules_parent_id_module_id_key" UNIQUE ("parent_id", "module_id");



ALTER TABLE ONLY "public"."parent_modules"
    ADD CONSTRAINT "parent_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_profiles"
    ADD CONSTRAINT "parent_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_scripts"
    ADD CONSTRAINT "parent_scripts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_subscriptions"
    ADD CONSTRAINT "parent_subscriptions_pkey" PRIMARY KEY ("parent_id");



ALTER TABLE ONLY "public"."pathway_assessments"
    ADD CONSTRAINT "pathway_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pathways"
    ADD CONSTRAINT "pathways_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pathways"
    ADD CONSTRAINT "pathways_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_purchases"
    ADD CONSTRAINT "reward_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roadblock_config"
    ADD CONSTRAINT "roadblock_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roadblocks"
    ADD CONSTRAINT "roadblocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sequencing_rules"
    ADD CONSTRAINT "sequencing_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."series"
    ADD CONSTRAINT "series_label_key" UNIQUE ("label");



ALTER TABLE ONLY "public"."series"
    ADD CONSTRAINT "series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_skills"
    ADD CONSTRAINT "sub_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_skills"
    ADD CONSTRAINT "sub_skills_super_skill_id_slug_key" UNIQUE ("super_skill_id", "slug");



ALTER TABLE ONLY "public"."subscription_credit_ledger"
    ADD CONSTRAINT "subscription_credit_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_tiers"
    ADD CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("tier");



ALTER TABLE ONLY "public"."super_skills"
    ADD CONSTRAINT "super_skills_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."super_skills"
    ADD CONSTRAINT "super_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."super_skills"
    ADD CONSTRAINT "super_skills_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."theory_connections"
    ADD CONSTRAINT "theory_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."theory_connections"
    ADD CONSTRAINT "theory_connections_unique" UNIQUE ("super_skill_id", "cycle_id", "primary_theory_id");



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "unique_baseline_title" UNIQUE NULLS NOT DISTINCT ("title", "parent_user_id", "is_baseline");



ALTER TABLE ONLY "public"."child_roadblock_completions"
    ADD CONSTRAINT "unique_child_roadblock" UNIQUE ("child_id", "roadblock_id");



ALTER TABLE ONLY "public"."weekly_checkins"
    ADD CONSTRAINT "weekly_checkins_pkey" PRIMARY KEY ("id");



CREATE INDEX "child_mood_checkins_child_created_at_idx" ON "public"."child_mood_checkins" USING "btree" ("child_id", "created_at" DESC);



CREATE INDEX "idx_age_ranges_active" ON "public"."age_ranges" USING "btree" ("is_active");



CREATE INDEX "idx_age_ranges_range" ON "public"."age_ranges" USING "btree" ("age_range");



CREATE INDEX "idx_ai_generation_jobs_created_at" ON "public"."ai_generation_jobs" USING "btree" ("created_at");



CREATE INDEX "idx_ai_generation_jobs_status" ON "public"."ai_generation_jobs" USING "btree" ("status");



CREATE INDEX "idx_ai_jobs_created" ON "public"."ai_generation_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_jobs_status" ON "public"."ai_generation_jobs" USING "btree" ("status");



CREATE INDEX "idx_ai_module_config_type" ON "public"."ai_module_config" USING "btree" ("config_type");



CREATE INDEX "idx_audit_rules_active" ON "public"."audit_rules" USING "btree" ("is_active");



CREATE INDEX "idx_audit_rules_section" ON "public"."audit_rules" USING "btree" ("section_id");



CREATE INDEX "idx_audit_sections_active" ON "public"."audit_sections" USING "btree" ("is_active");



CREATE INDEX "idx_audit_sections_number" ON "public"."audit_sections" USING "btree" ("section_number");



CREATE INDEX "idx_badges_super_skill" ON "public"."badges" USING "btree" ("super_skill_id");



CREATE UNIQUE INDEX "idx_checkin_child_subskill_week" ON "public"."weekly_checkins" USING "btree" ("child_id", "sub_skill_id", "week_number") WHERE (("sub_skill_id" IS NOT NULL) AND ("week_number" IS NOT NULL));



CREATE INDEX "idx_child_badges_child" ON "public"."child_badges" USING "btree" ("child_id");



CREATE INDEX "idx_child_cycle_progress_child" ON "public"."child_cycle_progress" USING "btree" ("child_id");



CREATE INDEX "idx_child_focus_plan_child_active" ON "public"."child_focus_plan" USING "btree" ("child_id", "is_active", "created_at" DESC);



CREATE INDEX "idx_child_focus_plan_super_skill" ON "public"."child_focus_plan" USING "btree" ("super_skill_id");



CREATE INDEX "idx_child_roadblock_completions_child" ON "public"."child_roadblock_completions" USING "btree" ("child_id");



CREATE INDEX "idx_child_roadblock_completions_roadblock" ON "public"."child_roadblock_completions" USING "btree" ("roadblock_id");



CREATE INDEX "idx_child_roadblocks_child" ON "public"."child_roadblocks" USING "btree" ("child_id");



CREATE INDEX "idx_child_roadblocks_status" ON "public"."child_roadblocks" USING "btree" ("status");



CREATE INDEX "idx_child_super_skill_progress_child" ON "public"."child_super_skill_progress" USING "btree" ("child_id");



CREATE INDEX "idx_children_level" ON "public"."children" USING "btree" ("level");



CREATE INDEX "idx_children_total_xp" ON "public"."children" USING "btree" ("total_xp");



CREATE INDEX "idx_core_theories_active" ON "public"."core_theories" USING "btree" ("is_active");



CREATE INDEX "idx_core_theories_category" ON "public"."core_theories" USING "btree" ("category");



CREATE INDEX "idx_core_theories_code" ON "public"."core_theories" USING "btree" ("theory_code");



CREATE INDEX "idx_cycles_super_skill" ON "public"."cycles" USING "btree" ("super_skill_id");



CREATE INDEX "idx_daily_quest_child_date" ON "public"."daily_quest_completions" USING "btree" ("child_id", "completed_date");



CREATE INDEX "idx_daily_quest_date" ON "public"."daily_quest_completions" USING "btree" ("completed_date");



CREATE INDEX "idx_emotions_label" ON "public"."emotions" USING "btree" ("label");



CREATE INDEX "idx_forbidden_terms_active" ON "public"."forbidden_terms" USING "btree" ("is_active");



CREATE INDEX "idx_forbidden_terms_type" ON "public"."forbidden_terms" USING "btree" ("term_type");



CREATE UNIQUE INDEX "idx_forbidden_terms_unique" ON "public"."forbidden_terms" USING "btree" ("lower"("term"), "term_type");



CREATE INDEX "idx_levels_level" ON "public"."levels" USING "btree" ("level");



CREATE INDEX "idx_module_responses_child_id" ON "public"."module_responses" USING "btree" ("child_id");



CREATE INDEX "idx_module_responses_child_module" ON "public"."module_responses" USING "btree" ("child_id", "module_id");



CREATE INDEX "idx_module_responses_created_at" ON "public"."module_responses" USING "btree" ("created_at");



CREATE INDEX "idx_module_responses_module" ON "public"."module_responses" USING "btree" ("module_id");



CREATE INDEX "idx_module_responses_module_id" ON "public"."module_responses" USING "btree" ("module_id");



CREATE INDEX "idx_module_responses_parent_user_id" ON "public"."module_responses" USING "btree" ("parent_user_id");



CREATE INDEX "idx_module_responses_question" ON "public"."module_responses" USING "btree" ("question_id");



CREATE INDEX "idx_module_secondary_theories_module_id" ON "public"."module_secondary_theories" USING "btree" ("module_id");



CREATE INDEX "idx_module_secondary_theories_theory_id" ON "public"."module_secondary_theories" USING "btree" ("theory_id");



CREATE INDEX "idx_module_unlocks_parent_active" ON "public"."module_unlocks" USING "btree" ("parent_id", "is_active", "period_end");



CREATE INDEX "idx_modules_cycle" ON "public"."modules" USING "btree" ("cycle_id");



CREATE INDEX "idx_modules_dss_sedi_id" ON "public"."modules" USING "btree" ("dss_sedi_id") WHERE ("dss_sedi_id" IS NOT NULL);



CREATE INDEX "idx_modules_ndis_domain_id" ON "public"."modules" USING "btree" ("ndis_domain_id") WHERE ("ndis_domain_id" IS NOT NULL);



CREATE INDEX "idx_modules_primary_theory_id" ON "public"."modules" USING "btree" ("primary_theory_id") WHERE ("primary_theory_id" IS NOT NULL);



CREATE INDEX "idx_modules_sub_skill" ON "public"."modules" USING "btree" ("sub_skill_id");



CREATE INDEX "idx_modules_super_skill" ON "public"."modules" USING "btree" ("super_skill_id");



CREATE INDEX "idx_modules_to_generate_cycle_week" ON "public"."modules_to_generate" USING "btree" ("cycle", "week_number");



CREATE INDEX "idx_modules_to_generate_has_been_generated" ON "public"."modules_to_generate" USING "btree" ("has_been_generated");



CREATE INDEX "idx_modules_to_generate_super_skill" ON "public"."modules_to_generate" USING "btree" ("super_skill_id");



CREATE INDEX "idx_parent_modules_module" ON "public"."parent_modules" USING "btree" ("module_id");



CREATE INDEX "idx_parent_modules_parent" ON "public"."parent_modules" USING "btree" ("parent_id");



CREATE INDEX "idx_parent_profiles_is_admin" ON "public"."parent_profiles" USING "btree" ("is_admin");



CREATE INDEX "idx_pathway_assessments_child_id" ON "public"."pathway_assessments" USING "btree" ("child_id");



CREATE INDEX "idx_pathway_assessments_child_module_type" ON "public"."pathway_assessments" USING "btree" ("child_id", "module_id", "assessment_type");



CREATE INDEX "idx_pathway_assessments_child_pathway" ON "public"."pathway_assessments" USING "btree" ("child_id", "pathway_category");



CREATE INDEX "idx_pathway_assessments_child_week_cycle" ON "public"."pathway_assessments" USING "btree" ("child_id", "pathway_category", "week_number", "cycle_number", "assessment_type");



CREATE INDEX "idx_pathway_assessments_module_id" ON "public"."pathway_assessments" USING "btree" ("module_id");



CREATE INDEX "idx_pathway_assessments_pathway_category" ON "public"."pathway_assessments" USING "btree" ("pathway_category");



CREATE INDEX "idx_pathway_assessments_type" ON "public"."pathway_assessments" USING "btree" ("assessment_type");



CREATE INDEX "idx_reward_purchases_child" ON "public"."reward_purchases" USING "btree" ("child_id");



CREATE INDEX "idx_reward_purchases_created" ON "public"."reward_purchases" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reward_purchases_status" ON "public"."reward_purchases" USING "btree" ("status");



CREATE INDEX "idx_rewards_active" ON "public"."rewards" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_rewards_child_id" ON "public"."rewards" USING "btree" ("child_id");



CREATE INDEX "idx_rewards_parent_user" ON "public"."rewards" USING "btree" ("parent_user_id");



CREATE INDEX "idx_roadblocks_type" ON "public"."roadblocks" USING "btree" ("roadblock_type");



CREATE INDEX "idx_series_label" ON "public"."series" USING "btree" ("label");



CREATE INDEX "idx_skills_label" ON "public"."skills" USING "btree" ("label");



CREATE INDEX "idx_sub_skills_super_skill" ON "public"."sub_skills" USING "btree" ("super_skill_id");



CREATE INDEX "idx_subscription_credit_ledger_parent_period" ON "public"."subscription_credit_ledger" USING "btree" ("parent_id", "period_start", "period_end");



CREATE INDEX "idx_theory_connections_cycle_id" ON "public"."theory_connections" USING "btree" ("cycle_id");



CREATE INDEX "idx_theory_connections_primary_theory_id" ON "public"."theory_connections" USING "btree" ("primary_theory_id");



CREATE INDEX "idx_theory_connections_sort_order" ON "public"."theory_connections" USING "btree" ("sort_order");



CREATE INDEX "idx_theory_connections_super_skill_id" ON "public"."theory_connections" USING "btree" ("super_skill_id");



CREATE INDEX "login_streaks_child_id_idx" ON "public"."login_streaks" USING "btree" ("child_id");



CREATE UNIQUE INDEX "login_streaks_user_child_unique" ON "public"."login_streaks" USING "btree" ("user_id", "child_id");



CREATE UNIQUE INDEX "parent_subscriptions_stripe_customer_uidx" ON "public"."parent_subscriptions" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE UNIQUE INDEX "parent_subscriptions_stripe_subscription_uidx" ON "public"."parent_subscriptions" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE INDEX "pathway_assessments_child_id_idx" ON "public"."pathway_assessments" USING "btree" ("child_id");



CREATE INDEX "pathway_assessments_child_pathway_created_idx" ON "public"."pathway_assessments" USING "btree" ("child_id", "pathway_category", "created_at");



CREATE INDEX "pathway_assessments_child_pathway_type_created_idx" ON "public"."pathway_assessments" USING "btree" ("child_id", "pathway_category", "assessment_type", "created_at");



CREATE UNIQUE INDEX "subscription_credit_ledger_source_invoice_uidx" ON "public"."subscription_credit_ledger" USING "btree" ("source_invoice_id") WHERE ("source_invoice_id" IS NOT NULL);



CREATE UNIQUE INDEX "subscription_credit_ledger_stripe_event_uidx" ON "public"."subscription_credit_ledger" USING "btree" ("stripe_event_id") WHERE ("stripe_event_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_child_focus_plan_one_active_per_child" ON "public"."child_focus_plan" USING "btree" ("child_id") WHERE ("is_active" = true);



CREATE INDEX "weekly_checkins_parent_child_idx" ON "public"."weekly_checkins" USING "btree" ("parent_user_id", "child_id", "created_at" DESC);



CREATE OR REPLACE VIEW "public"."module_theory_view" WITH ("security_invoker"='on') AS
 SELECT "m"."id",
    "m"."code",
    "m"."title",
    "pt"."theory_name" AS "primary_theory_name",
    "pt"."theory_code" AS "primary_theory_code",
    "array_agg"("st"."theory_name" ORDER BY "mst"."sort_order") FILTER (WHERE ("st"."id" IS NOT NULL)) AS "secondary_theories",
    "nd"."domain_name" AS "ndis_domain",
    "ds"."sedi_name" AS "dss_sedi",
    "m"."neuroscience_concept",
    "m"."brain_town_metaphor"
   FROM ((((("public"."modules" "m"
     LEFT JOIN "public"."core_theories" "pt" ON (("m"."primary_theory_id" = "pt"."id")))
     LEFT JOIN "public"."module_secondary_theories" "mst" ON (("m"."id" = "mst"."module_id")))
     LEFT JOIN "public"."core_theories" "st" ON (("mst"."theory_id" = "st"."id")))
     LEFT JOIN "public"."ndis_domains" "nd" ON (("m"."ndis_domain_id" = "nd"."id")))
     LEFT JOIN "public"."dss_sedi_categories" "ds" ON (("m"."dss_sedi_id" = "ds"."id")))
  GROUP BY "m"."id", "pt"."theory_name", "pt"."theory_code", "nd"."domain_name", "ds"."sedi_name";



CREATE OR REPLACE TRIGGER "category_colors_updated_at" BEFORE UPDATE ON "public"."category_colors" FOR EACH ROW EXECUTE FUNCTION "public"."update_category_colors_updated_at"();



CREATE OR REPLACE TRIGGER "check_secondary_theory_count" BEFORE INSERT ON "public"."module_secondary_theories" FOR EACH ROW EXECUTE FUNCTION "public"."validate_secondary_theory_count"();



CREATE OR REPLACE TRIGGER "on_module_created" AFTER INSERT ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."add_module_to_all_parents"();



CREATE OR REPLACE TRIGGER "set_pathway_assessments_updated_at" BEFORE UPDATE ON "public"."pathway_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_settings_updated_at"();



CREATE OR REPLACE TRIGGER "tr_parent_subscriptions_updated_at" BEFORE UPDATE ON "public"."parent_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "tr_subscription_tiers_updated_at" BEFORE UPDATE ON "public"."subscription_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_child_focus_plan_set_updated_at" BEFORE UPDATE ON "public"."child_focus_plan" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_propagate_child_name_change" AFTER UPDATE OF "name" ON "public"."children" FOR EACH ROW EXECUTE FUNCTION "public"."propagate_child_name_change"();



CREATE OR REPLACE TRIGGER "trg_sync_child_module_child_name" BEFORE INSERT OR UPDATE OF "child_id" ON "public"."child_modules" FOR EACH ROW EXECUTE FUNCTION "public"."sync_child_module_child_name"();



CREATE OR REPLACE TRIGGER "trg_sync_child_module_title" BEFORE INSERT OR UPDATE OF "module_id" ON "public"."child_modules" FOR EACH ROW EXECUTE FUNCTION "public"."sync_child_module_title"();



CREATE OR REPLACE TRIGGER "trigger_age_ranges_updated_at" BEFORE UPDATE ON "public"."age_ranges" FOR EACH ROW EXECUTE FUNCTION "public"."update_age_ranges_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_audit_rules_updated_at" BEFORE UPDATE ON "public"."audit_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_audit_rules_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_audit_sections_updated_at" BEFORE UPDATE ON "public"."audit_sections" FOR EACH ROW EXECUTE FUNCTION "public"."update_audit_sections_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_core_theories_updated_at" BEFORE UPDATE ON "public"."core_theories" FOR EACH ROW EXECUTE FUNCTION "public"."update_core_theories_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_forbidden_terms_updated_at" BEFORE UPDATE ON "public"."forbidden_terms" FOR EACH ROW EXECUTE FUNCTION "public"."update_forbidden_terms_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_modules_to_generate_updated_at" BEFORE UPDATE ON "public"."modules_to_generate" FOR EACH ROW EXECUTE FUNCTION "public"."update_modules_to_generate_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_pathway_assessments_updated_at" BEFORE UPDATE ON "public"."pathway_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."update_pathway_assessments_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_spendable_stars" BEFORE INSERT OR UPDATE OF "stars", "spent_stars" ON "public"."children" FOR EACH ROW EXECUTE FUNCTION "public"."update_spendable_stars"();



CREATE OR REPLACE TRIGGER "update_ai_generation_jobs_updated_at" BEFORE UPDATE ON "public"."ai_generation_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_levels_updated_at" BEFORE UPDATE ON "public"."levels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_module_responses_updated_at" BEFORE UPDATE ON "public"."module_responses" FOR EACH ROW EXECUTE FUNCTION "public"."update_module_responses_updated_at"();



CREATE OR REPLACE TRIGGER "update_theory_connections_updated_at" BEFORE UPDATE ON "public"."theory_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_generation_jobs"
    ADD CONSTRAINT "ai_generation_jobs_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id");



ALTER TABLE ONLY "public"."ai_generation_jobs"
    ADD CONSTRAINT "ai_generation_jobs_parent_job_id_fkey" FOREIGN KEY ("parent_job_id") REFERENCES "public"."ai_generation_jobs"("id");



ALTER TABLE ONLY "public"."audit_rules"
    ADD CONSTRAINT "audit_rules_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."audit_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_badges"
    ADD CONSTRAINT "child_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_badges"
    ADD CONSTRAINT "child_badges_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_cycle_progress"
    ADD CONSTRAINT "child_cycle_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_cycle_progress"
    ADD CONSTRAINT "child_cycle_progress_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_focus_plan"
    ADD CONSTRAINT "child_focus_plan_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."category_colors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_focus_plan"
    ADD CONSTRAINT "child_focus_plan_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_focus_plan"
    ADD CONSTRAINT "child_focus_plan_default_pathway_id_fkey" FOREIGN KEY ("default_pathway_id") REFERENCES "public"."pathways"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_focus_plan"
    ADD CONSTRAINT "child_focus_plan_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_modules"
    ADD CONSTRAINT "child_modules_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_modules"
    ADD CONSTRAINT "child_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id");



ALTER TABLE ONLY "public"."child_mood_checkins"
    ADD CONSTRAINT "child_mood_checkins_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_mood_checkins"
    ADD CONSTRAINT "child_mood_checkins_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_roadblock_completions"
    ADD CONSTRAINT "child_roadblock_completions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_roadblock_completions"
    ADD CONSTRAINT "child_roadblock_completions_roadblock_id_fkey" FOREIGN KEY ("roadblock_id") REFERENCES "public"."roadblocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_roadblocks"
    ADD CONSTRAINT "child_roadblocks_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_roadblocks"
    ADD CONSTRAINT "child_roadblocks_roadblock_id_fkey" FOREIGN KEY ("roadblock_id") REFERENCES "public"."roadblocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_roadblocks"
    ADD CONSTRAINT "child_roadblocks_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_roadblocks"
    ADD CONSTRAINT "child_roadblocks_triggered_by_module_id_fkey" FOREIGN KEY ("triggered_by_module_id") REFERENCES "public"."modules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_super_skill_progress"
    ADD CONSTRAINT "child_super_skill_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_super_skill_progress"
    ADD CONSTRAINT "child_super_skill_progress_current_cycle_id_fkey" FOREIGN KEY ("current_cycle_id") REFERENCES "public"."cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."child_super_skill_progress"
    ADD CONSTRAINT "child_super_skill_progress_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_theories"
    ADD CONSTRAINT "core_theories_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id");



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_quest_completions"
    ADD CONSTRAINT "daily_quest_completions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."focus_plan_categories"
    ADD CONSTRAINT "focus_plan_categories_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."login_streaks"
    ADD CONSTRAINT "login_streaks_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_responses"
    ADD CONSTRAINT "module_responses_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_responses"
    ADD CONSTRAINT "module_responses_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_responses"
    ADD CONSTRAINT "module_responses_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_secondary_theories"
    ADD CONSTRAINT "module_secondary_theories_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_secondary_theories"
    ADD CONSTRAINT "module_secondary_theories_theory_id_fkey" FOREIGN KEY ("theory_id") REFERENCES "public"."core_theories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_unlocks"
    ADD CONSTRAINT "module_unlocks_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_age_range_fkey" FOREIGN KEY ("age_range") REFERENCES "public"."age_ranges"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_bridge_from_module_id_fkey" FOREIGN KEY ("bridge_from_module_id") REFERENCES "public"."modules"("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_dss_sedi_id_fkey" FOREIGN KEY ("dss_sedi_id") REFERENCES "public"."dss_sedi_categories"("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_ndis_domain_id_fkey" FOREIGN KEY ("ndis_domain_id") REFERENCES "public"."ndis_domains"("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pathway_fkey" FOREIGN KEY ("pathway") REFERENCES "public"."pathways"("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_primary_theory_id_fkey" FOREIGN KEY ("primary_theory_id") REFERENCES "public"."core_theories"("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_sub_skill_id_fkey" FOREIGN KEY ("sub_skill_id") REFERENCES "public"."sub_skills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_bridge_from_module_id_fkey" FOREIGN KEY ("bridge_from_module_id") REFERENCES "public"."modules"("id");



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_dss_sedi_id_fkey" FOREIGN KEY ("dss_sedi_id") REFERENCES "public"."dss_sedi_categories"("id");



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_generated_module_id_fkey" FOREIGN KEY ("generated_module_id") REFERENCES "public"."modules"("id");



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_ndis_domain_id_fkey" FOREIGN KEY ("ndis_domain_id") REFERENCES "public"."ndis_domains"("id");



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_primary_theory_id_fkey" FOREIGN KEY ("primary_theory_id") REFERENCES "public"."core_theories"("id");



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_sub_skill_id_fkey" FOREIGN KEY ("sub_skill_id") REFERENCES "public"."sub_skills"("id");



ALTER TABLE ONLY "public"."modules_to_generate"
    ADD CONSTRAINT "modules_to_generate_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id");



ALTER TABLE ONLY "public"."parent_modules"
    ADD CONSTRAINT "parent_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_subscriptions"
    ADD CONSTRAINT "parent_subscriptions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_subscriptions"
    ADD CONSTRAINT "parent_subscriptions_tier_fkey" FOREIGN KEY ("tier") REFERENCES "public"."subscription_tiers"("tier");



ALTER TABLE ONLY "public"."pathway_assessments"
    ADD CONSTRAINT "pathway_assessments_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pathway_assessments"
    ADD CONSTRAINT "pathway_assessments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pathways"
    ADD CONSTRAINT "pathways_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."category_colors"("category") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_purchases"
    ADD CONSTRAINT "reward_purchases_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reward_purchases"
    ADD CONSTRAINT "reward_purchases_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_purchases"
    ADD CONSTRAINT "reward_purchases_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sub_skills"
    ADD CONSTRAINT "sub_skills_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_credit_ledger"
    ADD CONSTRAINT "subscription_credit_ledger_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."super_skills"
    ADD CONSTRAINT "super_skills_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."theory_connections"
    ADD CONSTRAINT "theory_connections_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."theory_connections"
    ADD CONSTRAINT "theory_connections_primary_theory_id_fkey" FOREIGN KEY ("primary_theory_id") REFERENCES "public"."core_theories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."theory_connections"
    ADD CONSTRAINT "theory_connections_super_skill_id_fkey" FOREIGN KEY ("super_skill_id") REFERENCES "public"."super_skills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_checkins"
    ADD CONSTRAINT "weekly_checkins_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_checkins"
    ADD CONSTRAINT "weekly_checkins_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."weekly_checkins"
    ADD CONSTRAINT "weekly_checkins_sub_skill_id_fkey" FOREIGN KEY ("sub_skill_id") REFERENCES "public"."sub_skills"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can manage all child modules" ON "public"."child_modules" USING ("public"."is_user_admin_module_check"());



CREATE POLICY "Admins can manage all module responses" ON "public"."module_responses" USING ("public"."is_user_admin_module_check"());



CREATE POLICY "Admins can manage all modules" ON "public"."modules" USING ("public"."is_user_admin_module_check"());



CREATE POLICY "Admins can manage all parent modules" ON "public"."parent_modules" USING ("public"."is_user_admin_module_check"());



CREATE POLICY "Admins can update all profiles" ON "public"."parent_profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR ("public"."is_user_admin_check"("auth"."uid"()) = true)));



CREATE POLICY "Admins can view all profiles" ON "public"."parent_profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR ("public"."is_user_admin_check"("auth"."uid"()) = true)));



CREATE POLICY "Allow all operations on ai_generation_jobs" ON "public"."ai_generation_jobs" USING (true);



CREATE POLICY "Allow authenticated delete on child_modules" ON "public"."child_modules" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated delete on modules" ON "public"."modules" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated users to delete audit rules" ON "public"."audit_rules" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to delete audit sections" ON "public"."audit_sections" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to delete forbidden terms" ON "public"."forbidden_terms" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to delete modules_to_generate" ON "public"."modules_to_generate" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete theory connections" ON "public"."theory_connections" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to insert audit rules" ON "public"."audit_rules" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to insert audit sections" ON "public"."audit_sections" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to insert forbidden terms" ON "public"."forbidden_terms" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to insert modules_to_generate" ON "public"."modules_to_generate" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert theory connections" ON "public"."theory_connections" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read AI config" ON "public"."ai_module_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read audit rules" ON "public"."audit_rules" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read audit sections" ON "public"."audit_sections" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read forbidden terms" ON "public"."forbidden_terms" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read settings" ON "public"."settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read theory connections" ON "public"."theory_connections" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to update audit rules" ON "public"."audit_rules" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to update audit sections" ON "public"."audit_sections" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to update forbidden terms" ON "public"."forbidden_terms" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to update modules_to_generate" ON "public"."modules_to_generate" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update theory connections" ON "public"."theory_connections" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to view modules_to_generate" ON "public"."modules_to_generate" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow service role to manage AI config" ON "public"."ai_module_config" TO "service_role" USING (true);



CREATE POLICY "Anyone can read active age ranges" ON "public"."age_ranges" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can read active core theories" ON "public"."core_theories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active modules" ON "public"."modules" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Authenticated users can manage age ranges" ON "public"."age_ranges" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can manage core theories" ON "public"."core_theories" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view category_colors" ON "public"."category_colors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view dss_sedi_categories" ON "public"."dss_sedi_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view emotions" ON "public"."emotions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view fasd_domains" ON "public"."fasd_domains" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view module_secondary_theories" ON "public"."module_secondary_theories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view ndis_domains" ON "public"."ndis_domains" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view parent scripts" ON "public"."parent_scripts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view pathways" ON "public"."pathways" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view series" ON "public"."series" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view skills" ON "public"."skills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view tools" ON "public"."tools" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."child_modules" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."cycles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."sub_skills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."super_skills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable select for authenticated users" ON "public"."child_modules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."child_modules" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Levels are viewable by everyone" ON "public"."levels" FOR SELECT USING (true);



CREATE POLICY "Only admins can modify category_colors" ON "public"."category_colors" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify dss_sedi_categories" ON "public"."dss_sedi_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify emotions" ON "public"."emotions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify fasd_domains" ON "public"."fasd_domains" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify module_secondary_theories" ON "public"."module_secondary_theories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify ndis_domains" ON "public"."ndis_domains" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify parent scripts" ON "public"."parent_scripts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify pathways" ON "public"."pathways" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify series" ON "public"."series" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify skills" ON "public"."skills" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Only admins can modify tools" ON "public"."tools" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parent_profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "Parents can delete pathway assessments for their children" ON "public"."pathway_assessments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "pathway_assessments"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can delete their children's focus plans" ON "public"."child_focus_plan" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_focus_plan"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can insert focus plans for their children" ON "public"."child_focus_plan" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_focus_plan"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can insert mood check-ins for their children" ON "public"."child_mood_checkins" FOR INSERT TO "authenticated" WITH CHECK ((("parent_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_mood_checkins"."child_id") AND ("c"."parent_user_id" = "auth"."uid"()))))));



CREATE POLICY "Parents can insert pathway assessments for their children" ON "public"."pathway_assessments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "pathway_assessments"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can insert responses for their children" ON "public"."module_responses" FOR INSERT WITH CHECK (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Parents can insert their own modules" ON "public"."parent_modules" FOR INSERT TO "authenticated" WITH CHECK (("parent_id" = "auth"."uid"()));



CREATE POLICY "Parents can insert their own weekly checkins" ON "public"."weekly_checkins" FOR INSERT WITH CHECK (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Parents can read mood check-ins for their children" ON "public"."child_mood_checkins" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_mood_checkins"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can read own children's responses" ON "public"."module_responses" FOR SELECT USING (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Parents can read pathway assessments for their children" ON "public"."pathway_assessments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "pathway_assessments"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can update pathway assessments for their children" ON "public"."pathway_assessments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "pathway_assessments"."child_id") AND ("c"."parent_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "pathway_assessments"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can update responses for their children" ON "public"."module_responses" FOR UPDATE USING (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Parents can update their children's focus plans" ON "public"."child_focus_plan" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_focus_plan"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can update their own weekly checkins" ON "public"."weekly_checkins" FOR UPDATE USING (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Parents can view children modules" ON "public"."child_modules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."id" = "child_modules"."child_id") AND ("children"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can view children responses" ON "public"."module_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."id" = "module_responses"."child_id") AND ("children"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can view their children's focus plans" ON "public"."child_focus_plan" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_focus_plan"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Parents can view their own modules" ON "public"."parent_modules" FOR SELECT USING (("parent_id" = "auth"."uid"()));



CREATE POLICY "Parents can view their own weekly checkins" ON "public"."weekly_checkins" FOR SELECT USING (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Public read assessment_questions" ON "public"."assessment_questions" FOR SELECT USING (true);



CREATE POLICY "Public read checkin_challenges" ON "public"."checkin_challenges" FOR SELECT USING (true);



CREATE POLICY "Public read checkin_goals" ON "public"."checkin_goals" FOR SELECT USING (true);



CREATE POLICY "Public read checkin_triggers" ON "public"."checkin_triggers" FOR SELECT USING (true);



CREATE POLICY "Public read focus_plan_categories" ON "public"."focus_plan_categories" FOR SELECT USING (true);



CREATE POLICY "Public read focus_plan_frequencies" ON "public"."focus_plan_frequencies" FOR SELECT USING (true);



CREATE POLICY "Public read focus_plan_goals" ON "public"."focus_plan_goals" FOR SELECT USING (true);



CREATE POLICY "Public read focus_plan_intensities" ON "public"."focus_plan_intensities" FOR SELECT USING (true);



CREATE POLICY "Service role can insert credits" ON "public"."subscription_credit_ledger" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can insert profiles" ON "public"."parent_profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage child modules" ON "public"."child_modules" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can manage module responses" ON "public"."module_responses" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can manage modules" ON "public"."modules" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can manage parent modules" ON "public"."parent_modules" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can read age_ranges" ON "public"."age_ranges" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role can read core_theories" ON "public"."core_theories" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role can select credits" ON "public"."subscription_credit_ledger" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role manage assessment_questions" ON "public"."assessment_questions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manage checkin_challenges" ON "public"."checkin_challenges" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manage checkin_goals" ON "public"."checkin_goals" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manage checkin_triggers" ON "public"."checkin_triggers" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manage focus_plan_categories" ON "public"."focus_plan_categories" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manage focus_plan_frequencies" ON "public"."focus_plan_frequencies" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manage focus_plan_goals" ON "public"."focus_plan_goals" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manage focus_plan_intensities" ON "public"."focus_plan_intensities" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create custom rewards" ON "public"."rewards" FOR INSERT WITH CHECK ((("parent_user_id" = "auth"."uid"()) AND ("is_baseline" = false)));



CREATE POLICY "Users can create purchases for own children" ON "public"."reward_purchases" FOR INSERT WITH CHECK (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own rewards" ON "public"."rewards" FOR DELETE USING ((("parent_user_id" = "auth"."uid"()) AND ("is_baseline" = false)));



CREATE POLICY "Users can delete responses for their children" ON "public"."module_responses" FOR DELETE USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their children's assessments" ON "public"."pathway_assessments" FOR DELETE USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their own children" ON "public"."children" FOR DELETE USING (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Users can insert assessments for their children" ON "public"."pathway_assessments" FOR INSERT WITH CHECK (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own children quest completions" ON "public"."daily_quest_completions" FOR INSERT WITH CHECK (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own children roadblock completions" ON "public"."child_roadblock_completions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_roadblock_completions"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own module unlocks" ON "public"."module_unlocks" FOR INSERT WITH CHECK (("auth"."uid"() = "parent_id"));



CREATE POLICY "Users can insert responses for their children" ON "public"."module_responses" FOR INSERT WITH CHECK (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert self credit adjustments" ON "public"."subscription_credit_ledger" FOR INSERT WITH CHECK ((("auth"."uid"() = "parent_id") AND ("entry_type" = ANY (ARRAY['grant'::"text", 'adjustment'::"text", 'refund'::"text"])) AND ("credits_delta" > 0)));



CREATE POLICY "Users can insert spend entries" ON "public"."subscription_credit_ledger" FOR INSERT WITH CHECK ((("auth"."uid"() = "parent_id") AND ("entry_type" = 'spend'::"text") AND ("credits_delta" < 0)));



CREATE POLICY "Users can insert their children's modules" ON "public"."child_modules" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."id" = "child_modules"."child_id") AND ("children"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own children" ON "public"."children" FOR INSERT WITH CHECK (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Users can insert their own login streaks" ON "public"."login_streaks" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "login_streaks"."child_id") AND ("c"."parent_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update own children purchases" ON "public"."reward_purchases" FOR UPDATE USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own rewards" ON "public"."rewards" FOR UPDATE USING ((("parent_user_id" = "auth"."uid"()) AND ("is_baseline" = false))) WITH CHECK ((("parent_user_id" = "auth"."uid"()) AND ("is_baseline" = false)));



CREATE POLICY "Users can update own subscription (testing)" ON "public"."parent_subscriptions" FOR UPDATE USING (("auth"."uid"() = "parent_id")) WITH CHECK (("auth"."uid"() = "parent_id"));



CREATE POLICY "Users can update responses for their children" ON "public"."module_responses" FOR UPDATE USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their children's assessments" ON "public"."pathway_assessments" FOR UPDATE USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their children's modules" ON "public"."child_modules" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."id" = "child_modules"."child_id") AND ("children"."parent_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."id" = "child_modules"."child_id") AND ("children"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own children" ON "public"."children" FOR UPDATE USING (("auth"."uid"() = "parent_user_id")) WITH CHECK (("auth"."uid"() = "parent_user_id"));



CREATE POLICY "Users can update their own login streaks" ON "public"."login_streaks" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "login_streaks"."child_id") AND ("c"."parent_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own profile" ON "public"."parent_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can upsert own subscription (testing)" ON "public"."parent_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "parent_id"));



CREATE POLICY "Users can view active tiers" ON "public"."subscription_tiers" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Users can view baseline and own custom rewards" ON "public"."rewards" FOR SELECT USING ((("is_baseline" = true) OR ("parent_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."parent_profiles"
  WHERE (("parent_profiles"."id" = "auth"."uid"()) AND ("parent_profiles"."is_admin" = true))))));



CREATE POLICY "Users can view baseline and own rewards" ON "public"."rewards" FOR SELECT USING ((("is_baseline" = true) OR ("parent_user_id" = "auth"."uid"())));



CREATE POLICY "Users can view own children purchases" ON "public"."reward_purchases" FOR SELECT USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own children quest completions" ON "public"."daily_quest_completions" FOR SELECT USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own children roadblock completions" ON "public"."child_roadblock_completions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_roadblock_completions"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own credit ledger" ON "public"."subscription_credit_ledger" FOR SELECT USING (("auth"."uid"() = "parent_id"));



CREATE POLICY "Users can view own module unlocks" ON "public"."module_unlocks" FOR SELECT USING (("auth"."uid"() = "parent_id"));



CREATE POLICY "Users can view own subscription" ON "public"."parent_subscriptions" FOR SELECT USING (("auth"."uid"() = "parent_id"));



CREATE POLICY "Users can view their children's assessments" ON "public"."pathway_assessments" FOR SELECT USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their children's modules" ON "public"."child_modules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."id" = "child_modules"."child_id") AND ("children"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their children's responses" ON "public"."module_responses" FOR SELECT USING (("child_id" IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."parent_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own children" ON "public"."children" FOR SELECT USING (true);



CREATE POLICY "Users can view their own login streaks" ON "public"."login_streaks" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "login_streaks"."child_id") AND ("c"."parent_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own profile" ON "public"."parent_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."age_ranges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "age_ranges_delete_admin_only" ON "public"."age_ranges" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "age_ranges_insert_admin_only" ON "public"."age_ranges" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "age_ranges_select_all_authenticated" ON "public"."age_ranges" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "age_ranges_update_admin_only" ON "public"."age_ranges" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."ai_generation_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_generation_jobs_delete_admin_only" ON "public"."ai_generation_jobs" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "ai_generation_jobs_insert_admin_only" ON "public"."ai_generation_jobs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "ai_generation_jobs_select_all_authenticated" ON "public"."ai_generation_jobs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ai_generation_jobs_update_admin_only" ON "public"."ai_generation_jobs" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."ai_module_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_module_config_delete_admin_only" ON "public"."ai_module_config" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "ai_module_config_insert_admin_only" ON "public"."ai_module_config" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "ai_module_config_select_all_authenticated" ON "public"."ai_module_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ai_module_config_update_admin_only" ON "public"."ai_module_config" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."assessment_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessment_questions_delete_admin_only" ON "public"."assessment_questions" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "assessment_questions_insert_admin_only" ON "public"."assessment_questions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "assessment_questions_select_all_authenticated" ON "public"."assessment_questions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "assessment_questions_update_admin_only" ON "public"."assessment_questions" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."audit_criteria" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_criteria_delete_admin_only" ON "public"."audit_criteria" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "audit_criteria_insert_admin_only" ON "public"."audit_criteria" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "audit_criteria_select_all_authenticated" ON "public"."audit_criteria" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "audit_criteria_update_admin_only" ON "public"."audit_criteria" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."audit_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_rules_delete_admin_only" ON "public"."audit_rules" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "audit_rules_insert_admin_only" ON "public"."audit_rules" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "audit_rules_select_all_authenticated" ON "public"."audit_rules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "audit_rules_update_admin_only" ON "public"."audit_rules" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."audit_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_sections_delete_admin_only" ON "public"."audit_sections" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "audit_sections_insert_admin_only" ON "public"."audit_sections" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "audit_sections_select_all_authenticated" ON "public"."audit_sections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "audit_sections_update_admin_only" ON "public"."audit_sections" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "badges_delete_admin_only" ON "public"."badges" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "badges_insert_admin_only" ON "public"."badges" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "badges_select_all_authenticated" ON "public"."badges" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "badges_update_admin_only" ON "public"."badges" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."brain_town_vocabulary" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brain_town_vocabulary_delete_admin_only" ON "public"."brain_town_vocabulary" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "brain_town_vocabulary_insert_admin_only" ON "public"."brain_town_vocabulary" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "brain_town_vocabulary_select_all_authenticated" ON "public"."brain_town_vocabulary" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "brain_town_vocabulary_update_admin_only" ON "public"."brain_town_vocabulary" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."category_colors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "category_colors_delete_admin_only" ON "public"."category_colors" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "category_colors_insert_admin_only" ON "public"."category_colors" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "category_colors_select_all_authenticated" ON "public"."category_colors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "category_colors_update_admin_only" ON "public"."category_colors" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."characters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "characters_delete_admin_only" ON "public"."characters" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "characters_insert_admin_only" ON "public"."characters" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "characters_select_all_authenticated" ON "public"."characters" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "characters_update_admin_only" ON "public"."characters" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."checkin_challenges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkin_challenges_delete_admin_only" ON "public"."checkin_challenges" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "checkin_challenges_insert_admin_only" ON "public"."checkin_challenges" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "checkin_challenges_select_all_authenticated" ON "public"."checkin_challenges" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "checkin_challenges_update_admin_only" ON "public"."checkin_challenges" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."checkin_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkin_goals_delete_admin_only" ON "public"."checkin_goals" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "checkin_goals_insert_admin_only" ON "public"."checkin_goals" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "checkin_goals_select_all_authenticated" ON "public"."checkin_goals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "checkin_goals_update_admin_only" ON "public"."checkin_goals" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."checkin_triggers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkin_triggers_delete_admin_only" ON "public"."checkin_triggers" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "checkin_triggers_insert_admin_only" ON "public"."checkin_triggers" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "checkin_triggers_select_all_authenticated" ON "public"."checkin_triggers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "checkin_triggers_update_admin_only" ON "public"."checkin_triggers" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."child_badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_badges_delete_own_child_or_admin" ON "public"."child_badges" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_badges_insert_own_child_or_admin" ON "public"."child_badges" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_badges_select_own_child_or_admin" ON "public"."child_badges" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_badges_update_own_child_or_admin" ON "public"."child_badges" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."child_cycle_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_cycle_progress_delete_own_child_or_admin" ON "public"."child_cycle_progress" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_cycle_progress_insert_own_child_or_admin" ON "public"."child_cycle_progress" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_cycle_progress_select_own_child_or_admin" ON "public"."child_cycle_progress" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_cycle_progress_update_own_child_or_admin" ON "public"."child_cycle_progress" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."child_focus_plan" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_focus_plan_delete_own_child_or_admin" ON "public"."child_focus_plan" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_focus_plan_insert_own_child_or_admin" ON "public"."child_focus_plan" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_focus_plan_select_own_child_or_admin" ON "public"."child_focus_plan" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_focus_plan_update_own_child_or_admin" ON "public"."child_focus_plan" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."child_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_modules_delete_own_child_or_admin" ON "public"."child_modules" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_modules_insert_own_child_or_admin" ON "public"."child_modules" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_modules_select_own_child_or_admin" ON "public"."child_modules" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_modules_update_own_child_or_admin" ON "public"."child_modules" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."child_mood_checkins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."child_roadblock_completions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_roadblock_completions_delete_own_child_or_admin" ON "public"."child_roadblock_completions" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_roadblock_completions_insert_own_child_or_admin" ON "public"."child_roadblock_completions" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_roadblock_completions_select_own_child_or_admin" ON "public"."child_roadblock_completions" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_roadblock_completions_update_own_child_or_admin" ON "public"."child_roadblock_completions" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."child_roadblocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_roadblocks_delete_own_child_or_admin" ON "public"."child_roadblocks" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_roadblocks_insert_own_child_or_admin" ON "public"."child_roadblocks" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_roadblocks_select_own_child_or_admin" ON "public"."child_roadblocks" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_roadblocks_update_own_child_or_admin" ON "public"."child_roadblocks" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."child_super_skill_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_super_skill_progress_delete_own_child_or_admin" ON "public"."child_super_skill_progress" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_super_skill_progress_insert_own_child_or_admin" ON "public"."child_super_skill_progress" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_super_skill_progress_select_own_child_or_admin" ON "public"."child_super_skill_progress" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "child_super_skill_progress_update_own_child_or_admin" ON "public"."child_super_skill_progress" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."children" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "children_delete_own_or_admin" ON "public"."children" FOR DELETE TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "children_insert_own_or_admin" ON "public"."children" FOR INSERT TO "authenticated" WITH CHECK ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "children_select_own_or_admin" ON "public"."children" FOR SELECT TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "children_update_own_or_admin" ON "public"."children" FOR UPDATE TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"())) WITH CHECK ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



ALTER TABLE "public"."core_theories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "core_theories_delete_admin_only" ON "public"."core_theories" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "core_theories_insert_admin_only" ON "public"."core_theories" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "core_theories_select_all_authenticated" ON "public"."core_theories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "core_theories_update_admin_only" ON "public"."core_theories" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cycles_delete_admin_only" ON "public"."cycles" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "cycles_insert_admin_only" ON "public"."cycles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "cycles_select_all_authenticated" ON "public"."cycles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "cycles_update_admin_only" ON "public"."cycles" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."daily_quest_completions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_quest_completions_delete_own_child_or_admin" ON "public"."daily_quest_completions" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "daily_quest_completions_insert_own_child_or_admin" ON "public"."daily_quest_completions" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "daily_quest_completions_select_own_child_or_admin" ON "public"."daily_quest_completions" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "daily_quest_completions_update_own_child_or_admin" ON "public"."daily_quest_completions" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "delete_child_modules_for_own_children" ON "public"."child_modules" AS RESTRICTIVE FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_modules"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "delete_own_children" ON "public"."children" AS RESTRICTIVE FOR DELETE USING (("parent_user_id" = "auth"."uid"()));



ALTER TABLE "public"."diagnosis_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "diagnosis_profiles_delete_admin_only" ON "public"."diagnosis_profiles" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "diagnosis_profiles_insert_admin_only" ON "public"."diagnosis_profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "diagnosis_profiles_select_all_authenticated" ON "public"."diagnosis_profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "diagnosis_profiles_update_admin_only" ON "public"."diagnosis_profiles" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."dss_sedi_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dss_sedi_categories_delete_admin_only" ON "public"."dss_sedi_categories" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "dss_sedi_categories_insert_admin_only" ON "public"."dss_sedi_categories" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "dss_sedi_categories_select_all_authenticated" ON "public"."dss_sedi_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dss_sedi_categories_update_admin_only" ON "public"."dss_sedi_categories" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."emotions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "emotions_delete_admin_only" ON "public"."emotions" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "emotions_insert_admin_only" ON "public"."emotions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "emotions_select_all_authenticated" ON "public"."emotions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "emotions_update_admin_only" ON "public"."emotions" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."fasd_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fasd_domains_delete_admin_only" ON "public"."fasd_domains" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "fasd_domains_insert_admin_only" ON "public"."fasd_domains" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "fasd_domains_select_all_authenticated" ON "public"."fasd_domains" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fasd_domains_update_admin_only" ON "public"."fasd_domains" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."focus_plan_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "focus_plan_categories_delete_admin_only" ON "public"."focus_plan_categories" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "focus_plan_categories_insert_admin_only" ON "public"."focus_plan_categories" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "focus_plan_categories_select_all_authenticated" ON "public"."focus_plan_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "focus_plan_categories_update_admin_only" ON "public"."focus_plan_categories" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."focus_plan_frequencies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "focus_plan_frequencies_delete_admin_only" ON "public"."focus_plan_frequencies" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "focus_plan_frequencies_insert_admin_only" ON "public"."focus_plan_frequencies" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "focus_plan_frequencies_select_all_authenticated" ON "public"."focus_plan_frequencies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "focus_plan_frequencies_update_admin_only" ON "public"."focus_plan_frequencies" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."focus_plan_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "focus_plan_goals_delete_admin_only" ON "public"."focus_plan_goals" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "focus_plan_goals_insert_admin_only" ON "public"."focus_plan_goals" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "focus_plan_goals_select_all_authenticated" ON "public"."focus_plan_goals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "focus_plan_goals_update_admin_only" ON "public"."focus_plan_goals" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."focus_plan_intensities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "focus_plan_intensities_delete_admin_only" ON "public"."focus_plan_intensities" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "focus_plan_intensities_insert_admin_only" ON "public"."focus_plan_intensities" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "focus_plan_intensities_select_all_authenticated" ON "public"."focus_plan_intensities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "focus_plan_intensities_update_admin_only" ON "public"."focus_plan_intensities" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."forbidden_terms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "forbidden_terms_delete_admin_only" ON "public"."forbidden_terms" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "forbidden_terms_insert_admin_only" ON "public"."forbidden_terms" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "forbidden_terms_select_all_authenticated" ON "public"."forbidden_terms" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "forbidden_terms_update_admin_only" ON "public"."forbidden_terms" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "insert_child_modules_for_own_children" ON "public"."child_modules" AS RESTRICTIVE FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_modules"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "insert_own_children" ON "public"."children" AS RESTRICTIVE FOR INSERT WITH CHECK (("parent_user_id" = "auth"."uid"()));



ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "levels_delete_admin_only" ON "public"."levels" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "levels_insert_admin_only" ON "public"."levels" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "levels_select_all_authenticated" ON "public"."levels" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "levels_update_admin_only" ON "public"."levels" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."login_streaks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "login_streaks_delete_own_or_admin" ON "public"."login_streaks" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "login_streaks_insert_own_or_admin" ON "public"."login_streaks" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "login_streaks_select_own_or_admin" ON "public"."login_streaks" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "login_streaks_update_own_or_admin" ON "public"."login_streaks" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."module_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_responses_delete_own_or_admin" ON "public"."module_responses" FOR DELETE TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "module_responses_insert_own_or_admin" ON "public"."module_responses" FOR INSERT TO "authenticated" WITH CHECK ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "module_responses_select_own_or_admin" ON "public"."module_responses" FOR SELECT TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "module_responses_update_own_or_admin" ON "public"."module_responses" FOR UPDATE TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."module_secondary_theories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_secondary_theories_delete_admin_only" ON "public"."module_secondary_theories" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "module_secondary_theories_insert_admin_only" ON "public"."module_secondary_theories" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "module_secondary_theories_select_all_authenticated" ON "public"."module_secondary_theories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "module_secondary_theories_update_admin_only" ON "public"."module_secondary_theories" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."module_unlocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_unlocks_delete_own_or_admin" ON "public"."module_unlocks" FOR DELETE TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "module_unlocks_insert_own_or_admin" ON "public"."module_unlocks" FOR INSERT TO "authenticated" WITH CHECK ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "module_unlocks_select_own_or_admin" ON "public"."module_unlocks" FOR SELECT TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "module_unlocks_update_own_or_admin" ON "public"."module_unlocks" FOR UPDATE TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"())) WITH CHECK ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules_delete_admin_only" ON "public"."modules" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "modules_insert_admin_only" ON "public"."modules" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "modules_select_all_authenticated" ON "public"."modules" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."modules_to_generate" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules_to_generate_delete_own_or_admin" ON "public"."modules_to_generate" FOR DELETE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "modules_to_generate_insert_own_or_admin" ON "public"."modules_to_generate" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "modules_to_generate_select_own_or_admin" ON "public"."modules_to_generate" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "modules_to_generate_update_own_or_admin" ON "public"."modules_to_generate" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_sys_admin"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "modules_update_admin_only" ON "public"."modules" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."ndis_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ndis_domains_delete_admin_only" ON "public"."ndis_domains" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "ndis_domains_insert_admin_only" ON "public"."ndis_domains" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "ndis_domains_select_all_authenticated" ON "public"."ndis_domains" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ndis_domains_update_admin_only" ON "public"."ndis_domains" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."needs_based_pathways" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "needs_based_pathways_delete_admin_only" ON "public"."needs_based_pathways" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "needs_based_pathways_insert_admin_only" ON "public"."needs_based_pathways" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "needs_based_pathways_select_all_authenticated" ON "public"."needs_based_pathways" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "needs_based_pathways_update_admin_only" ON "public"."needs_based_pathways" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."parent_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parent_modules_delete_own_or_admin" ON "public"."parent_modules" FOR DELETE TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_modules_insert_own_or_admin" ON "public"."parent_modules" FOR INSERT TO "authenticated" WITH CHECK ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_modules_select_own_or_admin" ON "public"."parent_modules" FOR SELECT TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_modules_update_own_or_admin" ON "public"."parent_modules" FOR UPDATE TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"())) WITH CHECK ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



ALTER TABLE "public"."parent_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parent_profiles_delete_own_or_admin" ON "public"."parent_profiles" FOR DELETE TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_profiles_insert_own_or_admin" ON "public"."parent_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_profiles_select_own_or_admin" ON "public"."parent_profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_profiles_update_own_or_admin" ON "public"."parent_profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_sys_admin"())) WITH CHECK ((("id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



ALTER TABLE "public"."parent_scripts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parent_scripts_delete_admin_only" ON "public"."parent_scripts" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "parent_scripts_insert_admin_only" ON "public"."parent_scripts" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "parent_scripts_select_all_authenticated" ON "public"."parent_scripts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "parent_scripts_update_admin_only" ON "public"."parent_scripts" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."parent_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parent_subscriptions_delete_own_or_admin" ON "public"."parent_subscriptions" FOR DELETE TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_subscriptions_insert_own_or_admin" ON "public"."parent_subscriptions" FOR INSERT TO "authenticated" WITH CHECK ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_subscriptions_select_own_or_admin" ON "public"."parent_subscriptions" FOR SELECT TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "parent_subscriptions_update_own_or_admin" ON "public"."parent_subscriptions" FOR UPDATE TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"())) WITH CHECK ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



ALTER TABLE "public"."pathway_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pathway_assessments_delete_own_child_or_admin" ON "public"."pathway_assessments" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "pathway_assessments_insert_own_child_or_admin" ON "public"."pathway_assessments" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "pathway_assessments_select_own_child_or_admin" ON "public"."pathway_assessments" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "pathway_assessments_update_own_child_or_admin" ON "public"."pathway_assessments" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."pathways" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pathways_delete_admin_only" ON "public"."pathways" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "pathways_insert_admin_only" ON "public"."pathways" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "pathways_select_all_authenticated" ON "public"."pathways" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "pathways_update_admin_only" ON "public"."pathways" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."reward_purchases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reward_purchases_delete_own_child_or_admin" ON "public"."reward_purchases" FOR DELETE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "reward_purchases_insert_own_child_or_admin" ON "public"."reward_purchases" FOR INSERT TO "authenticated" WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "reward_purchases_select_own_child_or_admin" ON "public"."reward_purchases" FOR SELECT TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "reward_purchases_update_own_child_or_admin" ON "public"."reward_purchases" FOR UPDATE TO "authenticated" USING (("public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK (("public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rewards_delete_own_or_admin" ON "public"."rewards" FOR DELETE TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "rewards_insert_own_or_admin" ON "public"."rewards" FOR INSERT TO "authenticated" WITH CHECK ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "rewards_select_baseline_or_own_or_admin" ON "public"."rewards" FOR SELECT TO "authenticated" USING ((("is_baseline" = true) OR ("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "rewards_update_own_or_admin" ON "public"."rewards" FOR UPDATE TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"())) WITH CHECK ((("parent_user_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



ALTER TABLE "public"."roadblock_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roadblock_config_delete_admin_only" ON "public"."roadblock_config" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "roadblock_config_insert_admin_only" ON "public"."roadblock_config" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "roadblock_config_select_all_authenticated" ON "public"."roadblock_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "roadblock_config_update_admin_only" ON "public"."roadblock_config" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."roadblocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roadblocks_delete_admin_only" ON "public"."roadblocks" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "roadblocks_insert_admin_only" ON "public"."roadblocks" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "roadblocks_select_all_authenticated" ON "public"."roadblocks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "roadblocks_update_admin_only" ON "public"."roadblocks" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "select_child_modules_for_own_children" ON "public"."child_modules" AS RESTRICTIVE FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_modules"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."sequencing_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sequencing_rules_delete_admin_only" ON "public"."sequencing_rules" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "sequencing_rules_insert_admin_only" ON "public"."sequencing_rules" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "sequencing_rules_select_all_authenticated" ON "public"."sequencing_rules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "sequencing_rules_update_admin_only" ON "public"."sequencing_rules" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."series" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "series_delete_admin_only" ON "public"."series" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "series_insert_admin_only" ON "public"."series" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "series_select_all_authenticated" ON "public"."series" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "series_update_admin_only" ON "public"."series" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_delete_admin_only" ON "public"."settings" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "settings_insert_admin_only" ON "public"."settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "settings_select" ON "public"."settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "settings_select_all_authenticated" ON "public"."settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "settings_select_authenticated" ON "public"."settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "settings_update" ON "public"."settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "settings_update_admin_only" ON "public"."settings" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "settings_update_authenticated" ON "public"."settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skills_delete_admin_only" ON "public"."skills" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "skills_insert_admin_only" ON "public"."skills" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "skills_select_all_authenticated" ON "public"."skills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "skills_update_admin_only" ON "public"."skills" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."sub_skills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sub_skills_delete_admin_only" ON "public"."sub_skills" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "sub_skills_insert_admin_only" ON "public"."sub_skills" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "sub_skills_select_all_authenticated" ON "public"."sub_skills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "sub_skills_update_admin_only" ON "public"."sub_skills" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."subscription_credit_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_credit_ledger_delete_own_or_admin" ON "public"."subscription_credit_ledger" FOR DELETE TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "subscription_credit_ledger_insert_own_or_admin" ON "public"."subscription_credit_ledger" FOR INSERT TO "authenticated" WITH CHECK ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "subscription_credit_ledger_select_own_or_admin" ON "public"."subscription_credit_ledger" FOR SELECT TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



CREATE POLICY "subscription_credit_ledger_update_own_or_admin" ON "public"."subscription_credit_ledger" FOR UPDATE TO "authenticated" USING ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"())) WITH CHECK ((("parent_id" = "auth"."uid"()) OR "public"."is_sys_admin"()));



ALTER TABLE "public"."subscription_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_tiers_delete_admin_only" ON "public"."subscription_tiers" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "subscription_tiers_insert_admin_only" ON "public"."subscription_tiers" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "subscription_tiers_select_all_authenticated" ON "public"."subscription_tiers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "subscription_tiers_update_admin_only" ON "public"."subscription_tiers" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."super_skills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "super_skills_delete_admin_only" ON "public"."super_skills" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "super_skills_insert_admin_only" ON "public"."super_skills" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "super_skills_select_all_authenticated" ON "public"."super_skills" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "super_skills_update_admin_only" ON "public"."super_skills" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."theory_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "theory_connections_delete_admin_only" ON "public"."theory_connections" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "theory_connections_insert_admin_only" ON "public"."theory_connections" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "theory_connections_select_all_authenticated" ON "public"."theory_connections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "theory_connections_update_admin_only" ON "public"."theory_connections" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



ALTER TABLE "public"."tools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tools_delete_admin_only" ON "public"."tools" FOR DELETE TO "authenticated" USING ("public"."is_sys_admin"());



CREATE POLICY "tools_insert_admin_only" ON "public"."tools" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "tools_select_all_authenticated" ON "public"."tools" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "tools_update_admin_only" ON "public"."tools" FOR UPDATE TO "authenticated" USING ("public"."is_sys_admin"()) WITH CHECK ("public"."is_sys_admin"());



CREATE POLICY "update_child_modules_for_own_children" ON "public"."child_modules" AS RESTRICTIVE FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_modules"."child_id") AND ("c"."parent_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."children" "c"
  WHERE (("c"."id" = "child_modules"."child_id") AND ("c"."parent_user_id" = "auth"."uid"())))));



CREATE POLICY "update_own_children" ON "public"."children" AS RESTRICTIVE FOR UPDATE USING (("parent_user_id" = "auth"."uid"())) WITH CHECK (("parent_user_id" = "auth"."uid"()));



ALTER TABLE "public"."weekly_checkins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "weekly_checkins_delete_own_or_admin" ON "public"."weekly_checkins" FOR DELETE TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "weekly_checkins_insert_own_or_admin" ON "public"."weekly_checkins" FOR INSERT TO "authenticated" WITH CHECK ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "weekly_checkins_select_own_or_admin" ON "public"."weekly_checkins" FOR SELECT TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));



CREATE POLICY "weekly_checkins_update_own_or_admin" ON "public"."weekly_checkins" FOR UPDATE TO "authenticated" USING ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"())) WITH CHECK ((("parent_user_id" = "auth"."uid"()) OR "public"."owns_child"("child_id") OR "public"."is_sys_admin"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sub_skills" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sub_skills" TO "authenticated";
GRANT SELECT ON TABLE "public"."sub_skills" TO "service_role";












GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."age_ranges" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."age_ranges" TO "authenticated";
GRANT SELECT ON TABLE "public"."age_ranges" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ai_generation_jobs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ai_generation_jobs" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ai_generation_jobs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ai_module_config" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ai_module_config" TO "authenticated";
GRANT SELECT ON TABLE "public"."ai_module_config" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."assessment_questions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."assessment_questions" TO "authenticated";
GRANT SELECT ON TABLE "public"."assessment_questions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_criteria" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_criteria" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_rules" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_rules" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_sections" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_sections" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."badges" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."badges" TO "authenticated";
GRANT SELECT ON TABLE "public"."badges" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."brain_town_vocabulary" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."brain_town_vocabulary" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."category_colors" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."category_colors" TO "authenticated";
GRANT SELECT ON TABLE "public"."category_colors" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."characters" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."characters" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."checkin_challenges" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."checkin_challenges" TO "authenticated";
GRANT SELECT ON TABLE "public"."checkin_challenges" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."checkin_goals" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."checkin_goals" TO "authenticated";
GRANT SELECT ON TABLE "public"."checkin_goals" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."checkin_triggers" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."checkin_triggers" TO "authenticated";
GRANT SELECT ON TABLE "public"."checkin_triggers" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_badges" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_badges" TO "authenticated";
GRANT SELECT ON TABLE "public"."child_badges" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_cycle_progress" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_cycle_progress" TO "authenticated";
GRANT SELECT ON TABLE "public"."child_cycle_progress" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_focus_plan" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_focus_plan" TO "authenticated";
GRANT SELECT ON TABLE "public"."child_focus_plan" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_modules" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_modules" TO "authenticated";
GRANT SELECT ON TABLE "public"."child_modules" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."children" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."children" TO "authenticated";
GRANT SELECT ON TABLE "public"."children" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modules" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modules" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."modules" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_modules_with_names" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_modules_with_names" TO "authenticated";
GRANT SELECT ON TABLE "public"."child_modules_with_names" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_mood_checkins" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_mood_checkins" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_roadblock_completions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_roadblock_completions" TO "authenticated";
GRANT SELECT ON TABLE "public"."child_roadblock_completions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_roadblocks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_roadblocks" TO "authenticated";
GRANT SELECT ON TABLE "public"."child_roadblocks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_super_skill_progress" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_super_skill_progress" TO "authenticated";
GRANT SELECT ON TABLE "public"."child_super_skill_progress" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."core_theories" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."core_theories" TO "authenticated";
GRANT SELECT ON TABLE "public"."core_theories" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."cycles" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."cycles" TO "authenticated";
GRANT SELECT ON TABLE "public"."cycles" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."daily_quest_completions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."daily_quest_completions" TO "authenticated";
GRANT SELECT ON TABLE "public"."daily_quest_completions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."daily_quest_status" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."daily_quest_status" TO "authenticated";
GRANT SELECT ON TABLE "public"."daily_quest_status" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."diagnosis_profiles" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."diagnosis_profiles" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."dss_sedi_categories" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."dss_sedi_categories" TO "authenticated";
GRANT SELECT ON TABLE "public"."dss_sedi_categories" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."emotions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."emotions" TO "authenticated";
GRANT SELECT ON TABLE "public"."emotions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."fasd_domains" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."fasd_domains" TO "authenticated";
GRANT SELECT ON TABLE "public"."fasd_domains" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."focus_plan_categories" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."focus_plan_categories" TO "authenticated";
GRANT SELECT ON TABLE "public"."focus_plan_categories" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."focus_plan_frequencies" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."focus_plan_frequencies" TO "authenticated";
GRANT SELECT ON TABLE "public"."focus_plan_frequencies" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."focus_plan_goals" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."focus_plan_goals" TO "authenticated";
GRANT SELECT ON TABLE "public"."focus_plan_goals" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."focus_plan_intensities" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."focus_plan_intensities" TO "authenticated";
GRANT SELECT ON TABLE "public"."focus_plan_intensities" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."forbidden_terms" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."forbidden_terms" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."levels" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."levels" TO "authenticated";
GRANT SELECT ON TABLE "public"."levels" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."levels_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."levels_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."levels_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."login_streaks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."login_streaks" TO "authenticated";
GRANT SELECT ON TABLE "public"."login_streaks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_responses" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_responses" TO "authenticated";
GRANT SELECT ON TABLE "public"."module_responses" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_response_analytics" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_response_analytics" TO "authenticated";
GRANT SELECT ON TABLE "public"."module_response_analytics" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_secondary_theories" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_secondary_theories" TO "authenticated";
GRANT SELECT ON TABLE "public"."module_secondary_theories" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_theory_view" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_theory_view" TO "authenticated";
GRANT SELECT ON TABLE "public"."module_theory_view" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_unlocks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."module_unlocks" TO "authenticated";
GRANT SELECT ON TABLE "public"."module_unlocks" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."module_unlocks_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."module_unlocks_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."module_unlocks_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modules_to_generate" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."modules_to_generate" TO "authenticated";
GRANT SELECT ON TABLE "public"."modules_to_generate" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ndis_domains" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ndis_domains" TO "authenticated";
GRANT SELECT ON TABLE "public"."ndis_domains" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."needs_based_pathways" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."needs_based_pathways" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_modules" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_modules" TO "authenticated";
GRANT SELECT ON TABLE "public"."parent_modules" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_profiles" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_profiles" TO "authenticated";
GRANT SELECT ON TABLE "public"."parent_profiles" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_scripts" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_scripts" TO "authenticated";
GRANT SELECT ON TABLE "public"."parent_scripts" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_subscriptions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."parent_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."parent_subscriptions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pathway_assessments" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pathway_assessments" TO "authenticated";
GRANT SELECT ON TABLE "public"."pathway_assessments" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pathway_progress_summary" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pathway_progress_summary" TO "authenticated";
GRANT SELECT ON TABLE "public"."pathway_progress_summary" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pathways" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pathways" TO "authenticated";
GRANT SELECT ON TABLE "public"."pathways" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reward_purchases" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reward_purchases" TO "authenticated";
GRANT SELECT ON TABLE "public"."reward_purchases" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rewards" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rewards" TO "authenticated";
GRANT SELECT ON TABLE "public"."rewards" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."roadblock_config" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."roadblock_config" TO "authenticated";
GRANT SELECT ON TABLE "public"."roadblock_config" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."roadblocks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."roadblocks" TO "authenticated";
GRANT SELECT ON TABLE "public"."roadblocks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sequencing_rules" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sequencing_rules" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."series" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."series" TO "authenticated";
GRANT SELECT ON TABLE "public"."series" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."series_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."series_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."series_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."settings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."settings" TO "authenticated";
GRANT SELECT ON TABLE "public"."settings" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."skills" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."skills" TO "authenticated";
GRANT SELECT ON TABLE "public"."skills" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subscription_credit_ledger" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subscription_credit_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_credit_ledger" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."subscription_credit_ledger_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."subscription_credit_ledger_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."subscription_credit_ledger_id_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subscription_tiers" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subscription_tiers" TO "authenticated";
GRANT SELECT ON TABLE "public"."subscription_tiers" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."super_skills" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."super_skills" TO "authenticated";
GRANT SELECT ON TABLE "public"."super_skills" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."theory_connections" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."theory_connections" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tools" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tools" TO "authenticated";
GRANT SELECT ON TABLE "public"."tools" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_child_dashboard" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_child_dashboard" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_child_dashboard" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_parent_credit_summary" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_parent_credit_summary" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_parent_credit_summary" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."weekly_checkins" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."weekly_checkins" TO "authenticated";
GRANT SELECT ON TABLE "public"."weekly_checkins" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";




























