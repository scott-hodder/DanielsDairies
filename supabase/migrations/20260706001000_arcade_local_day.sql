-- ============================================================
-- Arcade day boundary = the CHILD'S local midnight, everywhere.
--
-- Previously the star cap and challenge rotation used the server day
-- (UTC) while the client showed local days — an Australian child's
-- "today" could straddle two server days. The client now sends its
-- local date with each play; the server clamps it to within one day of
-- the server date (timezones are at most UTC-12..UTC+14) so it cannot
-- be gamed to reset caps.
--
-- Also returns plays_today and challenge_won_today so the client can
-- unlock a bonus game after a daily-challenge win (one game per day,
-- +1 bonus game for winning Daniel's challenge).
-- ============================================================

ALTER TABLE public.arcade_plays
  ADD COLUMN IF NOT EXISTS local_date date;

UPDATE public.arcade_plays SET local_date = created_at::date WHERE local_date IS NULL;

ALTER TABLE public.arcade_plays
  ALTER COLUMN local_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN local_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS arcade_plays_child_local_date_idx
  ON public.arcade_plays (child_id, local_date);

-- Signature changes (adds p_local_date), so drop the old overload first
-- to avoid RPC ambiguity.
DROP FUNCTION IF EXISTS public.record_arcade_play(uuid, text, integer, boolean);

CREATE OR REPLACE FUNCTION public.record_arcade_play(
    p_child_id uuid,
    p_game_id text,
    p_score integer,
    p_success boolean,
    p_local_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_daily_cap constant integer := 5;
    v_day date;
    v_stars_today integer;
    v_plays_today integer;
    v_award integer := 0;
    v_is_challenge boolean;
    v_challenge_done boolean;
    v_challenge_won boolean;
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

    -- The child's local day, clamped to within one day of the server day.
    v_day := COALESCE(p_local_date, CURRENT_DATE);
    IF v_day < CURRENT_DATE - 1 THEN v_day := CURRENT_DATE - 1; END IF;
    IF v_day > CURRENT_DATE + 1 THEN v_day := CURRENT_DATE + 1; END IF;

    v_is_challenge := (p_game_id = public.arcade_daily_challenge_game(v_day));

    SELECT COALESCE(SUM(stars_earned), 0), COUNT(*)
    INTO v_stars_today, v_plays_today
    FROM public.arcade_plays
    WHERE child_id = p_child_id AND local_date = v_day;

    SELECT EXISTS (
        SELECT 1 FROM public.arcade_plays
        WHERE child_id = p_child_id
          AND is_daily_challenge = true
          AND stars_earned > 0
          AND local_date = v_day
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

    INSERT INTO public.arcade_plays (child_id, game_id, score, success, stars_earned, is_daily_challenge, local_date)
    VALUES (p_child_id, p_game_id, COALESCE(p_score, 0), COALESCE(p_success, false), v_award, v_is_challenge, v_day)
    RETURNING id INTO v_play_id;

    IF v_award > 0 THEN
        UPDATE public.children SET stars = COALESCE(stars, 0) + v_award WHERE id = p_child_id;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.arcade_plays
        WHERE child_id = p_child_id
          AND is_daily_challenge = true
          AND success = true
          AND local_date = v_day
    ) INTO v_challenge_won;

    RETURN jsonb_build_object(
        'play_id', v_play_id,
        'awarded_stars', v_award,
        'daily_stars_used', v_stars_today + v_award,
        'daily_cap', v_daily_cap,
        'is_daily_challenge', v_is_challenge,
        'plays_today', v_plays_today + 1,
        'challenge_won_today', v_challenge_won,
        'personal_best', GREATEST(v_best, COALESCE(p_score, 0)),
        'is_new_best', (COALESCE(p_score, 0) > v_best AND COALESCE(p_score, 0) > 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_arcade_play(uuid, text, integer, boolean, date) TO authenticated;
