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

## How it stays honest
- Nobody can read or write the tables directly. Every action goes through a function that checks the rules.
- Only wins at the normal timer count, and the reward has to match the game's formula exactly.
- Each game has a fastest believable time, and a player can't log more than 240 wins an hour.
- Boards reset every Monday (UTC), so cheaters can't stay on top.
- This cannot stop a determined cheater who reads the open-source code, but it makes cheating slow and short-lived.
  To remove a cheater: `update public.players set banned = true where lower(nickname) = lower('TheirName');`
