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
 async function deleteMe() { try { const r = await rpc('delete_me', {}); LS.removeItem(SENT); return r; } catch (e) { return {ok: false, error: 'network'}; } }

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

 window.LB = {build: '1.0.0', configured, enabled, join, board, deleteMe, queueSubmit: queue, submitNow};
 document.addEventListener('DOMContentLoaded', () => { if (enabled()) queue(); });   // sends anything that was waiting
})();
