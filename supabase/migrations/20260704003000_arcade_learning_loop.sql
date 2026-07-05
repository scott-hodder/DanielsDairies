-- Arcade learning loop: recorded plays, capped daily star rewards,
-- personal bests, and post-game reflections that feed parent insights.
--
-- Rewards are granted by a SECURITY DEFINER RPC so the daily cap is enforced
-- server-side — replaying endlessly cannot farm stars from the client.

CREATE TABLE IF NOT EXISTS "public"."arcade_plays" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "child_id" uuid NOT NULL REFERENCES "public"."children"("id") ON DELETE CASCADE,
    "game_id" text NOT NULL,
    "score" integer NOT NULL DEFAULT 0,
    "success" boolean NOT NULL DEFAULT false,
    "stars_earned" integer NOT NULL DEFAULT 0,
    "is_daily_challenge" boolean NOT NULL DEFAULT false,
    "reflection" text,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "arcade_plays_child_day_idx"
    ON "public"."arcade_plays" ("child_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "arcade_plays_child_game_idx"
    ON "public"."arcade_plays" ("child_id", "game_id");

ALTER TABLE "public"."arcade_plays" ENABLE ROW LEVEL SECURITY;

-- Parents can read their children's plays (feeds parent insights + weekly
-- email). Writes happen only through the RPCs below.
CREATE POLICY "Parents read own children arcade plays" ON "public"."arcade_plays"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."children" c
            WHERE c."id" = "arcade_plays"."child_id" AND c."parent_user_id" = auth.uid()
        )
    );

-- ── Daily challenge ──
-- One game is "Daniel's challenge of the day", rotating deterministically.
-- The list is ordered and append-only so the rotation is stable; the client
-- shares the same rule via arcadeLoop.js.
CREATE OR REPLACE FUNCTION "public"."arcade_daily_challenge_game"(p_on date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (ARRAY[
    'shield-sprint', 'calm-river-rapids', 'courage-canyon', 'thought-forest',
    'emotion-ocean', 'kindness-kingdom', 'focus-firefly-forest', 'coping-cave',
    'gratitude-garden', 'breathing-bridge'
  ])[(EXTRACT(DOY FROM p_on)::int % 10) + 1];
$$;

-- ── Record a play (server-side star cap) ──
-- Rules:
--   * 1 star per successful play.
--   * +1 bonus star for the first successful daily-challenge play of the day.
--   * Hard cap of 5 arcade stars per child per day (module stars unaffected).
CREATE OR REPLACE FUNCTION "public"."record_arcade_play"(
    p_child_id uuid,
    p_game_id text,
    p_score integer,
    p_success boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_daily_cap constant integer := 5;
    v_stars_today integer;
    v_award integer := 0;
    v_is_challenge boolean;
    v_challenge_done boolean;
    v_best integer;
    v_play_id uuid;
BEGIN
    -- Ownership check: the caller must be the child's parent.
    IF NOT EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = p_child_id AND c.parent_user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorised for this child';
    END IF;

    v_is_challenge := (p_game_id = public.arcade_daily_challenge_game());

    SELECT COALESCE(SUM(stars_earned), 0) INTO v_stars_today
    FROM public.arcade_plays
    WHERE child_id = p_child_id AND created_at >= date_trunc('day', now());

    SELECT EXISTS (
        SELECT 1 FROM public.arcade_plays
        WHERE child_id = p_child_id
          AND is_daily_challenge = true
          AND stars_earned > 0
          AND created_at >= date_trunc('day', now())
    ) INTO v_challenge_done;

    IF p_success THEN
        v_award := 1;
        IF v_is_challenge AND NOT v_challenge_done THEN
            v_award := v_award + 1;
        END IF;
        v_award := LEAST(v_award, GREATEST(0, v_daily_cap - v_stars_today));
    END IF;

    SELECT COALESCE(MAX(score), 0) INTO v_best
    FROM public.arcade_plays
    WHERE child_id = p_child_id AND game_id = p_game_id;

    INSERT INTO public.arcade_plays (child_id, game_id, score, success, stars_earned, is_daily_challenge)
    VALUES (p_child_id, p_game_id, COALESCE(p_score, 0), COALESCE(p_success, false), v_award, v_is_challenge)
    RETURNING id INTO v_play_id;

    IF v_award > 0 THEN
        UPDATE public.children SET stars = COALESCE(stars, 0) + v_award WHERE id = p_child_id;
    END IF;

    RETURN jsonb_build_object(
        'play_id', v_play_id,
        'awarded_stars', v_award,
        'daily_stars_used', v_stars_today + v_award,
        'daily_cap', v_daily_cap,
        'is_daily_challenge', v_is_challenge,
        'personal_best', GREATEST(v_best, COALESCE(p_score, 0)),
        'is_new_best', (COALESCE(p_score, 0) > v_best AND COALESCE(p_score, 0) > 0)
    );
END;
$$;

-- ── Save a post-game reflection ──
CREATE OR REPLACE FUNCTION "public"."save_arcade_reflection"(
    p_play_id uuid,
    p_reflection text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.arcade_plays ap
    SET reflection = LEFT(COALESCE(p_reflection, ''), 300)
    FROM public.children c
    WHERE ap.id = p_play_id
      AND c.id = ap.child_id
      AND c.parent_user_id = auth.uid();
END;
$$;

-- ── Personal bests per game (for the arcade grid) ──
CREATE OR REPLACE FUNCTION "public"."get_arcade_bests"(p_child_id uuid)
RETURNS TABLE (game_id text, best_score integer, plays bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ap.game_id, MAX(ap.score)::integer AS best_score, COUNT(*) AS plays
  FROM public.arcade_plays ap
  JOIN public.children c ON c.id = ap.child_id
  WHERE ap.child_id = p_child_id AND c.parent_user_id = auth.uid()
  GROUP BY ap.game_id;
$$;

GRANT EXECUTE ON FUNCTION "public"."record_arcade_play"(uuid, text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."save_arcade_reflection"(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."get_arcade_bests"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."arcade_daily_challenge_game"(date) TO authenticated;
