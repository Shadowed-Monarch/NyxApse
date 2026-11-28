# Setting up the NyxApse leaderboard (Supabase)

The game works without any of this. Do these steps only when you want online leaderboards.

1. **Create a project** at supabase.com (the free plan is enough).
2. **Allow anonymous players:** Authentication -> Sign In / Providers -> turn ON **Allow anonymous sign-ins**.
3. **Create the database:** SQL Editor -> New query -> paste all of `supabase/schema.sql` -> **Run**.
   If you see an error, copy it and ask for help; the script can be run again safely.
4. **Add your project to the game:** Project Settings -> API. Copy the **Project URL** and the **anon public key**
   into `js/config.js`. Both are public by design.
   **Never** put the `service_role` key or your database password in any file in this repo.
5. **Stop the free project from pausing:** free projects pause after a week without activity. In your GitHub repo go to
   Settings -> Secrets and variables -> Actions and add two secrets: `SUPABASE_URL` and `SUPABASE_ANON_KEY` (same values as above).
   The workflow in `.github/workflows/keepalive.yml` then pings the database twice a week.
6. **Test:** open the game, make a nickname, switch on Settings -> Leaderboard, win a level, then open the Leaderboard.

## Upgrading from an older version
This release adds the **Grammar** game and removes the old timer-based reward check (`bp_ok`). Run the new `schema.sql` once in the SQL Editor; it also drops the old function.
Paste the new `schema.sql` into the SQL Editor and Run it again. It keeps your players and adds the new columns and tables.
The first call after that puts everyone in Bronze 3, in groups of up to 30.

## How divisions work
- 19 steps: Bronze 3, 2, 1, Silver 3, 2, 1, Gold, Platinum, Diamond, Master (3 steps each) and Legend.
- Each division is split into groups of at most 30 (65 players become 3 groups of about 22). You only see your own group.
- Every Monday (UTC) the server settles the week by itself, the first time anyone calls it: top players move up (Ascent Zone), bottom players move down (Drop Zone). Zone sizes per 30 players: Bronze 20 up / 5 down, Silver 15/5, Gold 12/7, Platinum 9/8, Diamond 7/9, Master 5/10, Legend 0/10. Bronze 3 never drops. Groups under 10 players never demote. You need 1 win in the week to move up.
- A season is a calendar month. At its end the final division is saved, coins are paid, and everyone drops 2 steps (never below Bronze 3).
- Coins for weekly and season results are paid once, by the game, after the server confirms them.

## Nickname filter
`name_ok()` in `schema.sql` is generated from the word lists in `tools/gen_namefilter.py`, together with `js/namefilter.js`, so the app and the server agree. To add a word: edit the list, run `python3 tools/gen_namefilter.py`, paste the new `schema.sql` into the SQL Editor again, and push the new `js/namefilter.js`.

## Cloud save
Optional (off by default, 16+). Tables `cloud_saves` and `cloud_fails`, and functions `cloud_save`, `cloud_restore` and `cloud_delete`. A save is found with nickname + 10-digit code (only a hash is stored). Five wrong guesses lock that nickname for an hour. Restoring also moves the player's leaderboard identity to the new phone. Saves unused for 400 days are deleted by the keep-alive `ping`.
To see saves: `select nick_key, updated_at, length(blob) from public.cloud_saves order by updated_at desc;`

## How it stays honest
- Nobody can read or write the tables directly. Every action goes through a function that checks the rules.
- Game timers are fixed, so every win has the same reward formula, and the reward has to match it exactly (there is no timer-based scaling any more).
- Each game has a fastest believable time, and a player can't log more than 240 wins an hour.
- Boards reset every Monday (UTC), so cheaters can't stay on top.
- A level can only be won if it is at most one above your best (the first time: up to 500), and nobody can log more than an hour of play in an hour.
- Players with many impossible records are hidden until you review them, and a player reported by 5 different players is hidden too. Rankings, divisions and history exist only on the server; coins and skins are saved on the device and are cosmetic.
- This cannot stop a determined cheater who reads the open-source code, but it makes cheating slow and short-lived.
  To remove a cheater: `update public.players set banned = true where lower(nickname) = lower('TheirName');`

## Keeping the developer nickname (Shadowed)
`shadowed` and `nyxapse` are reserved so nobody else can pretend to be you. The server refuses them, except for an account that already holds that exact name. To claim yours once:
1. Join the leaderboard with any other nickname (for example `ShadowDev`).
2. In the SQL Editor run: `update public.players set nickname = 'Shadowed' where lower(nickname) = lower('ShadowDev');`
3. In the app, change your profile nickname to `Shadowed`. The server accepts it because your account already has it, and it keeps working after a Cloud save restore on a new phone.
