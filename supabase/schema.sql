-- =====================================================================
-- NyxApse leaderboard database. Run this ONCE in Supabase:
--   SQL Editor -> New query -> paste everything -> Run.
-- Before running it: Authentication -> Sign In / Providers ->
--   turn ON "Allow anonymous sign-ins".
-- It is safe to run again (it uses "if not exists" / "create or replace").
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.players (
  id         uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null,
  avatar     text not null default '🙂',
  banned     boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists players_nickname_lower on public.players (lower(nickname));

create table if not exists public.entries (
  id         bigint generated always as identity primary key,
  player_id  uuid not null references public.players (id) on delete cascade,
  game       text not null check (game in ('math','dots','memory','focus','aim','reflex','odd')),
  level      int  not null check (level between 1 and 10000),
  secs       real not null,
  bp         int  not null,
  ts         timestamptz not null,
  h          text not null,
  week       date not null,
  created_at timestamptz not null default now(),
  unique (player_id, h)
);
create index if not exists entries_board         on public.entries (week, game, player_id);
create index if not exists entries_player_recent on public.entries (player_id, created_at);

-- Row Level Security ON with NO policies on purpose:
-- nobody can read or write these tables directly. Everything goes through
-- the functions below, which check every rule on the server.
alter table public.players enable row level security;
alter table public.entries enable row level security;

-- ---------- small helpers ----------
create or replace function public.week_start(t timestamptz default now())
returns date language sql stable as $$
  select date_trunc('week', t at time zone 'utc')::date;   -- weeks start on Monday (UTC)
$$;

create or replace function public.reward_for(lvl int)
returns int language sql immutable as $$
  select case when lvl <= 30 then lvl * 5 else 150 + floor(sqrt(lvl - 30))::int * 5 end;   -- same formula as the game
$$;

-- ---------- join the leaderboard ----------
create or replace function public.register_player(p_nick text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid  uuid := auth.uid();
  nick text := btrim(regexp_replace(coalesce(p_nick, ''), '\s+', ' ', 'g'));
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;
  if nick !~ '^[A-Za-z0-9_. -]{3,16}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_nickname');
  end if;
  if lower(nick) ~ '(fuck|shit|bitch|cunt|nigg|fag|rape|nazi|hitler|porn|dick|cock|pussy|admin|moderator|support|nyxapse)' then
    return jsonb_build_object('ok', false, 'error', 'bad_nickname');
  end if;
  if exists (select 1 from public.players where lower(nickname) = lower(nick) and id <> uid) then
    return jsonb_build_object('ok', false, 'error', 'nickname_taken');
  end if;
  insert into public.players (id, nickname, avatar)
  values (uid, nick, left(coalesce(p_avatar, '🙂'), 8))
  on conflict (id) do update
    set nickname = excluded.nickname, avatar = excluded.avatar
    where public.players.banned = false;
  return jsonb_build_object('ok', true);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'nickname_taken');
end $$;

-- ---------- send win records (checked on the server) ----------
create or replace function public.submit_entries(p_entries jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid      uuid := auth.uid();
  e        jsonb;
  accepted int := 0;
  skipped  int := 0;
  v_game   text;
  v_level  int;
  v_secs   real;
  v_bp     int;
  v_ts     timestamptz;
  v_hash   text;
  -- fastest believable clear for each game, in seconds
  mins     jsonb := '{"math":5,"dots":1.5,"memory":2.5,"focus":4,"aim":3,"odd":3,"reflex":17}'::jsonb;
begin
  if uid is null or not exists (select 1 from public.players where id = uid and not banned) then
    return jsonb_build_object('ok', false, 'error', 'not_joined');
  end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 50 then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  for e in select value from jsonb_array_elements(p_entries) loop
    begin
      v_game  := e ->> 'g';
      v_level := (e ->> 'l')::int;
      v_secs  := (e ->> 's')::real;
      v_bp    := (e ->> 'bp')::int;
      v_ts    := to_timestamp(((e ->> 'ts')::numeric / 1000.0)::double precision);
      v_hash  := e ->> 'h';
    exception when others then
      skipped := skipped + 1;
      continue;
    end;

    -- only normal-timer wins count: the reward must match the formula exactly
    if v_game is null or v_hash is null or length(v_hash) > 40
       or not jsonb_exists(mins, v_game)
       or v_level < 1 or v_level > 10000
       or v_bp <> public.reward_for(v_level)
       or v_secs < (mins ->> v_game)::real
       or v_ts > now() + interval '5 minutes'
       or v_ts < now() - interval '8 days' then
      skipped := skipped + 1;
      continue;
    end if;

    -- speed limit: at most 240 recorded wins per rolling hour
    if (select count(*) from public.entries where player_id = uid and created_at > now() - interval '1 hour') >= 240 then
      skipped := skipped + 1;
      continue;
    end if;

    insert into public.entries (player_id, game, level, secs, bp, ts, h, week)
    values (uid, v_game, v_level, v_secs, v_bp, v_ts, v_hash, public.week_start(v_ts))
    on conflict (player_id, h) do nothing;

    if found then accepted := accepted + 1; else skipped := skipped + 1; end if;
  end loop;

  return jsonb_build_object('ok', true, 'accepted', accepted, 'skipped', skipped);
end $$;

-- ---------- read the board (this week) ----------
create or replace function public.get_board(p_game text default 'all')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid    uuid := auth.uid();
  wk     date := public.week_start();
  v_rows jsonb;
  v_me   jsonb;
begin
  if p_game <> 'all' and p_game not in ('math','dots','memory','focus','aim','reflex','odd') then
    return jsonb_build_object('rows', '[]'::jsonb, 'me', null, 'week_start', wk, 'resets_in', 0);
  end if;

  with agg as (
    select e.player_id, sum(e.bp)::int as total_bp, count(*)::int as wins, max(e.ts) as last_ts
    from public.entries e
    join public.players p on p.id = e.player_id and not p.banned
    where e.week = wk and (p_game = 'all' or e.game = p_game)
    group by e.player_id
  ), ranked as (
    select a.player_id, a.total_bp, a.wins, p.nickname, p.avatar,
           rank() over (order by a.total_bp desc, a.last_ts asc) as rnk   -- ties: whoever got there first
    from agg a join public.players p on p.id = a.player_id
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object('rank', r.rnk, 'nick', r.nickname, 'avatar', r.avatar,
                                                  'bp', r.total_bp, 'wins', r.wins, 'me', (r.player_id = uid))
                               order by r.rnk, r.nickname)
              from ranked r where r.rnk <= 50), '[]'::jsonb),
    (select jsonb_build_object('rank', r.rnk, 'bp', r.total_bp, 'wins', r.wins) from ranked r where r.player_id = uid)
  into v_rows, v_me;

  return jsonb_build_object(
    'rows', v_rows, 'me', v_me, 'week_start', wk,
    'resets_in', extract(epoch from ((wk + 7)::timestamp - (now() at time zone 'utc')))::int
  );
end $$;

-- ---------- delete my data ----------
create or replace function public.delete_me()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false);
  end if;
  delete from public.players where id = auth.uid();   -- their entries are deleted with it
  return jsonb_build_object('ok', true);
end $$;

-- ---------- keep-alive + clean-up (called by the weekly GitHub workflow) ----------
create or replace function public.ping()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  delete from public.entries where week < public.week_start() - 70;   -- keep about 10 weeks
  return jsonb_build_object('ok', true, 'now', now());
end $$;

-- ---------- who may call what ----------
revoke all on function public.register_player(text, text) from public, anon;
revoke all on function public.submit_entries(jsonb)       from public, anon;
revoke all on function public.get_board(text)             from public, anon;
revoke all on function public.delete_me()                 from public, anon;
revoke all on function public.ping()                      from public;
grant execute on function public.register_player(text, text) to authenticated;
grant execute on function public.submit_entries(jsonb)       to authenticated;
grant execute on function public.get_board(text)             to authenticated;
grant execute on function public.delete_me()                 to authenticated;
grant execute on function public.ping()                      to anon, authenticated;

-- To ban a cheater:   update public.players set banned = true where lower(nickname) = lower('TheirName');
