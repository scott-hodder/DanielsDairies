-- Seed a single mini_game roadblock so the new framework has something to spawn.
-- Safe to re-run: uses ON CONFLICT on title.

insert into public.roadblocks (
  title,
  description,
  roadblock_type,
  content_json,
  xp_reward,
  stars_reward,
  is_active
) values (
  'Balloon Breathing Rescue',
  'Help rescue the balloons with slow, calm breaths.',
  'mini_game',
  jsonb_build_object(
    'game_id', 'balloon-breathing',
    'config', jsonb_build_object('cyclesRequired', 4)
  ),
  30,
  6,
  true
)
on conflict do nothing;
