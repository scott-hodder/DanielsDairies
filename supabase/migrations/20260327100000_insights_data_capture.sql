-- Data capture enhancements for Parent Insights

-- #5: Post-module reflection rating (1-5, "How did that feel?")
ALTER TABLE public.child_modules ADD COLUMN IF NOT EXISTS reflection_rating smallint;
ALTER TABLE public.child_modules ADD CONSTRAINT child_modules_reflection_rating_check CHECK (reflection_rating IS NULL OR (reflection_rating >= 1 AND reflection_rating <= 5));

-- #7: Daily mood journal - optional short note with mood check-in
ALTER TABLE public.child_mood_checkins ADD COLUMN IF NOT EXISTS mood_note text;
ALTER TABLE public.child_mood_checkins ADD CONSTRAINT mood_note_length CHECK (mood_note IS NULL OR length(mood_note) <= 100);

-- #8: Goal tracking closure - how did last week's goal go?
ALTER TABLE public.weekly_checkins ADD COLUMN IF NOT EXISTS previous_goal_result text;
ALTER TABLE public.weekly_checkins ADD CONSTRAINT previous_goal_result_check CHECK (previous_goal_result IS NULL OR previous_goal_result IN ('nailed_it', 'tried_it', 'didnt_get_to_it'));
