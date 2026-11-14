/* leaderboard.js - optional online leaderboard (Supabase). The game works fully without it. */
(function () {
 const C = window.NX_CONFIG || {}, LS = localStorage, SK = 'bt_lb_session', SENT = 'bt_lb_sent';
 const configured = () => !!(C.supabaseUrl && C.anonKey && /^https?:\/\//.test(C.supabaseUrl));
 const profile = () => { try { return JSON.parse(LS.getItem('bt_profile')); } catch (e) { return null; } };
 const enabled = () => configured() && !!btCfg().leaderboard && !!profile();
 const getS = () => { try { return JSON.parse(LS.getItem(SK)); } catch (e) { return null; } };
 const putS = r => LS.setItem(SK, JSON.stringify({access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600), uid: r.user && r.user.id}));

 async function call(path, body, token) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 9000);
  try {
   const res = await fetch(C.supabaseUrl.replace(/\/+$/, '') + path, {method: 'POST', signal: ctl.signal,
    headers: {'Content-Type': 'application/json', apikey: C.anonKey, Authorization: 'Bearer ' + (token || C.anonKey)}, body: JSON.stringify(body || {})});
   let data = null; try { data = await res.json(); } catch (e) {}
   if (!res.ok) { const err = new Error('http_' + res.status); err.status = res.status; err.data = data; throw err; }
   return data;
  } finally { clearTimeout(t); }
 }

 let pending = null;
 async function session() {
  const s = getS(), now = Math.floor(Date.now() / 1000);
  if (s && s.expires_at - 60 > now) return s;
  if (pending) return pending;
  pending = (async () => {
   try {
    if (s && s.refresh_token) {
     try { putS(await call('/auth/v1/token?grant_type=refresh_token', {refresh_token: s.refresh_token})); return getS(); }
     catch (e) { if (!(e.status >= 400 && e.status < 500)) throw e; }          // a network problem keeps your identity; only a rejected token starts a new one
    }
    putS(await call('/auth/v1/signup', {data: {}, gotrue_meta_security: {}})); return getS();   // anonymous sign-in: no email, no password
   } finally { pending = null; }
  })();
  return pending;
 }
 const rpc = async (fn, args) => { const s = await session(); return call('/rest/v1/rpc/' + fn, args, s.access_token); };

 async function join(nick, avatar) { try { return (await rpc('register_player', {p_nick: nick, p_avatar: avatar})) || {ok: false, error: 'network'}; } catch (e) { return {ok: false, error: 'network'}; } }
 const board = game => rpc('get_board', {p_game: game || 'all'});
 const me = async () => { try { const r = await rpc('get_me', {}); if (r && r.joined) { LS.setItem('bt_lb_tier', String(r.best_tier)); LS.setItem('bt_lb_me', JSON.stringify(r)); if (window.BT && BT.checkAch) BT.checkAch(); } return r; } catch (e) { return null; } };
 const profileOf = nick => rpc('get_profile', {p_nick: nick});
 const report = nick => rpc('report_player', {p_nick: nick});
 // coin rewards from weekly / season results: given once, then confirmed to the server
 async function claim() {
  if (!enabled() || !window.BT || !BT.grant) return;
  try {
   const list = await rpc('get_rewards', {}); if (!Array.isArray(list) || !list.length) return;
   let done; try { done = JSON.parse(LS.getItem('bt_lb_claimed')) || []; } catch (e) { done = []; }
   const ids = [];
   list.forEach(x => { if (!done.includes(x.id)) { BT.grant(x.coins, x.label); done.push(x.id); } ids.push(x.id); });
   LS.setItem('bt_lb_claimed', JSON.stringify(done.slice(-300)));
   await rpc('ack_rewards', {p_ids: ids});
  } catch (e) { /* offline: tried again next time */ }
 }
 // ----- division names and badges (shared by the board and the profiles) -----
 const TIERS = [['Bronze', '🥉', '#cd7f32'], ['Silver', '🥈', '#c0c0c0'], ['Gold', '🥇', '#ffd700'], ['Platinum', '💠', '#7fe5e0'], ['Diamond', '💎', '#6ec6ff'], ['Master', '🔮', '#c77dff'], ['Legend', '🔥', '#ff7a18']];
 const tierOf = d => Math.min(6, Math.floor(d / 3));
 const divName = d => tierOf(d) === 6 ? 'Legend' : TIERS[tierOf(d)][0] + ' ' + (3 - d % 3);
 const sup = n => String(n).replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
 const badge = (t, cnt) => TIERS[t][1] + (cnt >= 2 ? sup(cnt) : '');   // 🥇² = finished 2 seasons in Gold
 async function deleteMe() { try { const r = await rpc('delete_me', {}); LS.removeItem(SENT); LS.removeItem('bt_lb_tier'); LS.removeItem('bt_lb_me'); return r; } catch (e) { return {ok: false, error: 'network'}; } }

 // ----- sending wins: only entries not sent before, a few seconds after a win, quietly retried later -----
 const ledger = () => { try { return JSON.parse(LS.getItem('bt_ledger')) || []; } catch (e) { return []; } };
 let timer = null, busy = false;
 async function submitNow() {
  if (!enabled() || busy) return;
  busy = true;
  try {
   const last = Number(LS.getItem(SENT)) || 0, fresh = ledger().filter(e => e.t === 'win' && e.ts > last).slice(0, 50);
   if (!fresh.length) return;
   const payload = fresh.map(e => ({g: e.g, l: e.l, s: e.s, bp: e.bp, ts: e.ts, h: e.h}));
   let r = await rpc('submit_entries', {p_entries: payload});
   if (r && r.error === 'not_joined') { const p = profile(); if (p && (await join(p.name, p.avatar)).ok) r = await rpc('submit_entries', {p_entries: payload}); }
   if (r && r.ok) { const top = Math.max.apply(null, fresh.map(e => e.ts)); LS.setItem(SENT, String(top)); if (ledger().some(e => e.t === 'win' && e.ts > top)) queue(); }
  } catch (e) { /* offline, paused or busy: it is tried again after the next win */ } finally { busy = false; }
 }
 function queue() { clearTimeout(timer); timer = setTimeout(submitNow, 4000); }

 window.LB = {build: '1.0.0', configured, enabled, join, board, deleteMe, queueSubmit: queue, submitNow, me, profileOf, report, claim, TIERS, tierOf, divName, badge};
 document.addEventListener('DOMContentLoaded', () => { if (enabled()) { queue(); setTimeout(() => { claim(); me(); }, 2500); } });   // sends anything that was waiting
})();
