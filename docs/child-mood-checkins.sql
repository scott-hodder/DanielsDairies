create extension if not exists pgcrypto;

create table if not exists public.child_mood_checkins (
    id uuid primary key default gen_random_uuid(),
    child_id uuid not null references public.children(id) on delete cascade,
    parent_user_id uuid not null references auth.users(id) on delete cascade,
    mood_score integer not null check (mood_score between 1 and 5),
    mood_label text,
    mood_emoji text,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists child_mood_checkins_child_created_at_idx
    on public.child_mood_checkins (child_id, created_at desc);

alter table public.child_mood_checkins enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'child_mood_checkins'
          and policyname = 'Parents can read mood check-ins for their children'
    ) then
        create policy "Parents can read mood check-ins for their children"
            on public.child_mood_checkins
            for select
            to authenticated
            using (
                exists (
                    select 1
                    from public.children c
                    where c.id = child_mood_checkins.child_id
                      and c.parent_user_id = auth.uid()
                )
            );
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'child_mood_checkins'
          and policyname = 'Parents can insert mood check-ins for their children'
    ) then
        create policy "Parents can insert mood check-ins for their children"
            on public.child_mood_checkins
            for insert
            to authenticated
            with check (
                parent_user_id = auth.uid()
                and exists (
                    select 1
                    from public.children c
                    where c.id = child_mood_checkins.child_id
                      and c.parent_user_id = auth.uid()
                )
            );
    end if;
end $$;
