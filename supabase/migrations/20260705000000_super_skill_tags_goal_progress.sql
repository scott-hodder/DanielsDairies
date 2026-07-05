-- Super Skill tags: developmental-area tagging model for practitioner goals.
-- Replaces the hard-coded goal category dropdown. Tags link goals to Super Skills,
-- so completed modules from a tagged Super Skill count toward goal progress.

-- ============================================================
-- 1. Tag tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.super_skill_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Which Super Skills teach toward each developmental area
CREATE TABLE IF NOT EXISTS public.super_skill_tag_map (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id uuid NOT NULL REFERENCES public.super_skill_tags(id) ON DELETE CASCADE,
  super_skill_id uuid NOT NULL REFERENCES public.super_skills(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tag_id, super_skill_id)
);

-- Which developmental areas a practitioner goal targets
CREATE TABLE IF NOT EXISTS public.practitioner_goal_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid NOT NULL REFERENCES public.practitioner_goals(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.super_skill_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(goal_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_super_skill_tag_map_tag ON public.super_skill_tag_map(tag_id);
CREATE INDEX IF NOT EXISTS idx_super_skill_tag_map_skill ON public.super_skill_tag_map(super_skill_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_goal_tags_goal ON public.practitioner_goal_tags(goal_id);

-- Goal progress fields: how many relevant modules count as "done" for this goal.
-- Only modules completed after the goal is created count, so progress is never
-- inflated by historical activity.
ALTER TABLE public.practitioner_goals
  ADD COLUMN IF NOT EXISTS target_modules integer CHECK (target_modules IS NULL OR (target_modules >= 1 AND target_modules <= 50));
ALTER TABLE public.practitioner_goals
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.super_skill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_skill_tag_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_goal_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags readable by authenticated"
  ON public.super_skill_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tags managed by admins"
  ON public.super_skill_tags FOR ALL
  TO authenticated
  USING (is_user_admin_check(auth.uid()))
  WITH CHECK (is_user_admin_check(auth.uid()));

CREATE POLICY "Tag map readable by authenticated"
  ON public.super_skill_tag_map FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tag map managed by admins"
  ON public.super_skill_tag_map FOR ALL
  TO authenticated
  USING (is_user_admin_check(auth.uid()))
  WITH CHECK (is_user_admin_check(auth.uid()));

CREATE POLICY "Goal tags managed by goal owner"
  ON public.practitioner_goal_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioner_goals g
      WHERE g.id = goal_id AND g.practitioner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practitioner_goals g
      WHERE g.id = goal_id AND g.practitioner_user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_skill_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_skill_tag_map TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_goal_tags TO authenticated;
GRANT SELECT ON public.super_skill_tags TO service_role;
GRANT SELECT ON public.super_skill_tag_map TO service_role;
GRANT SELECT ON public.practitioner_goal_tags TO service_role;

-- ============================================================
-- 3. Seed developmental-area tags
-- ============================================================

INSERT INTO public.super_skill_tags (name, slug, description, sort_order) VALUES
  ('Emotional Regulation', 'emotional-regulation', 'Recognising, naming and managing big feelings', 10),
  ('Anxiety & Worry', 'anxiety-and-worry', 'Calming anxious thoughts and coping with worry', 20),
  ('Helpful Thinking', 'helpful-thinking', 'Flexible thinking and steering unhelpful thought patterns', 30),
  ('Self-Awareness & Learning', 'self-awareness', 'Understanding how the brain works, focus and learning', 40),
  ('Positive Behaviour & Habits', 'positive-behaviour', 'Building good habits, routines and considered choices', 50),
  ('Resilience & Coping', 'resilience', 'Bouncing back from setbacks and handling tough moments', 60),
  ('Social Skills & Friendships', 'social-skills', 'Understanding others, communication and friendships', 70),
  ('Confidence & Future Planning', 'confidence-and-future', 'Goal-setting, self-belief and planning ahead', 80)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. Map Super Skills to tags (by slug so it works across environments)
--    Mappings follow each skill's stated purpose and theory base:
--      Emotion Navigator   - affective neuroscience, emotion regulation
--      Thought Driver      - cognitive flexibility, reappraisal
--      Brain Builder       - neuroplasticity, executive function
--      Behaviour Engineer  - habit formation, operant learning
--      Resilience Architect- stress response, learned optimism
--      Social Mapper       - social learning, attachment
--      Future Designer     - goal-setting theory, self-determination
-- ============================================================

INSERT INTO public.super_skill_tag_map (tag_id, super_skill_id)
SELECT t.id, s.id
FROM (VALUES
  ('emotional-regulation',  'emotion-navigator'),
  ('anxiety-and-worry',     'thought-driver'),
  ('anxiety-and-worry',     'emotion-navigator'),
  ('anxiety-and-worry',     'resilience-architect'),
  ('helpful-thinking',      'thought-driver'),
  ('self-awareness',        'brain-builder'),
  ('positive-behaviour',    'behaviour-engineer'),
  ('resilience',            'resilience-architect'),
  ('social-skills',         'social-mapper'),
  ('confidence-and-future', 'future-designer')
) AS m(tag_slug, skill_slug)
JOIN public.super_skill_tags t ON t.slug = m.tag_slug
JOIN public.super_skills s ON s.slug = m.skill_slug
ON CONFLICT (tag_id, super_skill_id) DO NOTHING;

-- Legacy Super Skill slugs used by earlier content (mapped where they exist)
INSERT INTO public.super_skill_tag_map (tag_id, super_skill_id)
SELECT t.id, s.id
FROM (VALUES
  ('emotional-regulation',  'emotion-navigator'),
  ('anxiety-and-worry',     'calm-controller'),
  ('emotional-regulation',  'calm-controller'),
  ('resilience',            'resilience-ranger'),
  ('social-skills',         'connection-captain'),
  ('self-awareness',        'body-boss')
) AS m(tag_slug, skill_slug)
JOIN public.super_skill_tags t ON t.slug = m.tag_slug
JOIN public.super_skills s ON s.slug = m.skill_slug
ON CONFLICT (tag_id, super_skill_id) DO NOTHING;

-- ============================================================
-- 5. Migrate existing goal categories onto tags.
--    The category column is kept (read-only history) but the app no longer
--    writes or displays it; tags are now the single source of truth.
-- ============================================================

INSERT INTO public.practitioner_goal_tags (goal_id, tag_id)
SELECT g.id, t.id
FROM public.practitioner_goals g
JOIN public.super_skill_tags t ON t.slug = CASE g.category
  WHEN 'emotional-regulation' THEN 'emotional-regulation'
  WHEN 'anxiety'              THEN 'anxiety-and-worry'
  WHEN 'social-skills'        THEN 'social-skills'
  WHEN 'resilience'           THEN 'resilience'
  WHEN 'self-awareness'       THEN 'self-awareness'
  WHEN 'behaviour'            THEN 'positive-behaviour'
  END
WHERE g.category IS NOT NULL
ON CONFLICT (goal_id, tag_id) DO NOTHING;

-- ============================================================
-- 6. Goal progress RPC.
--    A module counts toward a goal when:
--      - it belongs to a Super Skill linked to one of the goal's tags
--      - the child completed it on/after the goal was created
--    Each module is counted once per goal (DISTINCT), so overlapping tags
--    never double-count.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_practitioner_goal_progress(prac_user_id uuid)
RETURNS TABLE(
  goal_id uuid,
  child_id uuid,
  goal_text text,
  status text,
  target_modules integer,
  review_date date,
  measure text,
  created_at timestamptz,
  goal_completed_at timestamptz,
  tags jsonb,
  skills jsonb,
  progress_count bigint,
  contributing_modules jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF prac_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT is_user_practitioner_check(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized - practitioner access required';
  END IF;

  RETURN QUERY
  WITH goal_skill AS (
    -- distinct skills targeted by each goal via its tags
    SELECT DISTINCT g.id AS gid, sm.super_skill_id
    FROM public.practitioner_goals g
    JOIN public.practitioner_goal_tags gt ON gt.goal_id = g.id
    JOIN public.super_skill_tag_map sm ON sm.tag_id = gt.tag_id
    WHERE g.practitioner_user_id = prac_user_id
  ),
  goal_module AS (
    -- distinct completed modules that count toward each goal
    SELECT DISTINCT ON (g.id, cm.module_id)
      g.id AS gid,
      cm.module_id,
      m.title AS module_title,
      cm.completed_at,
      ss.name AS skill_name
    FROM public.practitioner_goals g
    JOIN goal_skill gs ON gs.gid = g.id
    JOIN public.modules m ON m.super_skill_id = gs.super_skill_id
    JOIN public.child_modules cm ON cm.module_id = m.id
      AND cm.child_id = g.child_id
      AND cm.is_completed = true
      AND cm.completed_at >= g.created_at
    LEFT JOIN public.super_skills ss ON ss.id = m.super_skill_id
    WHERE g.practitioner_user_id = prac_user_id
    ORDER BY g.id, cm.module_id, cm.completed_at
  )
  SELECT
    g.id AS goal_id,
    g.child_id,
    g.goal_text,
    g.status,
    g.target_modules,
    g.review_date,
    g.measure,
    g.created_at,
    g.completed_at AS goal_completed_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug) ORDER BY t.sort_order)
      FROM public.practitioner_goal_tags gt
      JOIN public.super_skill_tags t ON t.id = gt.tag_id
      WHERE gt.goal_id = g.id
    ), '[]'::jsonb) AS tags,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', ss.id, 'name', ss.name, 'slug', ss.slug, 'emoji', ss.emoji, 'color', ss.theme_color) ORDER BY ss.sort_order)
      FROM (SELECT DISTINCT gs.super_skill_id FROM goal_skill gs WHERE gs.gid = g.id) x
      JOIN public.super_skills ss ON ss.id = x.super_skill_id
    ), '[]'::jsonb) AS skills,
    COALESCE((SELECT count(*) FROM goal_module gm WHERE gm.gid = g.id), 0) AS progress_count,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'module_id', gm.module_id,
        'title', gm.module_title,
        'completed_at', gm.completed_at,
        'skill_name', gm.skill_name
      ) ORDER BY gm.completed_at DESC)
      FROM goal_module gm WHERE gm.gid = g.id
    ), '[]'::jsonb) AS contributing_modules
  FROM public.practitioner_goals g
  WHERE g.practitioner_user_id = prac_user_id
  ORDER BY g.created_at DESC;
END;
$$;
