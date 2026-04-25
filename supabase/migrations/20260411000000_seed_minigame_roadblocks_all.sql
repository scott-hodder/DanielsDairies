-- Seed one roadblock row per mini-game.
-- Uses NOT EXISTS so it's safe to re-run.

insert into public.roadblocks (title, description, roadblock_type, content_json, xp_reward, stars_reward, is_active)
select * from (values
  (
    'Thought Catcher',
    'Catch the helpful thoughts floating by.',
    'mini_game',
    jsonb_build_object('game_id','thought-catcher'),
    30, 6, true
  ),
  (
    'Emotion Match Trail',
    'Match the face to the feeling.',
    'mini_game',
    jsonb_build_object('game_id','emotion-match-trail'),
    30, 6, true
  ),
  (
    'Calm Path',
    'Tap the dots in order, slow and steady.',
    'mini_game',
    jsonb_build_object('game_id','calm-path'),
    30, 6, true
  ),
  (
    'Build Your Coping Kit',
    'Pack your kit with helpful coping tools.',
    'mini_game',
    jsonb_build_object('game_id','coping-kit'),
    35, 7, true
  ),
  (
    'Kindness Quest',
    'Pick the kindest thing to do.',
    'mini_game',
    jsonb_build_object('game_id','kindness-quest'),
    30, 6, true
  ),
  (
    'Focus Fireflies',
    'Catch the fireflies before they fade.',
    'mini_game',
    jsonb_build_object('game_id','focus-fireflies'),
    30, 6, true
  ),
  (
    'Self-Talk Sprint',
    'Swap tricky thoughts for kinder ones.',
    'mini_game',
    jsonb_build_object('game_id','self-talk-sprint'),
    35, 7, true
  )
) as v(title, description, roadblock_type, content_json, xp_reward, stars_reward, is_active)
where not exists (
  select 1 from public.roadblocks r
  where r.roadblock_type = 'mini_game'
    and r.content_json->>'game_id' = v.content_json->>'game_id'
);
