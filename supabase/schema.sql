-- =====================================================================
-- NyxApse leaderboard database (divisions, seasons, anti-cheat).
-- Run this in Supabase:  SQL Editor -> New query -> paste everything -> Run.
-- Before the first run: Authentication -> Sign In / Providers ->
--   turn ON "Allow anonymous sign-ins".
-- It is safe to run again (it uses "if not exists" / "create or replace").
-- It also upgrades an older NyxApse database without losing players.
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.players (
  id         uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null,
  avatar     text not null default '🙂',
  banned     boolean not null default false,
  created_at timestamptz not null default now()
);
-- division steps: 0..18  (Bronze 3,2,1 = 0,1,2 ... Master 1 = 17, Legend = 18)
alter table public.players add column if not exists dv         int     not null default 0;
alter table public.players add column if not exists grp        int     not null default 0;
alter table public.players add column if not exists peak_dv    int     not null default 0;
alter table public.players add column if not exists flagged    boolean not null default false;
alter table public.players add column if not exists strikes    int     not null default 0;
alter table public.players add column if not exists total_bp   bigint  not null default 0;
alter table public.players add column if not exists total_wins int     not null default 0;
alter table public.players add column if not exists maxlvl     jsonb   not null default '{}'::jsonb;
create unique index if not exists players_nickname_lower on public.players (lower(nickname));
create index if not exists players_division on public.players (dv, grp);

create table if not exists public.entries (
  id         bigint generated always as identity primary key,
  player_id  uuid not null references public.players (id) on delete cascade,
  game       text not null,
  level      int  not null check (level between 1 and 10000),
  secs       real not null,
  bp         int  not null,
  ts         timestamptz not null,
  h          text not null,
  week       date not null,
  created_at timestamptz not null default now(),
  unique (player_id, h)
);
-- (the list of games is re-written on every run, so new games such as Grammar are added to an existing database)
alter table public.entries drop constraint if exists entries_game_check;
alter table public.entries add constraint entries_game_check
  check (game in ('grammar','math','dots','memory','focus','aim','reflex','odd','nback','seq'));
create index if not exists entries_board         on public.entries (week, game, player_id);
create index if not exists entries_player_recent on public.entries (player_id, created_at);
create index if not exists entries_player_ts     on public.entries (player_id, ts);

create table if not exists public.meta (k text primary key, v text not null);

create table if not exists public.season_hist (      -- the division you finished each season in
  player_id uuid not null references public.players (id) on delete cascade,
  season    text not null,
  dv        int  not null,
  primary key (player_id, season)
);

create table if not exists public.rewards (          -- coins earned by weekly / season results
  id        bigint generated always as identity primary key,
  player_id uuid not null references public.players (id) on delete cascade,
  ref       text not null,
  label     text not null,
  coins     int  not null,
  claimed   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (player_id, ref)
);

create table if not exists public.reports (
  reporter uuid not null references public.players (id) on delete cascade,
  target   uuid not null references public.players (id) on delete cascade,
  ts       timestamptz not null default now(),
  primary key (reporter, target)
);

-- Row Level Security ON with NO policies on purpose:
-- nobody can read or write these tables directly. Everything goes through
-- the functions below, which check every rule on the server.
alter table public.players     enable row level security;
alter table public.entries     enable row level security;
alter table public.meta        enable row level security;
alter table public.season_hist enable row level security;
alter table public.rewards     enable row level security;
alter table public.reports     enable row level security;


-- A player's id may move to a new anonymous account when they restore from a code
alter table public.entries     drop constraint if exists entries_player_id_fkey;
alter table public.entries     add  constraint entries_player_id_fkey     foreign key (player_id) references public.players (id) on delete cascade on update cascade;
alter table public.season_hist drop constraint if exists season_hist_player_id_fkey;
alter table public.season_hist add  constraint season_hist_player_id_fkey foreign key (player_id) references public.players (id) on delete cascade on update cascade;
alter table public.rewards     drop constraint if exists rewards_player_id_fkey;
alter table public.rewards     add  constraint rewards_player_id_fkey     foreign key (player_id) references public.players (id) on delete cascade on update cascade;
alter table public.reports     drop constraint if exists reports_reporter_fkey;
alter table public.reports     add  constraint reports_reporter_fkey      foreign key (reporter)  references public.players (id) on delete cascade on update cascade;
alter table public.reports     drop constraint if exists reports_target_fkey;
alter table public.reports     add  constraint reports_target_fkey        foreign key (target)    references public.players (id) on delete cascade on update cascade;

-- Cloud save (optional, off by default): the game progress of players who turn it on.
-- It is found with nickname + a 10-digit code. Only a hash of the code is stored.
create table if not exists public.cloud_saves (
  nick_key   text not null,
  code_hash  text not null,
  blob       text not null,
  owner      uuid,
  updated_at timestamptz not null default now(),
  primary key (nick_key, code_hash)
);
create table if not exists public.cloud_fails (     -- wrong guesses per nickname, to stop code guessing
  nick_key     text primary key,
  fails        int not null default 0,
  locked_until timestamptz
);
alter table public.cloud_saves enable row level security;
alter table public.cloud_fails enable row level security;

-- ---------- small helpers ----------
create or replace function public.week_start(t timestamptz default now())
returns date language sql stable as $$
  select date_trunc('week', t at time zone 'utc')::date;   -- weeks start on Monday (UTC)
$$;

create or replace function public.reward_for(lvl int)
returns int language sql immutable as $$
  select case when lvl <= 30 then lvl * 5 else 150 + floor(sqrt(lvl - 30))::int * 5 end;   -- same formula as the game
$$;

-- How many of a 30-player group move up / down each week, per division family
-- (Bronze, Silver, Gold, Platinum, Diamond, Master, Legend). Scaled to the real group size.
-- Groups under 10 players never demote anyone.
create or replace function public.zone_counts(d int, n int, out up int, out down int)
language plpgsql immutable set search_path = public as $$
declare
  fu numeric := (array[20,15,12,9,7,5,0])[least(d / 3, 6) + 1] / 30.0;
  fd numeric := (array[5,5,7,8,9,10,10])[least(d / 3, 6) + 1] / 30.0;
begin
  up   := case when d >= 18 then 0 else round(n * fu)::int end;
  down := case when d <= 0 or n < 10 then 0 else round(n * fd)::int end;
  if up + down > n then down := greatest(n - up, 0); end if;
end $$;

-- a group (max 30) of the same division with room, else a brand new group
create or replace function public.pick_group(p_dv int)
returns int language plpgsql security definer set search_path = public as $$
declare g int;
begin
  select pl.grp into g from public.players pl
   where pl.dv = p_dv and not pl.banned
   group by pl.grp having count(*) < 30
   order by count(*) asc, pl.grp asc limit 1;
  if g is null then
    select coalesce(max(pl.grp), -1) + 1 into g from public.players pl where pl.dv = p_dv;
  end if;
  return g;
end $$;

-- spread each division evenly over groups of at most 30 (65 players -> 3 groups of ~22)
create or replace function public.rebalance()
returns void language plpgsql security definer set search_path = public as $$
begin
  with x as (
    select id,
           (row_number() over (partition by dv order by random()) - 1) as rn,
           count(*) over (partition by dv) as n
    from public.players where not banned and not flagged
  )
  update public.players p
     set grp = (x.rn % ceil(x.n / 30.0)::bigint)::int
    from x where p.id = x.id;
end $$;

-- ---------- weekly settle: promotions, demotions, season end ----------
-- Runs by itself the first time anyone calls the server after a week has ended.
create or replace function public.settle()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cur  date := public.week_start();
  v_last date;
  v_w    date;
  v_s    text;
  v_n    int := 0;
begin
  if not pg_try_advisory_xact_lock(776601) then return; end if;
  select m.v::date into v_last from public.meta m where m.k = 'settled';
  if v_last is null then            -- first run: nothing to settle yet, just start the groups
    insert into public.meta (k, v) values ('settled', v_cur::text) on conflict (k) do nothing;
    perform public.rebalance();
    return;
  end if;
  if v_last < v_cur - 56 then v_last := v_cur - 56; end if;

  while v_last < v_cur loop
    v_w := v_last;

    with agg as (
      select p.id, p.dv as d, p.grp as g,
             coalesce(sum(e.bp), 0)::int as bp, count(e.id)::int as wins, max(e.ts) as lt
      from public.players p
      left join public.entries e on e.player_id = p.id and e.week = v_w
      where not p.banned and not p.flagged
      group by p.id, p.dv, p.grp
    ), rk as (
      select a.*,
             count(*) over (partition by a.d, a.g)::int as n,
             row_number() over (partition by a.d, a.g order by a.bp desc, a.lt asc nulls last, a.id) as r
      from agg a
    ), calc as (
      select rk.*, z.up, z.down,
             (rk.wins >= 1 and rk.r <= z.up and rk.d < 18) as goes_up,
             (rk.r > rk.n - z.down and rk.d > 0
                and not (rk.wins >= 1 and rk.r <= z.up and rk.d < 18)) as goes_down
      from rk cross join lateral public.zone_counts(rk.d, rk.n) z
    ), rew as (
      insert into public.rewards (player_id, ref, label, coins)
      select c.id, 'w:' || v_w::text, 'Week of ' || v_w::text,
             case when c.d = 18 and c.r <= 5 then 1500
                  when c.goes_up then (array[100,200,350,500,750,1000,1500])[least(c.d / 3, 6) + 1]
                  else 25 end
      from calc c
      where c.wins >= 1 and not c.goes_down
      on conflict do nothing
      returning 1
    )
    update public.players p
       set dv      = case when c.goes_up then c.d + 1 when c.goes_down then c.d - 1 else c.d end,
           peak_dv = greatest(p.peak_dv, case when c.goes_up then c.d + 1 else c.d end)
      from calc c where p.id = c.id;

    -- end of a season (the calendar month of the week's Monday)
    if to_char(v_w, 'YYYY-MM') <> to_char(v_w + 7, 'YYYY-MM') then
      v_s := to_char(v_w, 'YYYY-MM');
      insert into public.season_hist (player_id, season, dv)
        select p.id, v_s, p.dv from public.players p
        where not p.banned and not p.flagged
          and exists (select 1 from public.entries e
                      where e.player_id = p.id
                        and e.week >= date_trunc('month', v_w::timestamp)::date and e.week <= v_w)
        on conflict do nothing;
      insert into public.rewards (player_id, ref, label, coins)
        select sh.player_id, 's:' || v_s, 'Season ' || v_s || ' finish',
               (array[200,400,700,1000,1500,2000,3000])[least(sh.dv / 3, 6) + 1]
        from public.season_hist sh where sh.season = v_s
        on conflict do nothing;
      update public.players set dv = greatest(dv - 2, 0) where dv > 0;   -- soft reset: down 2 steps
    end if;

    v_last := v_last + 7;
    v_n := v_n + 1;
  end loop;

  update public.meta set v = v_cur::text where k = 'settled';
  if v_n > 0 then perform public.rebalance(); end if;
end $$;

-- >>> NAMEFILTER (generated by tools/gen_namefilter.py - edit the word lists there, not here)
create or replace function public.name_ok(p text)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  strong text[] := array['fuck','fvck','phuck','fuking','fucking','motherfuck','shit','shyt','bullshit','bitch','biatch','cunt','whore','slut','bastard','asshole','arsehole','dickhead','cocksucker','pussy','penis','vagina','dildo','blowjob','handjob','cumshot','jizz','wank','wanker','twat','nigger','nigga','faggot','retard','spastic','tranny','chink','rapist','porn','pornhub','hentai','neonazi','hitler','incest','pedo','paedo','molest','childporn','killyourself','admin','moderator','nyxapse','shadowed'];
  exact  text[] := array['ass','arse','sex','cum','tit','tits','anal','anus','fag','fags','coon','paki','nazi','nazis','kkk','kys','xxx','rape','rapes','raped','nsfw','dick','cock','boob','boobs','hoe','thot','milf','orgy','cuck','spic','kike','loli','shota','mod','mods','staff','official','support','owner','dev','system','root','fck','fuk','sht','btch','cnt','dck'];
  allow  text[] := array['scunthorpe','shiitake','shitake','hancock','peacock','cockpit','cocktail','woodcock','babcock','cockney','swank','swanky','wankel','snigger','torpedo','pedometer','retardant','badminton','therapist','therapists'];
  s text := lower(coalesce(p, ''));
  flat text; flat2 text; col text; col2 text; w text; wc text; v_tok text; i int; vv text; fv text;
begin
  if length(regexp_replace(s, '[^0-9]', '', 'g')) >= 7 then return false; end if;
  if s ~ '(https?|www|\.com|\.net|\.org|\.io|@)' then return false; end if;
  flat := regexp_replace(translate(s, '013457$@!+', 'oieastsait'), '[^a-z]', '', 'g');
  flat2 := flat;
  foreach w in array allow loop flat2 := replace(flat2, w, ''); end loop;
  foreach w in array strong loop
    if position(w in flat2) > 0 then return false; end if;
  end loop;
  for i in 2 .. length(s) - 1 loop   -- a symbol standing in for a missing vowel: sh.t, f*ck
    if substr(s, i, 1) ~ '[^a-z0-9]' and substr(s, i - 1, 1) ~ '[a-z0-9]' and substr(s, i + 1, 1) ~ '[a-z0-9]' then
      foreach vv in array array['a','e','i','o','u'] loop
        fv := regexp_replace(translate(substr(s, 1, i - 1) || vv || substr(s, i + 1), '013457$@!+', 'oieastsait'), '[^a-z]', '', 'g');
        foreach w in array allow loop fv := replace(fv, w, ''); end loop;
        foreach w in array strong loop
          if position(w in fv) > 0 then return false; end if;
        end loop;
      end loop;
    end if;
  end loop;
  col := regexp_replace(flat, '(.)\1+', '\1', 'g');
  if col <> flat then
    col2 := col;
    foreach w in array allow loop col2 := replace(col2, regexp_replace(w, '(.)\1+', '\1', 'g'), ''); end loop;
    foreach w in array strong loop
      wc := regexp_replace(w, '(.)\1+', '\1', 'g');
      if length(wc) >= 4 and position(wc in col2) > 0 then return false; end if;
    end loop;
  end if;
  if flat = any(exact) or regexp_replace(s, '[^a-z]', '', 'g') = any(exact) then return false; end if;
  foreach v_tok in array regexp_split_to_array(s, '[^a-z0-9]+') loop
    if v_tok = '' then continue; end if;
    if regexp_replace(translate(v_tok, '013457', 'oieast'), '[^a-z]', '', 'g') = any(exact)
       or regexp_replace(v_tok, '[0-9]+$', '') = any(exact) then
      return false;
    end if;
  end loop;
  return true;
end $$;
revoke all on function public.name_ok(text) from public, anon, authenticated;
-- <<< NAMEFILTER

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
  if not public.name_ok(nick) then
    return jsonb_build_object('ok', false, 'error', 'bad_nickname');
  end if;
  if exists (select 1 from public.players where lower(nickname) = lower(nick) and id <> uid) then
    return jsonb_build_object('ok', false, 'error', 'nickname_taken');
  end if;
  insert into public.players (id, nickname, avatar, grp)
  values (uid, nick, left(coalesce(p_avatar, '🙂'), 8), public.pick_group(0))
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
  v_strike int := 0;
  v_game   text;
  v_level  int;
  v_secs   real;
  v_bp     int;
  v_ts     timestamptz;
  v_hash   text;
  v_max    int;
  v_cap    int;
  -- fastest believable clear for each game, in seconds
  mins     jsonb := '{"grammar":8,"math":5,"dots":1.5,"memory":2.5,"focus":4,"aim":3,"odd":3,"nback":25,"seq":3,"reflex":17}'::jsonb;
begin
  perform public.settle();
  if uid is null or not exists (select 1 from public.players where id = uid and not banned) then
    return jsonb_build_object('ok', false, 'error', 'not_joined');
  end if;
  if exists (select 1 from public.players where id = uid and flagged) then
    return jsonb_build_object('ok', true, 'accepted', 0, 'skipped', 0);   -- under review: quietly ignored
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

    -- you can only win a level you have reached: at most one above your best (first time: up to 500)
    select coalesce((p.maxlvl ->> v_game)::int, 0) into v_max from public.players p where p.id = uid;
    v_cap := case when v_max = 0 then 500 else v_max + 1 end;
    if v_level > v_cap then
      skipped := skipped + 1; v_strike := v_strike + 1;
      continue;
    end if;

    -- nobody can play more than an hour in an hour
    if v_secs + coalesce((select sum(x.secs) from public.entries x
                          where x.player_id = uid and x.ts > v_ts - interval '1 hour' and x.ts <= v_ts), 0) > 3700 then
      skipped := skipped + 1; v_strike := v_strike + 1;
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

    if found then
      accepted := accepted + 1;
      update public.players
         set total_bp = total_bp + v_bp,
             total_wins = total_wins + 1,
             maxlvl = jsonb_set(maxlvl, array[v_game], to_jsonb(greatest(v_max, v_level)))
       where id = uid;
    else
      skipped := skipped + 1;
    end if;
  end loop;

  if v_strike > 0 then   -- many impossible records in a row hide the player until you review them
    update public.players
       set strikes = strikes + v_strike,
           flagged = flagged or (strikes + v_strike >= 15)
     where id = uid;
  end if;

  return jsonb_build_object('ok', true, 'accepted', accepted, 'skipped', skipped);
end $$;

-- ---------- read my group's board (this week) ----------
create or replace function public.get_board(p_game text default 'all')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid    uuid := auth.uid();
  wk     date := public.week_start();
  v_dv   int;
  v_grp  int;
  v_n    int;
  v_up   int;
  v_down int;
  v_rows jsonb;
  v_me   jsonb;
  v_nm   date := (date_trunc('month', public.week_start()::timestamp) + interval '1 month')::date;
  v_se   date;
begin
  perform public.settle();
  v_se := v_nm + ((8 - extract(isodow from v_nm)::int) % 7);   -- first Monday of next month = season end
  if p_game <> 'all' and p_game not in ('grammar','math','dots','memory','focus','aim','reflex','odd','nback','seq') then
    return jsonb_build_object('rows', '[]'::jsonb, 'me', null, 'week_start', wk, 'resets_in', 0, 'division', null);
  end if;
  select p.dv, p.grp into v_dv, v_grp from public.players p where p.id = uid and not p.banned;
  if v_dv is null then
    return jsonb_build_object('rows', '[]'::jsonb, 'me', null, 'week_start', wk, 'resets_in', 0, 'division', null);
  end if;
  select count(*)::int into v_n from public.players p where p.dv = v_dv and p.grp = v_grp and not p.banned and not p.flagged;
  select z.up, z.down into v_up, v_down from public.zone_counts(v_dv, v_n) z;

  with m as (
    select p.id, p.nickname, p.avatar from public.players p
    where p.dv = v_dv and p.grp = v_grp and not p.banned and not p.flagged
  ), agg as (
    select m.id, m.nickname, m.avatar, coalesce(sum(e.bp), 0)::int as bp, count(e.id)::int as wins, max(e.ts) as lt
    from m left join public.entries e
      on e.player_id = m.id and e.week = wk and (p_game = 'all' or e.game = p_game)
    group by m.id, m.nickname, m.avatar
  ), rk as (
    select a.*, row_number() over (order by a.bp desc, a.lt asc nulls last, a.nickname) as r from agg a
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'rank', rk.r, 'nick', rk.nickname, 'avatar', rk.avatar, 'bp', rk.bp, 'wins', rk.wins, 'me', (rk.id = uid),
      'zone', case when p_game <> 'all' then null
                   when v_dv = 18 and rk.wins >= 1 and rk.r <= 5 then 'crown'
                   when rk.wins >= 1 and v_dv < 18 and rk.r <= v_up then 'up'
                   when v_dv > 0 and rk.r > v_n - v_down then 'down'
                   else 'steady' end
    ) order by rk.r), '[]'::jsonb),
    (select jsonb_build_object('rank', x.r, 'bp', x.bp, 'wins', x.wins) from rk x where x.id = uid)
  into v_rows, v_me
  from rk;

  return jsonb_build_object(
    'rows', v_rows, 'me', v_me, 'week_start', wk,
    'resets_in', extract(epoch from ((wk + 7)::timestamp - (now() at time zone 'utc')))::int,
    'division', v_dv, 'group_size', v_n, 'up', v_up, 'down', v_down,
    'season', to_char(wk, 'YYYY-MM'), 'season_end', v_se,
    'season_resets_in', extract(epoch from (v_se::timestamp - (now() at time zone 'utc')))::int
  );
end $$;

-- ---------- my own division summary ----------
create or replace function public.get_me()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r   public.players;
  v_c int;
begin
  perform public.settle();
  select * into r from public.players p where p.id = uid and not p.banned;
  if not found then return jsonb_build_object('joined', false); end if;
  select count(*)::int into v_c from public.season_hist sh
   where sh.player_id = uid and least(sh.dv / 3, 6) = least(r.peak_dv / 3, 6);
  return jsonb_build_object('joined', true, 'dv', r.dv, 'peak', r.peak_dv,
    'best_tier', least(r.peak_dv / 3, 6), 'best_cnt', v_c,
    'total_bp', r.total_bp, 'total_wins', r.total_wins, 'maxlvl', r.maxlvl);
end $$;

-- ---------- another player's public profile ----------
create or replace function public.get_profile(p_nick text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r   public.players;
  v_c int;
begin
  if auth.uid() is null then return jsonb_build_object('found', false); end if;
  select * into r from public.players p
   where lower(p.nickname) = lower(coalesce(p_nick, '')) and not p.banned and not p.flagged;
  if not found then return jsonb_build_object('found', false); end if;
  select count(*)::int into v_c from public.season_hist sh
   where sh.player_id = r.id and least(sh.dv / 3, 6) = least(r.peak_dv / 3, 6);
  return jsonb_build_object('found', true, 'nick', r.nickname, 'avatar', r.avatar,
    'dv', r.dv, 'peak', r.peak_dv, 'best_tier', least(r.peak_dv / 3, 6), 'best_cnt', v_c,
    'total_bp', r.total_bp, 'total_wins', r.total_wins, 'maxlvl', r.maxlvl);
end $$;

-- ---------- report a player ----------
-- A report only counts from an established player (3+ days old, 20+ wins) in the SAME group.
-- A player is hidden when reports reach the higher of 5 or 20% of their group, until you review them.
create or replace function public.report_player(p_nick text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid    uuid := auth.uid();
  v_me   public.players;
  v_tp   public.players;
  v_n    int;
  v_need int;
begin
  select * into v_me from public.players p where p.id = uid and not p.banned;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_joined'); end if;
  if v_me.created_at > now() - interval '3 days' or v_me.total_wins < 20 then
    return jsonb_build_object('ok', false, 'error', 'too_new');
  end if;
  select * into v_tp from public.players p
   where lower(p.nickname) = lower(coalesce(p_nick, '')) and not p.banned;
  if not found or v_tp.id = uid then return jsonb_build_object('ok', false); end if;
  if v_tp.dv <> v_me.dv or v_tp.grp <> v_me.grp then
    return jsonb_build_object('ok', false, 'error', 'other_group');
  end if;
  if (select count(*) from public.reports where reporter = uid and ts > now() - interval '1 day') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;
  insert into public.reports (reporter, target) values (uid, v_tp.id) on conflict do nothing;
  select count(*)::int into v_n from public.players p where p.dv = v_tp.dv and p.grp = v_tp.grp and not p.banned;
  v_need := greatest(5, ceil(v_n * 0.2)::int);
  if (select count(*) from public.reports where target = v_tp.id) >= v_need then
    update public.players set flagged = true where id = v_tp.id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- coin rewards from weekly / season results ----------
create or replace function public.get_rewards()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.settle();
  return coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'label', w.label, 'coins', w.coins) order by w.id)
                   from public.rewards w
                   where w.player_id = auth.uid() and not w.claimed and w.coins > 0), '[]'::jsonb);
end $$;

create or replace function public.ack_rewards(p_ids jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or jsonb_typeof(p_ids) <> 'array' or jsonb_array_length(p_ids) > 100 then
    return jsonb_build_object('ok', false);
  end if;
  update public.rewards set claimed = true
   where player_id = auth.uid()
     and id in (select (t.value)::bigint from jsonb_array_elements_text(p_ids) t);
  return jsonb_build_object('ok', true);
end $$;


-- ---------- cloud save: store, restore, delete ----------
create or replace function public.cloud_hash(p_nick text, p_code text)
returns text language sql immutable as $$
  select encode(sha256(convert_to('nyxapse-cloud-v1|' || lower(p_nick) || '|' || p_code, 'UTF8')), 'hex');
$$;

create or replace function public.cloud_save(p_nick text, p_code text, p_blob text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  k   text := lower(btrim(coalesce(p_nick, '')));
  h   text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if k !~ '^[a-z0-9_. -]{3,16}$' or coalesce(p_code, '') !~ '^[0-9]{10}$'
     or length(coalesce(p_blob, '')) < 2 or length(p_blob) > 120000 then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  h := public.cloud_hash(k, p_code);
  if exists (select 1 from public.cloud_saves where owner = uid and updated_at > now() - interval '10 seconds') then
    return jsonb_build_object('ok', false, 'error', 'too_fast');
  end if;
  if (select count(*) from public.cloud_saves where owner = uid and not (nick_key = k and code_hash = h)) >= 3 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;
  insert into public.cloud_saves (nick_key, code_hash, blob, owner)
  values (k, h, p_blob, uid)
  on conflict (nick_key, code_hash) do update set blob = excluded.blob, owner = excluded.owner, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.cloud_restore(p_nick text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  k   text := lower(btrim(coalesce(p_nick, '')));
  h   text;
  r   public.cloud_saves;
  f   public.cloud_fails;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if k !~ '^[a-z0-9_. -]{3,16}$' or coalesce(p_code, '') !~ '^[0-9]{10}$' then
    return jsonb_build_object('ok', false, 'error', 'wrong');
  end if;
  select * into f from public.cloud_fails c where c.nick_key = k;
  if found and f.locked_until is not null and f.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'retry_in', extract(epoch from (f.locked_until - now()))::int);
  end if;
  h := public.cloud_hash(k, p_code);
  select * into r from public.cloud_saves s where s.nick_key = k and s.code_hash = h;
  if not found then          -- 5 wrong guesses lock that nickname for an hour
    insert into public.cloud_fails (nick_key, fails) values (k, 1)
    on conflict (nick_key) do update set fails = public.cloud_fails.fails + 1;
    update public.cloud_fails set locked_until = now() + interval '1 hour', fails = 0 where nick_key = k and fails >= 5;
    return jsonb_build_object('ok', false, 'error', 'wrong');
  end if;
  delete from public.cloud_fails where nick_key = k;
  if r.owner is not null and r.owner <> uid then      -- bring the leaderboard player to this phone
    if exists (select 1 from public.players where id = r.owner) then
      delete from public.players where id = uid;       -- an empty profile made after the data was cleared
      update public.players set id = uid where id = r.owner;
    end if;
    update public.cloud_saves set owner = uid where nick_key = k and code_hash = h;
  end if;
  return jsonb_build_object('ok', true, 'blob', r.blob, 'updated_at', r.updated_at);
end $$;

create or replace function public.cloud_delete()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  delete from public.cloud_saves where owner = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- ---------- delete my data ----------
create or replace function public.delete_me()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false);
  end if;
  delete from public.cloud_saves where owner = auth.uid();
  delete from public.players where id = auth.uid();   -- entries, history, rewards, reports go with it
  return jsonb_build_object('ok', true);
end $$;

-- ---------- keep-alive + clean-up (called by the GitHub workflow) ----------
create or replace function public.ping()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.settle();
  delete from public.entries where week < public.week_start() - 70;   -- keep about 10 weeks
  delete from public.cloud_saves where updated_at < now() - interval '400 days';
  delete from public.cloud_fails where locked_until is null or locked_until < now() - interval '1 day';
  return jsonb_build_object('ok', true, 'now', now());
end $$;

-- ---------- who may call what ----------
revoke all on function public.zone_counts(int, int) from public, anon, authenticated;
revoke all on function public.pick_group(int)      from public, anon, authenticated;
revoke all on function public.rebalance()          from public, anon, authenticated;
revoke all on function public.settle()             from public, anon, authenticated;
revoke all on function public.cloud_hash(text, text) from public, anon, authenticated;

revoke all on function public.register_player(text, text) from public, anon;
revoke all on function public.submit_entries(jsonb)       from public, anon;
revoke all on function public.get_board(text)             from public, anon;
revoke all on function public.get_me()                    from public, anon;
revoke all on function public.get_profile(text)           from public, anon;
revoke all on function public.report_player(text)         from public, anon;
revoke all on function public.get_rewards()               from public, anon;
revoke all on function public.ack_rewards(jsonb)          from public, anon;
revoke all on function public.delete_me()                 from public, anon;
revoke all on function public.ping()                      from public;
grant execute on function public.register_player(text, text) to authenticated;
grant execute on function public.submit_entries(jsonb)       to authenticated;
grant execute on function public.get_board(text)             to authenticated;
grant execute on function public.get_me()                    to authenticated;
grant execute on function public.get_profile(text)           to authenticated;
grant execute on function public.report_player(text)         to authenticated;
grant execute on function public.get_rewards()               to authenticated;
grant execute on function public.ack_rewards(jsonb)          to authenticated;
grant execute on function public.delete_me()                 to authenticated;
revoke all on function public.cloud_save(text, text, text)  from public, anon;
revoke all on function public.cloud_restore(text, text)       from public, anon;
revoke all on function public.cloud_delete()                  from public, anon;
grant execute on function public.cloud_save(text, text, text) to authenticated;
grant execute on function public.cloud_restore(text, text)    to authenticated;
grant execute on function public.cloud_delete()               to authenticated;
grant execute on function public.ping()                      to anon, authenticated;

-- To ban a cheater:        update public.players set banned  = true  where lower(nickname) = lower('TheirName');
-- To hide / unhide one:    update public.players set flagged = true  where lower(nickname) = lower('TheirName');
-- To see who is flagged:   select nickname, strikes from public.players where flagged;

-- ---------- clean-up of an older version ----------
-- The old timer-scaled reward check is gone: the reward must match the game's formula exactly.
drop function if exists public.bp_ok(text, int, int);
